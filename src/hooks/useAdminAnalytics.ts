import { useState, useEffect, useMemo, useCallback } from 'react';
import { subDays, subMonths, startOfDay, endOfDay, format, startOfWeek, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export type DatePreset = 'today' | '7days' | '30days' | 'custom';
export type ChartGranularity = 'daily' | 'weekly' | 'monthly';

export interface AnalyticsData {
  // Core metrics
  totalOrders: number;
  totalRevenue: number;
  totalProductsSold: number;
  avgOrderValue: number;
  totalDeliveryCharges: number;
  totalGstCollected: number;
  totalCustomers: number;
  totalProducts: number;

  // Chart data
  salesChart: { date: string; revenue: number; orders: number }[];

  // Top products
  topProducts: { name: string; totalOrders: number; totalQty: number; revenue: number }[];

  // State analytics
  stateAnalytics: { state: string; orders: number; revenue: number }[];

  // Delivery analytics
  deliveryAnalytics: {
    totalCharges: number;
    avgCharge: number;
    freeDeliveryOrders: number;
    paidDeliveryOrders: number;
  };

  // Order status
  orderStatusCounts: Record<string, number>;

  // Low stock
  lowStock: { id: string; name: string; stock_quantity: number }[];

  // Recent orders
  recentOrders: any[];

  // Raw filtered orders for export
  filteredOrders: any[];
}

export function useAdminAnalytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('daily');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case '7days':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case '30days':
        return { from: startOfDay(subMonths(now, 1)), to: endOfDay(now) };
      case 'custom':
        if (!customFrom || !customTo) return null;
        return { from: startOfDay(customFrom), to: endOfDay(customTo) };
    }
  }, [datePreset, customFrom, customTo]);

  const loadData = useCallback(async () => {
    if (!dateRange) return;
    setLoading(true);

    try {
      // Fetch all orders within range (with items), plus static data
      const [
        { data: orders },
        { data: orderItems },
        { data: lowStockProducts },
        { count: totalCustomers },
        { count: totalProducts },
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('order_items')
          .select('product_name, quantity, total, order_id')
          .in('order_id', []),  // placeholder — we'll fetch separately
        supabase
          .from('products')
          .select('id, name, stock_quantity')
          .lte('stock_quantity', 5)
          .eq('is_available', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
      ]);

      const filteredOrders = orders || [];
      const orderIds = filteredOrders.map(o => o.id);

      // Fetch order items for these orders (batch)
      let allItems: any[] = [];
      if (orderIds.length > 0) {
        // Supabase IN filter limit workaround: batch if needed
        const batchSize = 100;
        for (let i = 0; i < orderIds.length; i += batchSize) {
          const batch = orderIds.slice(i, i + batchSize);
          const { data: items } = await supabase
            .from('order_items')
            .select('product_name, quantity, total, order_id')
            .in('order_id', batch);
          if (items) allItems = allItems.concat(items);
        }
      }

      // Core metrics
      const totalOrders = filteredOrders.length;
      const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
      const totalProductsSold = allItems.reduce((s, i) => s + Number(i.quantity), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalDeliveryCharges = filteredOrders.reduce((s, o) => s + Number(o.delivery_charge), 0);
      const totalGstCollected = filteredOrders.reduce((s, o) => s + Number(o.gst_amount), 0);

      // Sales chart grouped by granularity
      const chartMap: Record<string, { revenue: number; orders: number }> = {};
      filteredOrders.forEach(o => {
        const d = new Date(o.created_at);
        let key: string;
        if (chartGranularity === 'daily') {
          key = format(d, 'MMM dd');
        } else if (chartGranularity === 'weekly') {
          key = 'W/o ' + format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM dd');
        } else {
          key = format(startOfMonth(d), 'MMM yyyy');
        }
        if (!chartMap[key]) chartMap[key] = { revenue: 0, orders: 0 };
        chartMap[key].revenue += Number(o.total);
        chartMap[key].orders += 1;
      });
      const salesChart = Object.entries(chartMap).map(([date, v]) => ({ date, ...v }));

      // Top products
      const productMap: Record<string, { totalOrders: Set<string>; totalQty: number; revenue: number }> = {};
      allItems.forEach(i => {
        if (!productMap[i.product_name]) productMap[i.product_name] = { totalOrders: new Set(), totalQty: 0, revenue: 0 };
        productMap[i.product_name].totalOrders.add(i.order_id);
        productMap[i.product_name].totalQty += Number(i.quantity);
        productMap[i.product_name].revenue += Number(i.total);
      });
      const topProducts = Object.entries(productMap)
        .map(([name, v]) => ({ name, totalOrders: v.totalOrders.size, totalQty: v.totalQty, revenue: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // State analytics
      const stateMap: Record<string, { orders: number; revenue: number }> = {};
      filteredOrders.forEach(o => {
        const state = o.delivery_state || (o.delivery_address as any)?.state || 'Unknown';
        if (!stateMap[state]) stateMap[state] = { orders: 0, revenue: 0 };
        stateMap[state].orders += 1;
        stateMap[state].revenue += Number(o.total);
      });
      const stateAnalytics = Object.entries(stateMap)
        .map(([state, v]) => ({ state, ...v }))
        .sort((a, b) => b.revenue - a.revenue);

      // Delivery analytics
      const freeDeliveryOrders = filteredOrders.filter(o => Number(o.delivery_charge) === 0).length;
      const paidDeliveryOrders = filteredOrders.filter(o => Number(o.delivery_charge) > 0).length;
      const deliveryAnalytics = {
        totalCharges: totalDeliveryCharges,
        avgCharge: totalOrders > 0 ? totalDeliveryCharges / totalOrders : 0,
        freeDeliveryOrders,
        paidDeliveryOrders,
      };

      // Order status counts
      const orderStatusCounts: Record<string, number> = {};
      filteredOrders.forEach(o => {
        orderStatusCounts[o.status] = (orderStatusCounts[o.status] || 0) + 1;
      });

      setData({
        totalOrders,
        totalRevenue,
        totalProductsSold,
        avgOrderValue,
        totalDeliveryCharges,
        totalGstCollected,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        salesChart,
        topProducts,
        stateAnalytics,
        deliveryAnalytics,
        orderStatusCounts,
        lowStock: lowStockProducts || [],
        recentOrders: filteredOrders.slice(0, 5),
        filteredOrders,
      });
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, chartGranularity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    datePreset,
    setDatePreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    chartGranularity,
    setChartGranularity,
    dateRange,
    refresh: loadData,
  };
}
