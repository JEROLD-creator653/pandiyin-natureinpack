import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Package, ShoppingCart, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatters';

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  image_url: string | null;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export default function AdminAlerts() {
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [stockRes, ordersRes] = await Promise.all([
      supabase.from('products').select('id, name, stock_quantity, image_url').lte('stock_quantity', 10).order('stock_quantity', { ascending: true }).limit(20),
      supabase.from('orders').select('id, order_number, total, status, created_at').order('created_at', { ascending: false }).limit(25),
    ]);
    setLowStock(stockRes.data || []);
    setRecentOrders(ordersRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Alerts & Recent Activity</h2>
          <p className="text-sm text-muted-foreground">Low stock alerts and latest orders</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={fetchData}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" /> Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : lowStock.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All products are well stocked.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStock.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="truncate max-w-[180px]">{p.name}</span>
                    <Badge variant={p.stock_quantity === 0 ? 'destructive' : 'secondary'}>
                      {p.stock_quantity} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent orders.</p>
            ) : (
              <div className="space-y-1">
                {recentOrders.map(o => (
                  <Link
                    key={o.id}
                    to="/admin/orders"
                    className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/40 transition-colors rounded-md px-2 -mx-2"
                  >
                    <div>
                      <p className="text-sm font-mono">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatPrice(o.total)}</p>
                      <Badge variant="secondary" className="capitalize text-xs">{o.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
