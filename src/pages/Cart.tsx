import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Minus, Plus, ShoppingBag, Leaf, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import ProductRecommendations from '@/components/ProductRecommendations';
import TaxInclusiveInfo from '@/components/TaxInclusiveInfo';
import { formatPrice } from '@/lib/formatters';
import { Loader } from '@/components/ui/loader';
import { getChargedWeight } from '@/lib/deliveryCalculations';
import SEOHead from '@/components/SEOHead';

function getPricingInfo(price: number, comparePrice?: number) {
  const hasDiscount = comparePrice && comparePrice > price;
  const savingsAmount = hasDiscount ? comparePrice - price : 0;
  return { hasDiscount, savingsAmount };
}

export default function Cart() {
  const { items, total, loading, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const totalWeightKg = useMemo(() => {
    return items.reduce((sum, item) => {
      const wkg = Number((item.product as any).weight_kg) || 0;
      return sum + wkg * item.quantity;
    }, 0);
  }, [items]);

  const chargedWeight = useMemo(() => getChargedWeight(totalWeightKg), [totalWeightKg]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-20 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">Sign in to view your cart</h2>
        <Button onClick={() => navigate('/auth')} className="mt-4">Sign In</Button>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return <Loader text="Loading your cart..." delay={200} />;
  }

  if (!loading && items.length === 0) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add some delicious products to get started!</p>
          <Button asChild><Link to="/products">Browse Products</Link></Button>
        </div>

        {/* Show featured recommendations even when cart is empty */}
        <ProductRecommendations
          cartItems={[]}
          maxItems={6}
          title="Featured Products"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-20 md:pt-24 pb-8">
      <SEOHead title="Shopping Cart" description="Review items in your shopping cart at PANDIYIN." noindex />
      <h1 className="text-2xl md:text-3xl font-display font-bold mb-6 md:mb-8">Shopping Cart</h1>
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-3 md:p-4 flex gap-3 md:gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Leaf className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_id}`} className="font-semibold text-sm hover:text-primary line-clamp-1">{item.product.name}</Link>
                  {item.product.stock_quantity > 0 && item.product.stock_quantity <= 5 && (
                    <p className="text-xs font-medium text-destructive mt-0.5">Only {item.product.stock_quantity} left in stock!</p>
                  )}
                  {(item.product as any).weight && <p className="text-xs text-muted-foreground mt-0.5">{(item.product as any).weight}{(item.product as any).unit ? ` ${(item.product as any).unit}` : ''}</p>}
                  {(() => {
                    const pricing = getPricingInfo(item.product.price, (item.product as any).compare_price);
                    return (
                      <div className="mt-1">
                        <p className="text-primary font-medium">{formatPrice(item.product.price)}</p>
                        {pricing.hasDiscount && (
                          <p className="text-xs text-green-700">You saved {formatPrice(pricing.savingsAmount)}</p>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={item.quantity >= item.product.stock_quantity} onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="text-right font-medium whitespace-nowrap">{formatPrice(item.product.price * item.quantity)}</div>
              </Card>
            </motion.div>
          ))}
        </div>
        <div>
          <Card className="p-6 sticky top-20">
            <h3 className="font-display font-bold text-lg mb-4">Order Summary</h3>
            
            {/* Total Savings Box */}
            {(() => {
              const totalSavings = items.reduce((sum, item) => {
                const pricing = getPricingInfo(item.product.price, (item.product as any).compare_price);
                return sum + (pricing.savingsAmount * item.quantity);
              }, 0);
              
              return totalSavings > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-green-900">
                    Total Savings on this order: <span className="text-green-700">{formatPrice(totalSavings)}</span>
                  </p>
                </div>
              ) : null;
            })()}
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="text-muted-foreground text-xs">Calculated at checkout</span></div>
            </div>
            <div className="border-t mt-4 pt-4 flex justify-between text-lg">
              <span className="font-bold">Total</span><span className="font-medium text-primary">{formatPrice(total)}</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <TaxInclusiveInfo variant="subtitle" />
            </div>
            <Button className="w-full mt-4 rounded-full" size="lg" onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </Button>
          </Card>
        </div>
      </div>

      {/* Intelligent Product Recommendations */}
      <ProductRecommendations
        cartItems={items}
        maxItems={6}
        title="You may also like"
      />
    </div>
  );
}
