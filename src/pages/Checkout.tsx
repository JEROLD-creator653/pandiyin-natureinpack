import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, MapPin, ShieldCheck, Truck, Award, X, Package, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import ErrorModal from '@/components/ErrorModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useShippingRegions } from '@/hooks/useShippingRegions';
import AddressManager, { Address } from '@/components/AddressManager';
import { formatPrice } from '@/lib/formatters';
import { ButtonLoader, Loader } from '@/components/ui/loader';
import { STATE_ZONES, getChargedWeight, calculateDeliveryCharge, type ShippingZoneConfig } from '@/lib/deliveryCalculations';
import { generateInvoiceNumber } from '@/lib/invoicePdf';
import SEOHead from '@/components/SEOHead';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Razorpay key is fetched from the server — never hardcode secrets or keys in frontend

const getGSTType = (state: string): 'cgst_sgst' | 'igst' => {
  const sameStateStates = ['Tamil Nadu', 'Puducherry'];
  return sameStateStates.includes(state) ? 'cgst_sgst' : 'igst';
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, total, clearCart, refetch } = useCart();
  const { regions, getDeliveryCharge, getZoneConfig } = useShippingRegions();
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('razorpay');
  const MAX_NOTES_LENGTH = 500;
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [couponOpen, setCouponOpen] = useState(false);
  const [gstSettings, setGstSettings] = useState({ gst_enabled: false });
  const [calculatedGstAmount, setCalculatedGstAmount] = useState(0);

  // Derive delivery state from selected address pincode/state
  const deliveryState = selectedAddress?.state || '';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user && items.length === 0) {
      navigate('/cart');
      return;
    }
    supabase.from('store_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setGstSettings({ gst_enabled: (data as any).gst_enabled || false });
      }
    });
  }, [user, items.length, authLoading]);

  useEffect(() => {
    if (items.length === 0) return;
    let totalGst = 0;
    items.forEach(item => {
      const p = item.product as any;
      const itemGstPercentage = p?.gst_percentage || 5;
      const itemBasePrice = p?.tax_inclusive !== false
        ? item.product.price * 100 / (100 + itemGstPercentage)
        : item.product.price;
      const itemGstAmount = (itemBasePrice * itemGstPercentage / 100) * item.quantity;
      totalGst += itemGstAmount;
    });
    setCalculatedGstAmount(totalGst);
  }, [items]);

  // Weight-based delivery calculation
  const totalWeightKg = useMemo(() => {
    return items.reduce((sum, item) => {
      const wkg = Number((item.product as any).weight_kg) || 0;
      return sum + wkg * item.quantity;
    }, 0);
  }, [items]);

  const chargedWeight = useMemo(() => getChargedWeight(totalWeightKg), [totalWeightKg]);

  const zoneConfig = useMemo(() => getZoneConfig(), [getZoneConfig]);

  const deliveryCharge = useMemo(() => {
    if (!deliveryState) return null;
    return calculateDeliveryCharge(deliveryState, totalWeightKg, total, zoneConfig);
  }, [deliveryState, totalWeightKg, total, zoneConfig]);

  const effectiveDeliveryCharge = deliveryCharge ?? 0;

  // Free delivery nudge for all zones
  const freeDeliveryNudge = useMemo(() => {
    if (!deliveryState) return null;
    const zone = STATE_ZONES[deliveryState];
    if (!zone) return null;
    const config = zoneConfig[zone as keyof ShippingZoneConfig];
    if (!config) return null;
    const threshold = config.freeAbove;
    if (!threshold || total >= threshold) return null;
    const remaining = threshold - total;
    const progress = (total / threshold) * 100;
    return { remaining, progress, threshold };
  }, [deliveryState, total, zoneConfig]);

  const gstAmount = gstSettings.gst_enabled ? calculatedGstAmount : 0;
  const grandTotal = total - discount + effectiveDeliveryCharge;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!user) {
      setCheckoutError('Please login to apply coupon');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('validate_coupon' as any, {
        _coupon_code: couponCode.trim().toUpperCase(),
        _user_id: user.id,
        _order_total: total,
      });
      if (error) throw error;
      const validation = data?.[0];
      if (!validation || !validation.is_valid) {
        setCheckoutError(validation?.error_message || 'Invalid coupon. Could not apply coupon.');
        return;
      }
      const disc = validation.discount_type === 'percentage'
        ? (total * Number(validation.discount_value)) / 100
        : Number(validation.discount_value);
      setDiscount(disc);
      toast({ title: `Coupon applied! You save ${formatPrice(disc)}` });
    } catch (err: any) {
      console.error('Coupon validation error:', err);
      setCheckoutError('Failed to validate coupon. Please try again.');
    }
  };

  if (authLoading) {
    return <Loader text="Preparing secure checkout..." className="min-h-[60vh]" delay={200} />;
  }
  if (!user) return null;

  const createOrder = async () => {
    const totalMRP = items.reduce((a, i) => a + ((i.product as any).compare_price || i.product.price) * i.quantity, 0);
    const sellingTotal = items.reduce((a, i) => a + i.product.price * i.quantity, 0);
    const gstType = getGSTType(deliveryState || selectedAddress?.state || '');
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    if (gstType === 'cgst_sgst') {
      cgstAmount = gstAmount / 2;
      sgstAmount = gstAmount / 2;
    } else {
      igstAmount = gstAmount;
    }
    const avgGstPercentage = total > 0 ? (gstAmount / total) * 100 : 0;

    const invoiceNumber = generateInvoiceNumber();

    const { data: order, error } = await supabase.from('orders').insert({
      user_id: user!.id,
      order_number: 'temp',
      subtotal: sellingTotal,
      delivery_charge: effectiveDeliveryCharge,
      discount: discount,
      total: grandTotal,
      gst_amount: gstAmount,
      gst_percentage: avgGstPercentage,
      gst_type: gstType,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      delivery_state: deliveryState || selectedAddress?.state || '',
      coupon_code: couponCode || null,
      payment_method: paymentMethod === 'razorpay' ? 'stripe' as any : 'cod' as any,
      payment_status: 'pending' as any,
      delivery_address: selectedAddress as any,
      notes: notes || null,
      invoice_number: invoiceNumber,
      invoice_generated: true,
    }).select().single();
    if (error) throw error;

    const orderItems = items.map(item => {
      const p = item.product as any;
      const itemGstPercentage = p?.gst_percentage || 5;
      const itemBasePrice = p?.tax_inclusive !== false
        ? item.product.price * 100 / (100 + itemGstPercentage)
        : item.product.price;
      const itemGstAmount = (itemBasePrice * itemGstPercentage / 100) * item.quantity;
      return {
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        total: item.product.price * item.quantity,
        gst_percentage: itemGstPercentage,
        hsn_code: p?.hsn_code || '',
        gst_amount: itemGstAmount,
        tax_inclusive: p?.tax_inclusive ?? true,
        product_base_price: itemBasePrice,
      };
    });
    await supabase.from('order_items').insert(orderItems);

    if (couponCode && discount > 0) {
      const { data: redeemed, error: redeemError } = await supabase.rpc('redeem_coupon_atomic' as any, {
        _coupon_code: couponCode.trim().toUpperCase(),
        _user_id: user!.id,
        _order_id: order.id,
      });
      if (redeemError || redeemed === false) {
        // Coupon could not be redeemed (race condition / expired) — remove discount from order
        await supabase.from('orders').update({ discount: 0, total: grandTotal + discount, coupon_code: null }).eq('id', order.id);
        console.warn('Coupon redemption failed, discount removed from order');
      }
    }

    return order;
  };

  const handleRazorpayPayment = async () => {
    setCheckoutError(null);
    if (!window.Razorpay) {
      setCheckoutError('Payment gateway not loaded. Please refresh the page and try again.');
      setLoading(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            cart_items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
            delivery_state: selectedAddress?.state || '',
            coupon_code: couponCode,
            currency: 'INR',
            receipt: `order_${Date.now()}`,
          }),
        }
      );

      const razorpayOrder = await res.json();
      if (!res.ok) throw new Error(razorpayOrder.error || 'Failed to create payment order');

      // Get the public key from server response — never hardcode it
      const razorpayKeyId = razorpayOrder.key_id;
      if (!razorpayKeyId) throw new Error('Payment gateway configuration error');

      const order = await createOrder();

      const options = {
        key: razorpayKeyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'PANDIYIN Nature In Pack',
        description: `Order #${order.order_number}`,
        order_id: razorpayOrder.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-verify`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  order_id: order.id,
                }),
              }
            );
            const verifyData = await verifyRes.json();
            if (verifyData.verified) {
              clearCart();
              navigate(`/order-confirmation/${order.id}`);
            } else {
              setCheckoutError('Payment verification failed. Please contact support.');
            }
          } catch (err: any) {
            setCheckoutError(err.message || 'Verification error. Please try again.');
          }
        },
        prefill: {
          name: selectedAddress?.full_name || '',
          contact: selectedAddress?.phone || '',
        },
        theme: { color: '#16a34a' },
        modal: {
          ondismiss: () => {
            supabase.from('orders').update({ payment_status: 'failed' }).eq('id', order.id);
            setCheckoutError('Payment cancelled. Your order has been saved. You can retry payment.');
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        supabase.from('orders').update({ payment_status: 'failed' }).eq('id', order.id);
        setCheckoutError(response.error?.description || 'Payment failed. Please try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Payment error:', err);
      setCheckoutError(err.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const placeOrder = async () => {
    setCheckoutError(null);
    if (!selectedAddress || !selectedAddress.full_name || !selectedAddress.phone || !selectedAddress.address_line1 || !selectedAddress.pincode) {
      setCheckoutError('Please select or add a delivery address');
      return;
    }
    if (!selectedAddress.state) {
      setCheckoutError('Address missing state info. Please update your address with a valid pincode.');
      return;
    }
    if (!agreementChecked) {
      setCheckoutError('Please agree to our Terms of Service, Return Policy and Shipping Policy to proceed.');
      return;
    }

    setLoading(true);

    // Backend verification: validate prices, stock, and delivery charge server-side
    try {
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-order', {
        body: {
          cart_items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
          delivery_state: selectedAddress.state,
          coupon_code: couponCode,
        },
      });

      if (verifyError) throw verifyError;

      if (!verifyResult?.valid) {
        const errMsgs = verifyResult?.errors?.join(', ') || 'Validation failed';
        setCheckoutError(errMsgs);
        setLoading(false);
        refetch();
        return;
      }

      // Check if frontend totals match backend
      const backendTotal = verifyResult.grand_total;
      if (Math.abs(backendTotal - grandTotal) > 1) {
        setCheckoutError('Prices or delivery charges have changed. Your cart has been refreshed with the latest data. Please review before proceeding.');
        setLoading(false);
        refetch();
        return;
      }
    } catch (err: any) {
      console.error('Order verification error:', err);
      setCheckoutError('Unable to verify your order. Please try again.');
      setLoading(false);
      return;
    }

    if (paymentMethod === 'razorpay') {
      await handleRazorpayPayment();
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder();
      clearCart();
      navigate(`/order-confirmation/${order.id}`);
    } catch (err: any) {
      setCheckoutError(err.message || 'Order failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCartEmpty = items.length === 0;

  return (
    <div className="container mx-auto px-4 pt-20 md:pt-24 pb-8 max-w-4xl">
      <SEOHead title="Checkout" description="Complete your purchase securely at PANDIYIN." noindex />
      <h1 className="text-2xl md:text-3xl font-display font-bold mb-6 md:mb-8">Checkout</h1>

      <ErrorModal
        open={!!checkoutError}
        onClose={() => setCheckoutError(null)}
        message={checkoutError || ''}
      />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-5 gap-6 md:gap-8">
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Delivery Address</CardTitle></CardHeader>
            <CardContent>
              <AddressManager
                selectable
                selectedId={selectedAddressId}
                onSelect={(addr) => {
                  setSelectedAddress(addr);
                  setSelectedAddressId(addr.id || null);
                }}
              />
            </CardContent>
          </Card>

          {/* Free Delivery Nudge */}
          {freeDeliveryNudge && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-primary">
                🚚 Add {formatPrice(freeDeliveryNudge.remaining)} more for FREE delivery!
              </p>
              <Progress value={freeDeliveryNudge.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Free delivery on orders above {formatPrice(freeDeliveryNudge.threshold!)}
              </p>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="text-lg">Payment Method</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <label
                  htmlFor="razorpay"
                  className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                    paymentMethod === 'razorpay'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <RadioGroupItem value="razorpay" id="razorpay" />
                  <CreditCard className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Pay Online</p>
                    <p className="text-xs text-muted-foreground mt-0.5">UPI · Debit/Credit Cards · Net Banking · Wallets</p>
                  </div>
                </label>
              </RadioGroup>

              <div className="flex items-center justify-center gap-2 pt-3 border-t border-border/40">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Secure payments powered by</span>
                <img src="/razorpay-payment.svg" alt="Razorpay" className="h-6" style={{ imageRendering: 'auto' }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Order Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Any special instructions..." value={notes} onChange={e => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))} maxLength={MAX_NOTES_LENGTH} />
              <p className="text-xs text-muted-foreground mt-1">{notes.length}/{MAX_NOTES_LENGTH}</p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="p-6 sticky top-20">
            <h3 className="font-display font-bold text-lg mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-muted-foreground truncate max-w-[60%]">{item.product.name} ×{item.quantity}</span>
                  <span>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="mb-4" />

            {(() => {
              const totalMRP = items.reduce((a, i) => {
                const comparePrice = (i.product as any).compare_price;
                return a + (comparePrice && comparePrice > i.product.price ? comparePrice : i.product.price) * i.quantity;
              }, 0);
              const sellingTotal = items.reduce((a, i) => a + i.product.price * i.quantity, 0);
              const discountAmount = totalMRP - sellingTotal;
              const hasDiscount = discountAmount > 0;

              return (
                <div className="space-y-2 text-sm mb-4">
                  {hasDiscount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MRP Total</span>
                      <span className="font-medium">{formatPrice(totalMRP)}</span>
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Discount</span>
                      <span>− {formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal</span>
                    <span>{formatPrice(sellingTotal)}</span>
                  </div>


                  {/* Delivery charge */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>
                      {deliveryCharge === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : deliveryCharge === 0 ? (
                        <span className="text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full text-xs">FREE</span>
                      ) : (
                        formatPrice(deliveryCharge)
                      )}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-green-700 font-semibold">
                      <span>Coupon Discount {couponCode && `(${couponCode})`}</span>
                      <span>− {formatPrice(discount)}</span>
                    </div>
                  )}
                  {(hasDiscount || discount > 0) && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2 text-center">
                      <span className="font-bold text-base text-primary">
                        🎉 You saved {formatPrice(discountAmount + discount)} on this order
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {gstSettings.gst_enabled && gstAmount > 0 && (
              <div className="mb-3 pt-2 text-xs">
                <p className="text-muted-foreground">Included Taxes: {formatPrice(gstAmount)}</p>
              </div>
            )}

            <Separator className="my-3" />
            <div className="flex justify-between text-lg font-bold mt-3">
              <span>Total Payable</span>
              <span className="text-primary">{formatPrice(grandTotal)}</span>
            </div>

            {selectedAddress && selectedAddress.full_name && (
              <div className="border-t mt-4 pt-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold">Deliver to {selectedAddress.full_name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedAddress.flatNumber ? `${selectedAddress.flatNumber}, ` : ''}{selectedAddress.address_line1}
                </p>
                {selectedAddress.address_line2 && <p className="text-xs text-muted-foreground">{selectedAddress.address_line2},</p>}
                <p className="text-xs text-muted-foreground">{selectedAddress.city} - {selectedAddress.pincode},</p>
                <p className="text-xs text-muted-foreground">{selectedAddress.state}, {selectedAddress.country || 'India'}.</p>
                <p className="text-xs text-muted-foreground mt-1">+91 {selectedAddress.phone}</p>
              </div>
            )}

            {/* Coupon Dropdown */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setCouponOpen(!couponOpen)}
                className="flex items-center justify-between w-full text-sm font-medium text-primary hover:text-primary/80 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {discount > 0 ? `Coupon applied (${couponCode})` : 'Apply Coupon'}
                </span>
                {couponOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <motion.div
                initial={false}
                animate={{ height: couponOpen ? 'auto' : 0, opacity: couponOpen ? 1 : 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 pt-2 pb-1">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    className="flex-1 h-9 text-sm"
                    disabled={discount > 0}
                  />
                  {discount > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => { setDiscount(0); setCouponCode(''); }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="h-9" onClick={applyCoupon}>
                      Apply
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="mt-4 flex gap-3 items-start p-3 bg-muted rounded-lg border">
              <input
                type="checkbox"
                id="agreement"
                checked={agreementChecked}
                onChange={(e) => setAgreementChecked(e.target.checked)}
                className="mt-1 cursor-pointer w-4 h-4"
              />
              <label htmlFor="agreement" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                I agree to the{" "}
                <a href="/terms" className="text-primary hover:underline font-semibold">Terms of Service</a>,{" "}
                <a href="/return-refund" className="text-primary hover:underline font-semibold">Return & Refund Policy</a>
                {" "}and{" "}
                <a href="/shipping-policy" className="text-primary hover:underline font-semibold">Shipping Policy</a>
              </label>
            </div>

            <Button
              className="w-full mt-6 rounded-full"
              size="lg"
              onClick={placeOrder}
              disabled={loading || !agreementChecked || isCartEmpty || !selectedAddress}
            >
              {loading ? <ButtonLoader text="Processing payment..." /> : `Pay Now · ${formatPrice(grandTotal)}`}
            </Button>

            {!selectedAddress && (
              <p className="text-xs text-destructive mt-2 text-center">Please add a delivery address to proceed</p>
            )}

            <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Secure Checkout</div>
              <div className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Fast Delivery</div>
              <div className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Quality Assured</div>
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
