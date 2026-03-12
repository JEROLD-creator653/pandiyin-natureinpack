import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { TouchEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Leaf, Truck, ShieldCheck, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CartReminderPopup } from '@/components/CartReminderPopup';
import TrustBadges from '@/components/TrustBadges';
import SEOHead, { buildOrganizationSchema, buildWebSiteSchema } from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import favicon from '@/public/Pandiyin.ico';
import { formatPrice } from '@/lib/formatters';

const BANNER_CACHE_KEY = 'hero_banner_url';
const BANNER_DATA_CACHE_KEY = 'hero_banners_data';

// Read cached banner data synchronously (runs once at module load)
function getCachedBanners(): Array<{ id: string; title: string; image_url: string; link_url: string | null }> | undefined {
  try {
    const raw = localStorage.getItem(BANNER_DATA_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  return undefined;
}

// Optimized banner fetch function — uses public view for universal access
const fetchBanners = async () => {
  const { data, error } = await supabase
    .from('public_banners')
    .select('id, title, image_url, link_url')
    .eq('is_active', true)
    .order('sort_order');
  
  if (error) throw error;
  return data || [];
};

export default function Index() {
  const navigate = useNavigate();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [addingItems, setAddingItems] = useState<Set<string>>(new Set());
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchLastXRef = useRef<number | null>(null);
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  
  const { user } = useAuth();
  const { items: cartItems, addToCart } = useCart();

  // Read cached banners from localStorage at mount time (synchronous, zero latency)
  // This provides instant data so the hero banner renders on the very first frame
  const cachedBanners = useMemo(() => getCachedBanners(), []);

  // React Query hook for optimized banner fetching with caching
  // placeholderData: renders cached localStorage banners instantly while Supabase responds
  // staleTime: 30 minutes - banner data considered fresh for 30 mins
  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: fetchBanners,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
    refetchOnWindowFocus: false,
    placeholderData: cachedBanners, // Renders instantly from localStorage cache
  });

  const handleImageLoad = useCallback((bannerId: string) => {
    setLoadedImages(prev => ({ ...prev, [bannerId]: true }));
  }, []);

  // Cache banner data + image URL in localStorage for instant preloading on next visit
  useEffect(() => {
    if (!banners || banners.length === 0) return;
    
    const heroBanner = banners[0];
    if (!heroBanner.image_url) return;

    // Cache the full banner data array for instant rendering on next visit
    try {
      localStorage.setItem(BANNER_CACHE_KEY, heroBanner.image_url);
      localStorage.setItem(BANNER_DATA_CACHE_KEY, JSON.stringify(banners));
    } catch (e) {
      // localStorage may not be available
    }

    // For current session: inject preload link if not already preloaded via cache
    const existingPreload = document.querySelector(`link[rel="preload"][href="${CSS.escape(heroBanner.image_url)}"]`);
    if (!existingPreload) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = heroBanner.image_url;
      link.type = 'image/webp';
      document.head.appendChild(link);

      return () => {
        if (link.parentNode) document.head.removeChild(link);
      };
    }
  }, [banners]);

  // Check if hero banner was pre-loaded via main.tsx Image() cache strategy
  // Handles both already-complete and still-loading cases (fixes race condition)
  useEffect(() => {
    if (!banners || banners.length === 0) return;
    const preloadedImg = (window as any).__heroBannerPreloaded as HTMLImageElement | undefined;
    if (!preloadedImg || preloadedImg.src !== banners[0].image_url) return;

    if (preloadedImg.complete && preloadedImg.naturalWidth > 0) {
      // Image already finished loading
      handleImageLoad(banners[0].id);
    } else {
      // Image still loading — listen for completion
      const onLoad = () => handleImageLoad(banners[0].id);
      preloadedImg.addEventListener('load', onLoad, { once: true });
      return () => preloadedImg.removeEventListener('load', onLoad);
    }
  }, [banners, handleImageLoad]);

  // Fetch featured products (OPTIMIZED: Non-blocking, loads in background)
  // OLD: This blocked page render until ALL featured products loaded
  // NEW: Shows placeholder immediately, updates when data arrives
  const [featured, setFeatured] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  
  useEffect(() => {
    // Defer featured products loading to prioritize hero banner
    // Uses requestIdleCallback (or 150ms fallback) so banner gets network priority
    const loadFeatured = async () => {
      try {
        setFeaturedLoading(true);
        const { data } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('is_featured', true)
          .eq('is_available', true)
          .limit(8);
        
        if (data) {
          setFeatured(data);
        }
      } catch (error) {
        console.error('Failed to load featured products:', error);
      } finally {
        setFeaturedLoading(false);
      }
    };

    // Defer: let hero banner load first
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => loadFeatured(), { timeout: 300 });
    } else {
      setTimeout(loadFeatured, 150);
    }
  }, []);

  // Favicon setup
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = favicon;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = favicon;
      document.head.appendChild(newLink);
    }
  }, []);

  // Show cart reminder popup on homepage if user has cart items
  useEffect(() => {
    if (user && cartItems && cartItems.length > 0) {
      setShowReminderPopup(true);
    }
  }, [user, cartItems]);

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setAddingItems(prev => new Set(prev).add(productId));
    await addToCart(productId, 1);
    setTimeout(() => {
      setAddingItems(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }, 600);
  };

  // Auto-rotate banners every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = useCallback(() => {
    if (isScrollingRef.current || !banners.length) return;
    isScrollingRef.current = true;
    
    setCurrentBannerIndex((prev) => (prev + 1) % (banners.length || 1));
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 300);
  }, [banners.length]);

  const prevBanner = useCallback(() => {
    if (isScrollingRef.current || !banners.length) return;
    isScrollingRef.current = true;
    
    setCurrentBannerIndex((prev) => (prev - 1 + (banners.length || 1)) % (banners.length || 1));
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 300);
  }, [banners.length]);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (banners.length <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchLastXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    touchLastXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchLastXRef.current === null) return;
    const delta = touchLastXRef.current - touchStartXRef.current;
    const threshold = 30; // Reduced threshold for better responsiveness
    if (Math.abs(delta) >= threshold) {
      if (delta > 0) {
        prevBanner();
      } else {
        nextBanner();
      }
    }
    touchStartXRef.current = null;
    touchLastXRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevBanner();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextBanner();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [nextBanner, prevBanner]);

  return (
    <>
      <SEOHead
        title="PANDIYIN - Nature In Pack | Homemade Foods from Madurai"
        description="Authentic homemade foods from Madurai. Traditional pickles, snacks, spice powders, and sweets. 100% natural, no preservatives. Free shipping above ₹799."
        ogType="website"
        jsonLd={[buildOrganizationSchema(), buildWebSiteSchema()]}
      />
      {/* Professional Banner Carousel - Hero Banner */}
      {banners.length > 0 ? (
        <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden group pt-16 lg:pt-0" style={{ containIntrinsicSize: '100vw 500px', contentVisibility: 'visible' }}>
          <div
            className="relative w-full h-full touch-pan-y select-none cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-y' }}
          >
            {banners.map((banner, index) => {
              // Hero banner (index 0): skip animation if image is already pre-loaded
              const isHero = index === 0;
              const isPreloaded = isHero && loadedImages[banner.id];
              
              return (
              <motion.div
                key={banner.id}
                initial={{ opacity: isPreloaded ? 1 : 0 }}
                animate={{ opacity: index === currentBannerIndex ? 1 : 0 }}
                transition={{ duration: isPreloaded && index === currentBannerIndex ? 0 : 0.3 }}
                className="absolute inset-0"
                style={{ pointerEvents: index === currentBannerIndex ? 'auto' : 'none' }}
              >
                {/* Loading Skeleton - Shows while banner image loads */}
                {!loadedImages[banner.id] && (
                  <Skeleton className="absolute inset-0 w-full h-full" />
                )}
                
                {banner.link_url ? (
                  <Link to={banner.link_url} className="block w-full h-full">
                    <div className="relative w-full h-full">
                      <img 
                        src={banner.image_url} 
                        alt={banner.title} 
                        onLoad={() => handleImageLoad(banner.id)}
                        loading={isHero ? 'eager' : 'lazy'}
                        // @ts-expect-error - fetchpriority is valid HTML5 attribute, React types not updated yet
                        fetchpriority={isHero ? 'high' : 'low'}
                        decoding={isHero ? 'sync' : 'async'}
                        className={`w-full h-full object-cover ${
                          isPreloaded 
                            ? 'opacity-100' 
                            : `transition-opacity duration-500 ${loadedImages[banner.id] ? 'opacity-100' : 'opacity-0'}`
                        }`}
                      />
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                  </Link>
                ) : (
                  <div className="relative w-full h-full">
                    <img 
                      src={banner.image_url} 
                      alt={banner.title}  
                      onLoad={() => handleImageLoad(banner.id)}
                      loading={isHero ? 'eager' : 'lazy'}
                      // @ts-expect-error - fetchpriority is valid HTML5 attribute, React types not updated yet
                      fetchpriority={isHero ? 'high' : 'low'}
                      decoding={isHero ? 'sync' : 'async'}
                      className={`w-full h-full object-cover ${
                        isPreloaded 
                          ? 'opacity-100' 
                          : `transition-opacity duration-500 ${loadedImages[banner.id] ? 'opacity-100' : 'opacity-0'}`
                      }`}
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                )}
              </motion.div>
            );
            })}
            
            {/* Navigation Arrows - Show on Hover */}
            {banners.length > 1 && (
              <>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block">
                  <button
                    onClick={prevBanner}
                    className="bg-white/80 hover:bg-white text-black p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95"
                    aria-label="Previous banner"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block">
                  <button
                    onClick={nextBanner}
                    className="bg-white/80 hover:bg-white text-black p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95"
                    aria-label="Next banner"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
              </>
            )}

            {/* Dot Indicators */}
            {banners.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBannerIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentBannerIndex 
                        ? 'bg-white w-8' 
                        : 'bg-white/50 w-2 hover:bg-white/70'
                    }`}
                    aria-label={`Go to banner ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : bannersLoading ? (
        /* Fixed-height skeleton placeholder prevents layout shift while banners load */
        <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden pt-16 lg:pt-0">
          <Skeleton className="absolute inset-0 w-full h-full" />
        </section>
      ) : null}

      {/* Trust Badges Scrolling Strip - Separated with spacing */}
      <div className="py-8 md:py-12 lg:py-16">
        <TrustBadges />
      </div>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="py-10 md:py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-display font-bold">Bestsellers</h2>
              <Button asChild variant="ghost" size="sm"><Link to="/products">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {featured.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="h-full">
                  <Link to={`/products/${p.id}`} className="h-full block">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col border-0 shadow-sm">
                      <div className="h-40 md:h-56 lg:h-64 w-full bg-muted flex items-center justify-center overflow-hidden relative">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-center rounded-lg group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <Leaf className="h-12 w-12 text-muted-foreground/30" />
                        )}
                        {p.stock_quantity <= 5 && p.stock_quantity > 0 && (
                          <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] md:text-xs border-0 shadow-sm">Few Left</Badge>
                        )}
                        {p.stock_quantity === 0 && (
                          <Badge variant="destructive" className="absolute top-2 right-2 text-[10px] md:text-xs border-0 shadow-sm">Out of Stock</Badge>
                        )}
                      </div>
                      <CardContent className="p-3 md:p-4 flex-1 flex flex-col">
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">{(p as any).categories?.name}</p>
                          <h3 className="font-semibold text-sm md:text-base font-sans line-clamp-2 mb-1 leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
                          {p.weight && <p className="text-[10px] md:text-xs text-muted-foreground mb-1 md:mb-2">{p.weight}{p.unit ? ` ${p.unit}` : ''}</p>}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2 md:mb-3">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="font-medium text-base md:text-lg text-primary">{formatPrice(p.price)}</span>
                            {p.compare_price && <span className="text-xs md:text-sm text-muted-foreground line-through">{formatPrice(p.compare_price)}</span>}
                          </div>
                          {p.average_rating !== null && p.average_rating !== undefined && Number(p.average_rating) > 0 && (
                            <span className="flex items-center gap-1 text-sm font-medium text-slate-600">
                              <span className="text-yellow-500">★</span>
                              {Number(p.average_rating).toFixed(1)}+
                            </span>
                          )}
                        </div>
                        <div className="mt-auto pt-3 flex justify-center">
                          {((cartItems || []).some(i => i.product_id === p.id) || addingItems.has(p.id)) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full rounded-full text-sm bg-primary text-primary-foreground group-hover:!bg-transparent group-hover:!text-foreground transition-all"
                              onClick={(e) => { e.preventDefault(); navigate('/cart'); }}
                            >
                              <motion.span initial={{ x: -6, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center justify-center">
                                <ShoppingCart className="h-4 w-4 mr-2" /> Go to Cart
                              </motion.span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full rounded-full text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                              variant={addingItems.has(p.id) ? "secondary" : "outline"}
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddToCart(p.id);
                              }}
                              disabled={p.stock_quantity === 0 || addingItems.has(p.id)}
                            >
                              {addingItems.has(p.id) ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex items-center gap-1"
                                >
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                  >
                                    ✓
                                  </motion.div>
                                  Added
                                </motion.div>
                              ) : p.stock_quantity === 0 ? (
                                'Out of Stock'
                              ) : (
                                <>
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Add to Cart
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Brand Story */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <Leaf className="h-10 w-10 mx-auto text-primary mb-4" />
            <h2 className="text-3xl font-display font-bold mb-6">From Madurai Kitchens to Your Home</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              At PANDIYIN, we believe food should be pure, honest, and full of love. Every product is handcrafted using traditional recipes passed down through generations, with ingredients sourced directly from local farms.
            </p>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/about">Read Our Story</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Cart Reminder Popup */}
      <AnimatePresence>
        {showReminderPopup && cartItems && cartItems.length > 0 && (
          <CartReminderPopup
            cartCount={cartItems.length}
            userName={user?.email?.split('@')[0] || user?.user_metadata?.full_name}
            onClose={() => setShowReminderPopup(false)}
            onCheckout={() => setShowReminderPopup(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
