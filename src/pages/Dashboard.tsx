import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ChevronRight, Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatters';
import { Loader } from '@/components/ui/loader';
import SEOHead from '@/components/SEOHead';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    // Wait for auth loading to complete before redirecting
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    // Only fetch orders if user exists
    if (user) {
      supabase
        .from('orders')
        .select('*, order_items(*, products(image_url, name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setOrders(data || []);
          setLoadingOrders(false);
        });
    } else if (!loading) {
      setLoadingOrders(false);
    }
  }, [user, loading]);

  // Show loading state while auth is initializing
  if (loading || loadingOrders) {
    return <Loader text="Loading your data..." className="min-h-[60vh]" delay={200} />;
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-3xl">
      <SEOHead title="My Orders" description="View and track your orders at PANDIYIN." noindex />
      <h1 className="text-3xl font-display font-bold mb-8">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
          <Button asChild><Link to="/products">Start Shopping</Link></Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o, idx) => {
            const items = o.order_items || [];
            const firstItem = items[0];
            const imageUrl = firstItem?.products?.image_url;
            const itemCount = items.length;
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Link to={`/orders/${o.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Leaf className="h-6 w-6 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">
                            {firstItem?.product_name || 'Order'}
                            {itemCount > 1 && <span className="text-muted-foreground font-normal"> +{itemCount - 1} more</span>}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.order_number}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${statusColors[o.status] || ''} text-xs`}>{o.status}</Badge>
                          <span className="font-medium text-sm">{formatPrice(o.total)}</span>
                        </div>
                        {o.tracking_id && o.tracking_id !== '' && (
                          <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                            <Package className="h-3 w-3" /> Tracking: {o.tracking_id}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
