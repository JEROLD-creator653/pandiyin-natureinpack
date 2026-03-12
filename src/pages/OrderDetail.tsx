import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock, Settings, Leaf, MapPin, Download, CreditCard, IndianRupee, Shield, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';
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

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: Package },
  { key: 'processing', label: 'Processing', icon: Settings },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const statusIndex: Record<string, number> = {
  pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4, cancelled: -1,
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase.from('orders').select('*').eq('id', id).maybeSingle().then(({ data }) => setOrder(data));
    supabase.from('order_items').select('*, products(image_url)').eq('order_id', id).then(({ data }) => setItems(data || []));
  }, [id]);

  if (!order) return (
    <div className="container mx-auto px-4 pt-24 pb-16 text-center">
      <p className="text-muted-foreground">Loading order...</p>
    </div>
  );

  const currentStep = statusIndex[order.status] ?? -1;
  const isCancelled = order.status === 'cancelled';
  const address = order.delivery_address as any;

  const handleDownloadInvoice = async () => {
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
        `${addr?.state || 'Tamil Nadu'}, ${addr?.country || 'India'}.`,
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
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-3xl">
      <SEOHead title={`Order ${order.order_number}`} description="View details for your PANDIYIN order." noindex />
      <Button variant="ghost" size="sm" asChild className="mb-4 gap-1">
        <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Orders</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Order {order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Order Status</CardTitle></CardHeader>
          <CardContent>
            {isCancelled ? (
              <div className="flex items-center gap-3 text-destructive">
                <XCircle className="h-8 w-8" />
                <div>
                  <p className="font-semibold">Order Cancelled</p>
                  <p className="text-sm text-muted-foreground">This order has been cancelled.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted z-0" />
                <div className="absolute top-5 left-5 h-0.5 bg-primary z-0 transition-all duration-500" style={{ width: `calc(${(currentStep / (statusSteps.length - 1)) * 100}% - 40px)` }} />
                {statusSteps.map((step, i) => {
                  const Icon = step.icon;
                  const isCompleted = i <= currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div key={step.key} className="flex flex-col items-center z-10 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[10px] mt-2 text-center max-w-[60px] ${isCompleted ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Tracking Info */}
        {(order as any).tracking_id && (order as any).tracking_id !== '' && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Truck className="h-4 w-4" /> Shipment Tracking</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(order as any).courier_name && (order as any).courier_name !== '' && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Courier: </span>
                  <span className="font-medium">{(order as any).courier_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tracking ID:</span>
                <code className="bg-background border rounded px-2.5 py-1 font-mono text-sm font-semibold">{(order as any).tracking_id}</code>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7"
                  onClick={() => {
                    navigator.clipboard.writeText((order as any).tracking_id);
                    toast({ title: 'Tracking ID copied to clipboard' });
                  }}
                >
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your order has been shipped. Use the tracking ID on the courier provider's tracking website to track your shipment.
              </p>
            </CardContent>
          </Card>
        )}
        {!isCancelled && (!(order as any).tracking_id || (order as any).tracking_id === '') && currentStep >= 1 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Tracking ID: <span className="font-medium text-foreground">Not Available Yet</span></span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Items ({items.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => item.product_id && navigate(`/products/${item.product_id}`)}
                className={`flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors duration-200 ${item.product_id ? 'cursor-pointer hover:bg-secondary/40 group' : ''}`}
              >
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.products?.image_url ? (
                    <img src={item.products.image_url} alt={item.product_name} className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <Leaf className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate transition-colors ${item.product_id ? 'group-hover:text-primary group-hover:underline' : ''}`}>{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.product_price)}</p>
                </div>
                <span className="font-medium text-sm">{formatPrice(item.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Payment Method</p>
                <p className="font-medium">{order.payment_mode ? getPaymentModeLabel(order.payment_mode) : (order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Payment Status</p>
                <Badge className={`text-xs ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : order.payment_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {order.payment_status === 'paid' ? '✓ Paid' : order.payment_status === 'failed' ? '✗ Failed' : '⏳ Pending'}
                </Badge>
              </div>
              {order.stripe_payment_id && (
                <div className="space-y-1 col-span-2">
                  <p className="text-muted-foreground text-xs">Transaction ID</p>
                  <p className="font-mono text-xs bg-muted px-2 py-1.5 rounded break-all">{order.stripe_payment_id}</p>
                </div>
              )}
              {order.payment_method !== 'cod' && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Payment Gateway</p>
                  <p className="font-medium flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> Razorpay</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Amount Paid</p>
                <p className="font-semibold text-primary flex items-center gap-1"><IndianRupee className="h-3 w-3" />{formatPrice(order.total).replace('Rs.', '').trim()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary + Address */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{order.delivery_charge == 0 ? 'Free' : formatPrice(order.delivery_charge)}</span></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Coupon Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-2 text-center -mx-1">
                  <span className="font-bold text-xs">🎉 Saved {formatPrice(order.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base"><span className="font-bold">Total</span><span className="font-medium text-primary">{formatPrice(order.total)}</span></div>
              <Separator className="my-2" />
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleDownloadInvoice}>
                <Download className="h-3.5 w-3.5" /> Download Invoice (PDF)
              </Button>
            </CardContent>
          </Card>

          {address && address.full_name && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-4 w-4" /> Delivery Address</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{address.full_name}</p>
                <p className="text-muted-foreground">
                  {address.flatNumber ? `${address.flatNumber}, ` : ''}{address.address_line1}
                </p>
                {address.address_line2 && <p className="text-muted-foreground">{address.address_line2},</p>}
                <p className="text-muted-foreground">{address.city} - {address.pincode},</p>
                <p className="text-muted-foreground">{address.state}, {address.country || 'India'}.</p>
                <p className="text-muted-foreground">+91 {address.phone}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
}
