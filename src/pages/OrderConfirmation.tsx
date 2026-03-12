import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ShoppingBag, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/formatters';
import { generateInvoicePdf, type InvoiceData, type InvoiceItem } from '@/lib/invoicePdf';
import SEOHead from '@/components/SEOHead';

const getPaymentModeLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    card: 'Card',
    upi: 'UPI',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
    emi: 'EMI',
    bank_transfer: 'Bank Transfer',
  };
  return labels[mode] || mode.charAt(0).toUpperCase() + mode.slice(1);
};

export default function OrderConfirmation() {
  const { id } = useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!id || !user || authLoading) return;

    const fetchOrder = async () => {
      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!orderData || error) {
        setUnauthorized(true);
        return;
      }

      if (orderData.user_id !== user.id && !isAdmin) {
        setUnauthorized(true);
        return;
      }

      setOrder(orderData);

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);
      setItems(itemsData || []);
    };

    fetchOrder();
  }, [id, user, isAdmin, authLoading]);

  const address = order?.delivery_address as any;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (unauthorized) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-lg">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="text-center mb-8">
            <AlertCircle className="h-20 w-20 text-destructive mx-auto mb-6" />
            <h1 className="text-3xl font-display font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">You don't have permission to view this page.</p>
            <Button asChild><Link to="/">Go Home</Link></Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleDownloadInvoice = async () => {
    if (!order) return;
    const addr = order.delivery_address as any;
    const invoiceItems: InvoiceItem[] = items.map(i => ({
      name: i.product_name,
      hsn: i.hsn_code || '',
      quantity: i.quantity,
      price: Number(i.product_price),
      total: Number(i.total),
      gstPercentage: Number(i.gst_percentage || 5),
    }));

    const orderDate = new Date(order.created_at);
    const invoiceData: InvoiceData = {
      invoiceNumber: order.invoice_number || order.order_number,
      orderDate: orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      orderTime: orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      customerName: addr?.full_name || '',
      customerAddress: [
        addr?.flatNumber ? `${addr.flatNumber}, ${addr.address_line1}` : addr?.address_line1,
        addr?.address_line2 ? `${addr.address_line2},` : null,
        `${addr?.city || ''} – ${addr?.pincode || ''},`,
        `${addr?.state || 'Tamil Nadu'}, ${addr?.country || 'India'}.`
      ].filter(Boolean).join('\n'),
      customerPhone: `+91 ${addr?.phone || ''}`,
      customerState: addr?.state || 'Tamil Nadu',
      items: invoiceItems,
      subtotal: Number(order.subtotal),
      deliveryCharge: Number(order.delivery_charge),
      discount: Number(order.discount),
      couponCode: order.coupon_code || undefined,
      grandTotal: Number(order.total),
      paymentMethod: order.payment_mode ? getPaymentModeLabel(order.payment_mode) : (order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'),
      paymentGateway: order.payment_method === 'cod' ? undefined : 'Razorpay',
      paymentStatus: order.payment_status === 'paid' ? 'Paid' : 'Pending',
      paymentId: order.stripe_payment_id || undefined,
    };

    const doc = await generateInvoicePdf(invoiceData);
    doc.save(`Invoice-${invoiceData.invoiceNumber}.pdf`);
  };

  return (
    <div className="container mx-auto px-4 pt-24 pb-16 max-w-lg">
      <SEOHead title="Order Confirmed" description="Your PANDIYIN order has been placed successfully." noindex />
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="text-center mb-8">
          <CheckCircle className="h-20 w-20 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-display font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">Thank you for your order. We'll get it ready for you soon.</p>
        </div>

        {order && (
          <Card className="overflow-hidden mb-6">
            <div className="bg-primary/5 px-6 py-4 text-center border-b">
              <p className="font-display font-bold text-lg">PANDIYIN Nature In Pack</p>
              <p className="text-[10px] text-muted-foreground">802, VPM House, M.Kallupatti, Madurai District - 625535</p>
              <p className="text-[10px] text-muted-foreground">Ph: +91 63837 09933</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Invoice: {order.invoice_number || order.order_number}</span>
                <span>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {address?.full_name && (
                <div className="text-xs">
                  <p className="font-medium">{address.full_name}</p>
                  <p className="text-muted-foreground">
                    {address.flatNumber ? `${address.flatNumber}, ` : ''}{address.address_line1}
                  </p>
                  {address.address_line2 && <p className="text-muted-foreground">{address.address_line2},</p>}
                  <p className="text-muted-foreground">{address.city} - {address.pincode},</p>
                  <p className="text-muted-foreground">{address.state}, {address.country || 'India'}.</p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.product_name} <span className="text-xs">×{item.quantity}</span>
                    </span>
                    <span>{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{Number(order.delivery_charge) === 0 ? 'Free' : formatPrice(order.delivery_charge)}</span></div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>Coupon Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
              </div>

              {Number(order.discount) > 0 && (
                <div className="bg-green-50 border-2 border-green-200 text-green-800 rounded-lg p-2.5 text-center">
                  <span className="font-bold text-xs">🎉 You saved {formatPrice(order.discount)} on this order</span>
                </div>
              )}

              {/* GST inclusive summary */}
              {Number(order.gst_amount) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Including GST in taxes</span>
                  <span>{formatPrice(Number(order.gst_amount))}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Total Payable</span>
                <span className="text-primary">{formatPrice(order.total)}</span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment: {order.payment_mode ? getPaymentModeLabel(order.payment_mode) : (order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online')}</span>
                <span className="capitalize">Status: {order.status}</span>
              </div>

              <div className="text-center pt-2">
                <p className="text-[10px] text-muted-foreground">Thank you for your purchase!</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full gap-2" onClick={handleDownloadInvoice} disabled={!order}>
            <FileText className="h-4 w-4" /> Download Invoice (PDF)
          </Button>
          <div className="flex gap-3">
            <Button asChild className="flex-1"><Link to="/dashboard"><Package className="mr-2 h-4 w-4" /> My Orders</Link></Button>
            <Button asChild variant="outline" className="flex-1"><Link to="/products"><ShoppingBag className="mr-2 h-4 w-4" /> Continue Shopping</Link></Button>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-xs text-muted-foreground mb-3"><strong className="text-foreground">Need help?</strong></p>
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                <a href="/return-refund" className="text-primary hover:underline font-semibold">Return & Refund Policy</a> • <a href="/shipping-policy" className="text-primary hover:underline font-semibold">Shipping Policy</a>
              </p>
              <p className="text-muted-foreground">Email: pandiyinnatureinpack@gmail.com | Phone: +91 63837 09933</p>
              <p className="text-muted-foreground">Review our complete <a href="/terms" className="text-primary hover:underline font-semibold">Terms of Service</a></p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
