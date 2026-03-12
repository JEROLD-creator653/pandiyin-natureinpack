import { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  BarChart3, Package, ShoppingCart, Users, AlertTriangle, TrendingUp,
  Download, DollarSign, Truck, MapPin, CalendarIcon, RefreshCw, PieChart,
  IndianRupee, PackageCheck, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { formatPrice } from '@/lib/formatters';
import { useAdminAnalytics, type DatePreset } from '@/hooks/useAdminAnalytics';
import AnalyticsExportDialog from '@/components/AnalyticsExportDialog';

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(38, 60%, 50%)',
  confirmed: 'hsl(200, 60%, 50%)',
  processing: 'hsl(260, 50%, 55%)',
  shipped: 'hsl(180, 50%, 40%)',
  delivered: 'hsl(145, 40%, 28%)',
  cancelled: 'hsl(0, 60%, 50%)',
};

const CHART_GREEN = 'hsl(145, 40%, 28%)';
const CHART_AMBER = 'hsl(38, 60%, 50%)';

export default function AdminDashboard() {
  const analytics = useAdminAnalytics();
  const { data, loading, datePreset, setDatePreset, customFrom, setCustomFrom, customTo, setCustomTo, chartGranularity, setChartGranularity, dateRange } = analytics;
  const [exportOpen, setExportOpen] = useState(false);

  const dateLabel = datePreset === 'today' ? 'Today'
    : datePreset === '7days' ? 'Last 7 Days'
    : datePreset === '30days' ? 'Last 30 Days'
    : dateRange ? `${format(dateRange.from, 'MMM dd')} – ${format(dateRange.to, 'MMM dd, yyyy')}` : 'Custom';

  const presets: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7days', label: '7 Days' },
    { key: '30days', label: '30 Days' },
    { key: 'custom', label: 'Custom' },
  ];

  const granularities: { key: typeof chartGranularity; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ];

  // Metric cards
  const metricCards = data ? [
    { label: 'Total Revenue', value: formatPrice(data.totalRevenue), icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Orders', value: data.totalOrders, icon: ShoppingCart, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Products Sold', value: data.totalProductsSold, icon: PackageCheck, color: 'text-chart-3', bg: 'bg-chart-3/10' },
    { label: 'Avg Order Value', value: formatPrice(data.avgOrderValue), icon: TrendingUp, color: 'text-chart-4', bg: 'bg-chart-4/10' },
    { label: 'Delivery Charges', value: formatPrice(data.totalDeliveryCharges), icon: Truck, color: 'text-chart-5', bg: 'bg-chart-5/10' },
    { label: 'GST Collected', value: formatPrice(data.totalGstCollected), icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
  ] : [];

  const pieData = data ? Object.entries(data.orderStatusCounts).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      {/* ── Header: Date Filter + Export ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map(p => (
            <Button
              key={p.key}
              size="sm"
              variant={datePreset === p.key ? 'default' : 'outline'}
              onClick={() => setDatePreset(p.key)}
              className="text-xs h-8"
            >
              {p.label}
            </Button>
          ))}
          {datePreset === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-8 text-xs', !customFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    {customFrom ? format(customFrom, 'MMM dd') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} disabled={d => d > new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-8 text-xs', !customTo && 'text-muted-foreground')}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    {customTo ? format(customTo, 'MMM dd') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} disabled={d => d > new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </>
          )}
          <Button size="sm" variant="outline" className="h-8" onClick={analytics.refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setExportOpen(true)}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* ── FEATURE 1: Sales Analytics Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-20" /></CardContent></Card>
          ))
        ) : (
          metricCards.map((m, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${m.bg} ${m.color} mb-2`}>
                  <m.icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-bold mt-0.5">{m.value}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── FEATURE 2: Sales Graph ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Sales Performance</CardTitle>
            <div className="flex gap-1">
              {granularities.map(g => (
                <Button
                  key={g.key}
                  size="sm"
                  variant={chartGranularity === g.key ? 'default' : 'ghost'}
                  className="text-xs h-7 px-2.5"
                  onClick={() => setChartGranularity(g.key)}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[280px] w-full rounded-lg" />
          ) : data && data.salesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.salesChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  formatter={(value: number, name: string) => [name === 'revenue' ? formatPrice(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                />
                <Bar dataKey="revenue" fill={CHART_GREEN} radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="orders" fill={CHART_AMBER} radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-16">No sales data for this period</p>
          )}
        </CardContent>
      </Card>

      {/* ── ROW 1: Top Selling Products + Delivery Analytics ── */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-stretch">
        {/* ── FEATURE 3: Top Selling Products ── */}
        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-5 w-5" /> Top Selling Products</CardTitle></CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : data && data.topProducts.length > 0 ? (
              <div className="flex flex-col min-h-0 flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pl-1 font-medium w-[50%]">Product</th>
                        <th className="pb-2 font-medium text-center w-[15%]">Orders</th>
                        <th className="pb-2 font-medium text-center w-[15%]">Qty</th>
                        <th className="pb-2 font-medium text-right pr-1 w-[20%]">Revenue</th>
                      </tr>
                    </thead>
                  </table>
                </div>
                <div className="overflow-y-auto overflow-x-auto flex-1 max-h-[280px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <table className="w-full text-sm min-w-[400px]">
                    <tbody>
                      {data.topProducts.map((p, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2.5 pl-1 pr-3 w-[50%]">
                            <span className="inline-flex items-start gap-2">
                              <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
                              <span className="leading-snug break-words">{p.name}</span>
                            </span>
                          </td>
                          <td className="py-2.5 text-center w-[15%]">{p.totalOrders}</td>
                          <td className="py-2.5 text-center w-[15%]">{p.totalQty}</td>
                          <td className="py-2.5 text-right pr-1 font-medium w-[20%]">{formatPrice(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No product sales data</p>
            )}
          </CardContent>
        </Card>

        {/* ── FEATURE 5: Delivery Analytics ── */}
        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-5 w-5" /> Delivery Analytics</CardTitle></CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : data ? (
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Total Charges', value: formatPrice(data.deliveryAnalytics.totalCharges), color: 'bg-primary/10 text-primary' },
                  { label: 'Avg Per Order', value: formatPrice(data.deliveryAnalytics.avgCharge), color: 'bg-accent/10 text-accent' },
                  { label: 'Free Delivery', value: `${data.deliveryAnalytics.freeDeliveryOrders} orders`, color: 'bg-chart-3/10 text-chart-3' },
                  { label: 'Paid Delivery', value: `${data.deliveryAnalytics.paidDeliveryOrders} orders`, color: 'bg-chart-4/10 text-chart-4' },
                ].map((d, i) => (
                  <div key={i} className="rounded-lg border p-3.5">
                    <p className="text-xs text-muted-foreground">{d.label}</p>
                    <p className="text-lg font-bold mt-1">{d.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 2: Orders by State + Order Status Breakdown ── */}
      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        {/* ── FEATURE 4: State Analytics ── */}
        <Card className="flex flex-col border-border/50 shadow-none bg-card/80">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-muted-foreground font-medium"><MapPin className="h-4 w-4" /> Orders by State</CardTitle></CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="space-y-3 w-full">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : data && data.stateAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.stateAnalytics.slice(0, 8)} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                  <XAxis type="number" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="state" fontSize={11} width={100} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    formatter={(v: number, name: string) => [name === 'revenue' ? formatPrice(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']}
                  />
                  <Bar dataKey="revenue" fill={CHART_GREEN} radius={[0, 4, 4, 0]} name="revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No state data</p>
            )}
          </CardContent>
        </Card>

        {/* ── FEATURE 6: Order Status Breakdown ── */}
        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieChart className="h-5 w-5" /> Order Status Breakdown</CardTitle></CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            {loading ? (
              <Skeleton className="h-[250px] w-full rounded-lg" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || 'hsl(var(--muted))'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Orders']} />
                  <Legend
                    formatter={(value: string) => <span className="text-xs capitalize">{value}</span>}
                  />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No order data</p>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Export Dialog */}
      <AnalyticsExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        filteredOrders={data?.filteredOrders || []}
        topProducts={data?.topProducts || []}
        stateAnalytics={data?.stateAnalytics || []}
        dateLabel={dateLabel}
      />
    </div>
  );
}
