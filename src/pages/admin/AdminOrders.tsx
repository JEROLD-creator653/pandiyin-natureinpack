import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Leaf, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/formatters';
import { TableSkeleton } from '@/components/ui/loader';

const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase.from('orders').select('*, order_items(*, products(image_url, name))').order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('status', filter as any);
      if (debouncedSearch && debouncedSearch.trim() !== '') {
        q = q.ilike('order_number', `%${debouncedSearch}%`);
      }
      const { data } = await q;
      // Filter out orders with no items (blank/incomplete orders)
      const validOrders = (data || []).filter(o => o.order_items && o.order_items.length > 0);
      setOrders(validOrders);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status } as any).eq('id', id);
    toast({ title: `Order status updated to ${status}` });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <h2 className="text-xl font-bold font-sans">Orders ({orders.length})</h2>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : orders.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No order found.</div>
          ) : (
            <div className="divide-y">
              {orders.map(o => {
                const items = o.order_items || [];
                const firstItem = items[0];
                const imageUrl = firstItem?.products?.image_url;
                const itemName = firstItem?.products?.name || 'Order';
                const matchesSearch = debouncedSearch && o.order_number?.toLowerCase().includes(debouncedSearch.toLowerCase());
                return (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`p-4 flex items-center gap-4 transition-colors cursor-pointer ${matchesSearch ? 'bg-yellow-50 ring-1 ring-yellow-100' : 'hover:bg-muted/40'}`}
                    onClick={() => navigate(`/admin/orders/${o.order_number}`)}
                  >
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Leaf className="h-6 w-6 text-muted-foreground/30" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{itemName}</span>
                        {items.length > 1 && <span className="text-muted-foreground font-normal text-xs">+{items.length - 1} more</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.order_number}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Select value={o.status} onValueChange={v => updateStatus(o.id, v)}>
                          <SelectTrigger className="w-32 h-7 capitalize" onClick={(event) => event.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map(s => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="font-bold text-sm">{formatPrice(o.total)}</span>
                        {Number(o.discount) > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                            💰 {o.coupon_code || 'Discount'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
