import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, FileText, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/formatters';
import { Loader } from '@/components/ui/loader';
import { generateInvoicePdf } from '@/lib/invoicePdf';

const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminOrderDetail() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [courierName, setCourierName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', orderNumber)
        .maybeSingle();
      if (data) {
        setOrder(data);
        setOrderItems(data.order_items || []);
        setNewStatus(data.status);
        setTrackingId((data as any).tracking_id || '');
        setCourierName((data as any).courier_name || '');
      }
      setLoading(false);
    };
    load();
  }, [orderNumber]);

  const updateStatus = async (status: string) => {
    if (!order) return;
    await supabase.from('orders').update({ status } as any).eq('id', order.id);
    toast({ title: `Order status updated to ${status}` });
    setOrder((prev: any) => ({ ...prev, status }));
    setNewStatus(status);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const saveTracking = async () => {
    if (!order) return;
    await supabase.from('orders').update({ tracking_id: trackingId, courier_name: courierName } as any).eq('id', order.id);
    setOrder((prev: any) => ({ ...prev, tracking_id: trackingId, courier_name: courierName }));
    toast({ title: 'Tracking ID saved successfully' });
  };

  const clearTracking = async () => {
    if (!order) return;
    await supabase.from('orders').update({ tracking_id: '', courier_name: '' } as any).eq('id', order.id);
    setTrackingId('');
    setCourierName('');
    setOrder((prev: any) => ({ ...prev, tracking_id: '', courier_name: '' }));
    toast({ title: 'Tracking ID removed' });
  };

  const copyOrderDetails = () => {
    if (!order) return;
    const addr = order.delivery_address as any;

    const lines: string[] = [];
    lines.push(`Order ID: ${order.order_number}`);
    lines.push('');

    if (addr) {
      lines.push('Delivery Address:');
      lines.push(addr.full_name || '');
      if (addr.phone) lines.push(`Phone: ${addr.phone}`);
      lines.push(addr.flatNumber ? `${addr.flatNumber}, ${addr.address_line1}` : addr.address_line1 || '');
      if (addr.address_line2) lines.push(`${addr.address_line2},`);
      lines.push(`${addr.city} – ${addr.pincode},`);
      lines.push(`${addr.state}, ${addr.country || 'India'}.`);
      lines.push('');
    }

    lines.push('Order Items:');
    orderItems.forEach(i => {
      lines.push(`• ${i.product_name} × ${i.quantity} — ${formatPrice(i.total)}`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'Order details copied to clipboard' });
  };

  const handleGenerateInvoice = async () => {
    if (!order) return;
    try {
      const addr = order.delivery_address as any;
      const orderDate = new Date(order.created_at);
      const invoiceData = {
        invoiceNumber: order.invoice_number || order.order_number,
        orderDate: orderDate.toLocaleDateString('en-IN'),
        orderTime: orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        customerName: addr?.full_name || 'Customer',
        customerAddress: addr ? [
          addr.flatNumber ? `${addr.flatNumber}, ${addr.address_line1}` : addr.address_line1,
          addr.address_line2 ? `${addr.address_line2},` : null,
          `${addr.city} – ${addr.pincode},`,
          `${addr.state}, ${addr.country || 'India'}.`,
        ].filter(Boolean).join('\n') : '',
        customerPhone: addr?.phone || '',
        customerState: addr?.state || 'Tamil Nadu',
        items: orderItems.map(i => ({
          name: i.product_name,
          hsn: i.hsn_code || '',
          quantity: i.quantity,
          price: i.product_price,
          total: i.total,
          gstPercentage: i.product_gst_percentage || 5,
        })),
        subtotal: order.subtotal,
        deliveryCharge: order.delivery_charge,
        discount: order.discount,
        couponCode: order.coupon_code || undefined,
        grandTotal: order.total,
        paymentMethod: order.payment_mode || order.payment_method || '',
        paymentGateway: 'Razorpay',
        paymentStatus: order.payment_status,
        paymentId: order.stripe_payment_id || '',
      };
      const doc = await generateInvoicePdf(invoiceData);
      doc.save(`Invoice_${order.order_number}.pdf`);
      toast({ title: 'Invoice generated' });
    } catch {
      toast({ title: 'Failed to generate invoice', variant: 'destructive' });
    }
  };

  if (loading) {
    return <Loader text="Loading order..." className="min-h-[40vh]" />;
  }

  if (!order) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="outline" onClick={() => navigate('/admin/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const addr = order.delivery_address as any;
  const orderDate = new Date(order.created_at);
  const paymentMethod = order.payment_mode || order.payment_method || '';
  const paymentMethodLabel =
    paymentMethod === 'upi' ? 'UPI' :
    paymentMethod === 'card' ? 'Card' :
    paymentMethod === 'netbanking' ? 'Net Banking' :
    paymentMethod === 'cod' ? 'Cash on Delivery' :
    paymentMethod.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-0">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')} className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Button>

      <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
        {/* SECTION 1 — ORDER HEADER */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">Order Receipt</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold font-mono text-foreground">{order.order_number}</span>
                <button onClick={() => copyToClipboard(order.order_number, 'Order ID')} className="text-muted-foreground hover:text-foreground transition-colors"><Copy className="h-3.5 w-3.5" /></button>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">{orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="text-foreground">{orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge className={`${statusColors[order.status]} capitalize text-xs px-2.5 py-0.5`}>{order.status}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* SECTION 2 — PAYMENT INFORMATION */}
        <div className="px-6 py-4">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">Payment Information</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gateway</span>
              <span className="text-foreground">Razorpay</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="text-foreground">{paymentMethodLabel}</span>
            </div>
            {order.stripe_payment_id && order.stripe_payment_id !== '' && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-foreground">{order.stripe_payment_id}</span>
                  <button onClick={() => copyToClipboard(order.stripe_payment_id, 'Payment ID')} className="text-muted-foreground hover:text-foreground transition-colors"><Copy className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment Status</span>
              <Badge variant="outline" className={`capitalize text-xs px-2.5 py-0.5 ${order.payment_status === 'paid' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>{order.payment_status}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* SECTION 3 — DELIVERY ADDRESS */}
        {addr && (
          <>
            <div className="px-6 py-4">
              <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">Delivery Address</p>
              <div className="bg-muted/50 rounded-lg p-3.5 text-sm space-y-0.5">
                <p className="font-semibold text-foreground">{addr.full_name}</p>
                {addr.phone && <p className="text-muted-foreground">Phone: {addr.phone}</p>}
                <p className="text-foreground">
                  {addr.flatNumber ? `${addr.flatNumber}, ` : ''}{addr.address_line1}
                </p>
                {addr.address_line2 && <p className="text-foreground">{addr.address_line2},</p>}
                <p className="text-foreground">{addr.city} – {addr.pincode},</p>
                <p className="text-foreground">{addr.state}, {addr.country || 'India'}.</p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Customer Notes */}
        {order.notes && order.notes !== '' && (
          <>
            <div className="px-6 py-4">
              <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">Customer Notes</p>
              <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3.5 whitespace-pre-wrap">{order.notes}</p>
            </div>
            <Separator />
          </>
        )}

        {/* SECTION 4 — ORDER ITEMS */}
        <div className="px-6 py-4">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">Order Items</p>
          <div className="text-sm">
            <div className="grid grid-cols-12 gap-2 pb-2 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="col-span-6">Product</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            {orderItems.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 py-2.5 border-b border-dashed last:border-0 items-center">
                <span className="col-span-6 font-medium text-foreground truncate">{item.product_name}</span>
                <span className="col-span-2 text-center text-muted-foreground">{item.quantity}</span>
                <span className="col-span-2 text-right text-muted-foreground">{formatPrice(item.product_price)}</span>
                <span className="col-span-2 text-right font-medium text-foreground">{formatPrice(item.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* SECTION 5 — ORDER SUMMARY */}
        <div className="px-6 py-4">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">Order Summary</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="text-foreground">{Number(order.delivery_charge) === 0 ? 'Free' : formatPrice(order.delivery_charge)}</span>
            </div>
            {Number(order.gst_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span className="text-foreground">{formatPrice(order.gst_amount)}</span>
              </div>
            )}
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                <span className="text-emerald-600 font-medium">-{formatPrice(order.discount)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="font-bold text-foreground text-base">Grand Total</span>
              <span className="font-bold text-foreground text-base">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* SECTION 6 — ORDER STATUS CONTROL */}
        <div className="px-6 py-4">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">Update Order Status</p>
          <div className="flex items-center gap-3">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="flex-1 h-9 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={newStatus === order.status}
              onClick={() => updateStatus(newStatus)}
            >
              Save Status
            </Button>
          </div>
        </div>

        <Separator />

        {/* SECTION 7 — COURIER TRACKING */}
        <div className="px-6 py-4">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">Courier Tracking</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Courier Name</label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. India Post, DTDC, Delhivery"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Courier Tracking ID</label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. TRK89374652"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={trackingId === (order.tracking_id || '') && courierName === (order.courier_name || '')}
                onClick={saveTracking}
              >
                Save Tracking ID
              </Button>
              {order.tracking_id && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearTracking}
                >
                  Remove Tracking
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* SECTION 8 — ADMIN ACTIONS */}
        <div className="px-6 py-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateInvoice} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Generate Invoice
          </Button>
          <Button variant="outline" size="sm" onClick={copyOrderDetails} className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Copy Details
          </Button>
        </div>
      </div>
    </div>
  );
}
