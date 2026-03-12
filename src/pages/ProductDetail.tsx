import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, ShoppingCart, Minus, Plus, ArrowLeft, Star, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useProductReviews } from '@/hooks/useProductReviews';
import { toast } from '@/hooks/use-toast';
import RatingStars from '@/components/RatingStars';
import ReviewSummary, { ReviewStats } from '@/components/ReviewSummary';
import ReviewList from '@/components/ReviewList';
import ReviewForm, { ReviewFormData } from '@/components/ReviewForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import RelatedProducts from '@/components/RelatedProducts';
import ProductDescriptionCollapsible from '@/components/ProductDescriptionCollapsible';
import TaxInclusiveInfo from '@/components/TaxInclusiveInfo';
import SEOHead, { buildProductSchema, buildBreadcrumbSchema } from '@/components/SEOHead';
import { formatPrice } from '@/lib/formatters';
import { Loader } from '@/components/ui/loader';
import { getPricingInfo } from '@/lib/discountCalculations';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, items: cartItems } = useCart();
  const [adding, setAdding] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'rating_high' | 'rating_low'>('recent');
  const purchaseSectionRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  
  const {
    reviews,
    stats,
    loading: reviewsLoading,
    hasMore,
    loadMore,
    submitReview,
    deleteReview,
    getUserReview
  } = useProductReviews({
    productId: id || '',
    userId: user?.id,
    sortBy,
    filterByRating: selectedRating
  });

  useEffect(() => {
    if (!id) return;
    supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  // Show sticky bar when the Customer Reviews section scrolls into view
  useEffect(() => {
    const el = reviewsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  const handleAddToCart = () => {
    if (!user) { navigate('/auth'); return; }
    if (adding) return; // prevent double-click
    setAdding(true);
    try {
      addToCart(product.id, qty);
    } finally {
      setTimeout(() => setAdding(false), 600);
    }
  };

  const handleWriteReview = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Check if user already has a review
    const existingReview = await getUserReview();
    if (existingReview) {
      setEditingReview(existingReview);
    }
    setShowReviewForm(true);
  };

  const handleSubmitReview = async (reviewData: ReviewFormData) => {
    await submitReview({
      ...reviewData,
      reviewId: editingReview?.id
    });
    setShowReviewForm(false);
    setEditingReview(null);
  };

  const handleEditReview = (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
      setEditingReview(review);
      setShowReviewForm(true);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    setDeleteReviewId(reviewId);
  };

  const confirmDeleteReview = async () => {
    if (deleteReviewId) {
      await deleteReview(deleteReviewId);
      setDeleteReviewId(null);
    }
  };

  const productUrl = `${window.location.origin}/products/${id}`;
  const plainDescription = product?.description?.replace(/<[^>]*>/g, '').slice(0, 160) || product?.name || '';

  const productJsonLd = useMemo(() => {
    if (!product) return [];
    return [
      buildProductSchema({
        name: product.name,
        description: plainDescription,
        price: product.price,
        comparePrice: product.compare_price,
        imageUrl: product.image_url,
        images: product.images,
        inStock: product.stock_quantity > 0,
        category: product.categories?.name,
        averageRating: stats?.average_rating,
        reviewCount: stats?.total_reviews,
        url: productUrl,
      }),
      buildBreadcrumbSchema([
        { name: 'Home', url: window.location.origin },
        { name: 'Products', url: `${window.location.origin}/products` },
        ...(product.categories?.name ? [{ name: product.categories.name, url: `${window.location.origin}/products?category=${encodeURIComponent(product.categories.name)}` }] : []),
        { name: product.name },
      ]),
    ];
  }, [product, stats, productUrl, plainDescription]);

  if (loading) return (
    <Loader text="Loading product details..." className="min-h-[60vh]" delay={200} />
  );

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-[100px] md:pb-8">
      {product && (
        <SEOHead
          title={`${product.name}${product.categories?.name ? ` - ${product.categories.name}` : ''}`}
          description={plainDescription || `Buy ${product.name} from PANDIYIN. 100% natural homemade food from Madurai.`}
          ogType="product"
          ogImage={product.image_url}
          productMeta={{
            price: product.price,
            currency: 'INR',
            availability: product.stock_quantity > 0 ? 'in stock' : 'out of stock',
          }}
          jsonLd={productJsonLd}
        />
      )}
      {/* Back Button */}
      <div className="container mx-auto px-4 mb-4 md:mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 md:mb-6 -ml-2">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
      </div>

      {/* Main Content Grid: Product Image + Details */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 mb-12">
          {/* Left Column: Product Image Card */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 rounded-2xl overflow-hidden border border-muted shadow-sm bg-muted h-[320px] md:h-[520px] w-full">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover block" 
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <Leaf className="h-24 w-24 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Product Details (Desktop 3/5, Mobile Full Width) */}
          <div className="lg:col-span-3 flex flex-col min-w-0">
            {/* Product Header */}
            {product.categories?.name && (
              <Badge variant="secondary" className="mb-3 w-fit">{product.categories.name}</Badge>
            )}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold mb-3 md:mb-4">{product.name}</h1>
            
            {/* Rating Summary */}
            {stats && stats.total_reviews > 0 && stats.average_rating > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <RatingStars rating={stats.average_rating} showNumber size="md" />
                <span className="text-sm text-muted-foreground">
                  ({stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Price Section */}
            {(() => {
              const pricing = getPricingInfo(product.price, product.compare_price);
              return (
                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl md:text-4xl font-bold text-primary">{formatPrice(product.price)}</span>
                    {pricing.hasDiscount && (
                      <>
                        <span className="text-lg text-muted-foreground line-through">{formatPrice(pricing.comparePrice)}</span>
                        <Badge className="bg-green-100 hover:bg-green-100 text-green-800 text-sm font-bold border-0 px-2.5 py-1">
                          {pricing.discountPercent}% OFF
                        </Badge>
                      </>
                    )}
                  </div>
                  {pricing.hasDiscount && (
                    <p className="text-sm text-green-700 font-medium">You save {formatPrice(pricing.savingsAmount)} on this product</p>
                  )}
                  <div className="mt-3 pb-4 border-b" />
                </div>
              );
            })()}

            {/* Tax Inclusive Badge */}
            <div className="mb-6">
              <TaxInclusiveInfo variant="subtitle" />
            </div>

            {/* Weight/Unit Info */}
            {product.weight && (
              <p className="text-sm text-muted-foreground mb-6">{product.weight} {product.unit}</p>
            )}

            {/* Quantity & Add to Cart Section */}
            <div ref={purchaseSectionRef} className="space-y-4 mb-8">
              {product.stock_quantity > 0 ? (
                <>
                  <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground">Qty:</span>
                    <div className="flex items-center border rounded-lg bg-muted/50">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="h-10 w-10 active:scale-95"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-semibold">{qty}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setQty(q => Math.min(product.stock_quantity, q + 1))}
                        className="h-10 w-10 active:scale-95"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {product.stock_quantity <= 5 ? (
                      <span className="text-xs font-medium text-destructive ml-2">Only {product.stock_quantity} left in stock!</span>
                    ) : (
                      <span className="text-xs text-muted-foreground ml-2 hidden md:inline">{product.stock_quantity} available</span>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    {((cartItems || []).some(i => i.product_id === product.id)) ? (
                      <Button
                        size="lg"
                        variant="outline"
                        className="flex-1 rounded-full h-12 font-semibold bg-primary text-primary-foreground group-hover:!bg-transparent group-hover:!text-foreground transition-colors"
                        onClick={() => navigate('/cart')}
                      >
                        <motion.span initial={{ x: -6, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center justify-center">
                          <ShoppingCart className="mr-2 h-5 w-5" /> Go to Cart
                        </motion.span>
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        className="flex-1 rounded-full h-12 font-semibold" 
                        onClick={handleAddToCart}
                        disabled={adding}
                      >
                        {adding ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Adding...</>
                        ) : (
                          <><ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart</>
                        )}
                      </Button>
                    )}
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="flex-1 rounded-full h-12 font-semibold"
                      onClick={() => {
                        handleAddToCart();
                        navigate('/cart');
                      }}
                    >
                      Buy Now
                    </Button>
                  </div>
                </>
              ) : (
                <Badge variant="destructive" className="text-base px-4 py-2 w-fit">Out of Stock</Badge>
              )}
            </div>

            {/* Product Description - With Smooth Read More */}
            <div className="flex-grow min-w-0 w-full overflow-hidden">
              <ProductDescriptionCollapsible
                key={product.id}
                content={product.description}
                imageHeight={400}
              />
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div ref={reviewsRef} className="border-t pt-12">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="reviews" className="gap-2">
                <Star className="h-4 w-4" />
                Ratings & Reviews
                {stats && stats.total_reviews > 0 && (
                  <Badge variant="secondary" className="ml-2">{stats.total_reviews}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="space-y-8">
              {/* Write Review Button */}
              {!showReviewForm && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-2xl font-bold">Customer Reviews</h2>
                  <Button onClick={handleWriteReview} className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Write a Review
                  </Button>
                </div>
              )}

              {/* Review Form */}
              {showReviewForm && (
                <ReviewForm
                  productId={product.id}
                  productName={product.name}
                  existingReview={editingReview}
                  onSubmit={handleSubmitReview}
                  onCancel={() => {
                    setShowReviewForm(false);
                    setEditingReview(null);
                  }}
                />
              )}

              {/* Review Summary */}
              <ReviewSummary
                stats={stats as ReviewStats | null}
                selectedRating={selectedRating}
                onFilterByRating={setSelectedRating}
              />

              {/* Review List */}
              <ReviewList
                reviews={reviews}
                loading={reviewsLoading}
                currentUserId={user?.id}
                selectedRating={selectedRating}
                sortBy={sortBy}
                onSortChange={(sort) => setSortBy(sort)}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
                onLoadMore={loadMore}
                hasMore={hasMore}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Related Products Section - Full Width */}
      <div className="mt-20">
        <Separator className="mb-8" />
        <div className="container mx-auto px-4">
          <RelatedProducts 
            currentProductId={product.id}
            categoryId={product.category_id}
            maxItems={4}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteReviewId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteReviewId(null);
        }}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        onConfirm={confirmDeleteReview}
      />

      {/* ===== MOBILE STICKY PURCHASE BAR ===== */}
      {product.stock_quantity > 0 && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-[999] bg-white border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden transition-transform duration-300 ease-in-out ${
            showStickyBar ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-3">
            {/* Add to Cart / Go to Cart */}
            {((cartItems || []).some(i => i.product_id === product.id)) ? (
              <Button
                className="flex-1 h-12 rounded-xl font-semibold text-[15px] bg-primary text-primary-foreground"
                onClick={() => navigate('/cart')}
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" /> Go to Cart
              </Button>
            ) : (
              <Button
                className="flex-1 h-12 rounded-xl font-semibold text-[15px]"
                onClick={handleAddToCart}
                disabled={adding}
              >
                {adding ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Adding...</>
                ) : (
                  <><ShoppingCart className="mr-1.5 h-4 w-4" /> Add to Cart</>
                )}
              </Button>
            )}

            {/* Buy Now */}
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl font-semibold text-[15px]"
              onClick={() => {
                handleAddToCart();
                navigate('/cart');
              }}
            >
              Buy Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
