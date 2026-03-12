import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Leaf, Search, SlidersHorizontal, ArrowUpDown, X, ChevronDown, ShoppingCart, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatters';
import { getPricingInfo } from '@/lib/discountCalculations';
import { useCart } from '@/hooks/useCart';
import { SkeletonCard } from '@/components/ui/loader';
import { getCachedData, setCacheItem } from '@/lib/cacheService';
import { useRouteLoader } from '@/contexts/RouteLoaderContext';
import SEOHead from '@/components/SEOHead';

type SortOption = 'newest' | 'price_low' | 'price_high' | 'popularity';

const sortLabels: Record<SortOption, string> = {
  newest: 'Newest First',
  price_low: 'Price: Low to High',
  price_high: 'Price: High to Low',
  popularity: 'Popularity',
};

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingItems, setAddingItems] = useState<Set<string>>(new Set());
  const { addToCart, items: cartItems } = useCart();
  const navigate = useNavigate();
  const { endRouteLoad } = useRouteLoader();

  const searchFilter = searchParams.get('search') || '';

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get('category');
    return cat ? [cat] : [];
  });
  // Sync selectedCategories when the URL category param changes
  const urlCategory = searchParams.get('category');
  useEffect(() => {
    setSelectedCategories(urlCategory ? [urlCategory] : []);
    window.scrollTo(0, 0);
  }, [urlCategory]);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [manualMin, setManualMin] = useState('');
  const [manualMax, setManualMax] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [searchInput, setSearchInput] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isLoadingSearchSuggestions, setIsLoadingSearchSuggestions] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Live search suggestions for mobile search bar
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchInput.trim().length >= 2) {
      setIsLoadingSearchSuggestions(true);
      searchDebounceRef.current = setTimeout(async () => {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, compare_price, image_url, categories(name)')
          .eq('is_available', true)
          .ilike('name', `%${searchInput.trim()}%`)
          .limit(6);
        setSearchSuggestions(data || []);
        setIsLoadingSearchSuggestions(false);
        setShowSearchSuggestions(true);
      }, 200);
    } else {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      setIsLoadingSearchSuggestions(false);
    }

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddToCart = async (productId: string) => {
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

  // OPTIMIZED: Load categories with caching
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCachedData(
          'all-categories',
          async () => {
            const { data, error } = await supabase
              .from('categories')
              .select('*')
              .order('sort_order');
            if (error) throw error;
            return data || [];
          },
          30 * 60 * 1000 // Cache for 30 minutes
        );
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      }
    };
    
    loadCategories();
  }, []);

  // OPTIMIZED: Progressive product loading with early exit
  useEffect(() => {
    setLoading(true);
    
    const loadProducts = async () => {
      try {
        let query = supabase
          .from('products')
          .select('*, categories(name)')
          .eq('is_available', true);
        
        if (searchFilter) {
          query = query.ilike('name', `%${searchFilter}%`);
        }
        
        const { data, error } = await query.order('created_at', { 
          ascending: false 
        });
        
        if (error) throw error;
        
        // CRITICAL: End loading screen as soon as products are ready
        // This is the early exit - don't wait for sorting/filtering
        if (data && data.length > 0) {
          setProducts(data);
          setLoading(false);
          endRouteLoad(); // EXIT loading screen early!
          
          // Calculate max price for filter
          const mp = Math.ceil(Math.max(...data.map(p => Number(p.price))));
          setMaxPrice(mp > 0 ? mp : 5000);
          setPriceRange(prev => [prev[0], mp > 0 ? mp : 5000]);
        } else {
          setProducts(data);
          setLoading(false);
          endRouteLoad();
        }
      } catch (error) {
        console.error('Failed to load products:', error);
        setLoading(false);
        endRouteLoad();
      }
    };

    loadProducts();
  }, [searchFilter, endRouteLoad]);

  const activeFilterCount = (selectedCategories.length > 0 ? 1 : 0) + (inStockOnly ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

  const filtered = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter(p => {
        const catName = (p as any).categories?.name;
        return catName && selectedCategories.includes(catName);
      });
    }

    // Price filter
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // In stock
    if (inStockOnly) {
      result = result.filter(p => p.stock_quantity > 0);
    }

    // Sort
    switch (sortBy) {
      case 'price_low': result.sort((a, b) => a.price - b.price); break;
      case 'price_high': result.sort((a, b) => b.price - a.price); break;
      case 'popularity': result.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [products, selectedCategories, priceRange, inStockOnly, sortBy]);

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]);
    setManualMin('');
    setManualMax('');
    setInStockOnly(false);
  };

  const applyManualPrice = () => {
    const min = manualMin ? Number(manualMin) : 0;
    const max = manualMax ? Number(manualMax) : maxPrice;
    setPriceRange([Math.max(0, min), Math.min(maxPrice, max)]);
  };

  return (
    <div className="container mx-auto px-4 pt-20 md:pt-24 pb-8">
      <SEOHead
        title={searchFilter ? `Search: ${searchFilter} - Products` : 'All Products - PANDIYIN'}
        description="Browse our collection of authentic homemade foods from Madurai. Traditional pickles, snacks, spice powders. 100% natural, no preservatives."
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-5 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">All Products</h1>
        <div ref={searchContainerRef} className="relative max-w-sm w-full md:hidden">
          <form onSubmit={e => { e.preventDefault(); setShowSearchSuggestions(false); setSearchParams(s => { if (searchInput) s.set('search', searchInput); else s.delete('search'); return s; }); }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search products..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onFocus={() => searchInput.trim().length >= 2 && setShowSearchSuggestions(true)}
              className="pl-9 pr-9 h-10 rounded-full bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              autoComplete="off"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setShowSearchSuggestions(false); setSearchParams(s => { s.delete('search'); return s; }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSearchSuggestions && searchInput.trim().length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 max-h-[320px] overflow-y-auto"
              >
                {isLoadingSearchSuggestions ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                ) : searchSuggestions.length > 0 ? (
                  <>
                    {searchSuggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => { setShowSearchSuggestions(false); navigate(`/products/${product.id}`); }}
                        className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-gray-100 last:border-0"
                      >
                        <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Leaf className="h-4 w-4 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                          {product.categories?.name && (
                            <p className="text-[10px] text-muted-foreground truncate">{product.categories.name}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground flex-shrink-0">
                          {formatPrice(product.price)}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setShowSearchSuggestions(false); setSearchParams(s => { if (searchInput) s.set('search', searchInput); else s.delete('search'); return s; }); }}
                      className="w-full p-3 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors text-primary border-t border-gray-200 font-medium text-xs"
                    >
                      View all results
                    </button>
                  </>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No products found</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toolbar: Sort + Filter */}
      <div className="flex items-center gap-3 mb-6">
        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-full">
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
              <span className="sm:hidden">Sort</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(sortLabels) as SortOption[]).map(key => (
              <DropdownMenuItem key={key} onClick={() => setSortBy(key)} className={sortBy === key ? 'bg-accent' : ''}>
                {sortLabels[key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter Button */}
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-full relative">
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>Filters</SheetTitle>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                    Clear All
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Categories */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Category</h4>
                <div className="space-y-2">
                  {categories.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={selectedCategories.includes(c.name)}
                        onCheckedChange={() => toggleCategory(c.name)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Price Range */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Price Range</h4>
                <Slider
                  value={priceRange}
                  min={0}
                  max={maxPrice}
                  step={10}
                  onValueChange={(v) => setPriceRange(v as [number, number])}
                  className="mb-3"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={manualMin}
                    onChange={e => setManualMin(e.target.value)}
                    className="text-xs h-8"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={manualMax}
                    onChange={e => setManualMax(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button variant="secondary" size="sm" className="h-8 text-xs px-3" onClick={applyManualPrice}>
                    Go
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Availability */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Availability</h4>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={inStockOnly} onCheckedChange={(v) => setInStockOnly(!!v)} />
                  In Stock Only
                </label>
              </div>

              <Button className="w-full rounded-full" onClick={() => setFilterOpen(false)}>
                Show {filtered.length} Products
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Active filter chips */}
        <AnimatePresence>
          {selectedCategories.map(cat => (
            <motion.div key={cat} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Badge variant="secondary" className="gap-1 cursor-pointer rounded-full pl-3 pr-1 py-1" onClick={() => toggleCategory(cat)}>
                {cat}
                <X className="h-3 w-3" />
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>

        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} products</span>
      </div>

      {/* Products Grid */}
      {loading ? (
        <SkeletonCard count={8} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Leaf className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No products found matching your filters.</p>
          {activeFilterCount > 0 && (
            <Button variant="link" onClick={clearFilters} className="mt-2">Clear all filters</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="h-full">
              <Link to={`/products/${p.id}`} className="h-full block">
                <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col border-0 shadow-sm">
                  <div className="h-40 md:h-56 lg:h-64 w-full bg-muted flex items-center justify-center overflow-hidden relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-center rounded-lg group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
                    <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">{(p as any).categories?.name}</p>
                    <h3 className="font-semibold text-sm md:text-base font-sans line-clamp-2 mb-1 md:mb-1.5 leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
                    {p.weight && <p className="text-[10px] md:text-xs text-muted-foreground mb-1">{p.weight}{p.unit ? ` ${p.unit}` : ''}</p>}
                    {Number(p.average_rating) > 0 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-sm sm:text-xs font-semibold px-2 sm:px-1.5 py-0.5 rounded">
                          {Number(p.average_rating).toFixed(1)} <Star className="h-3 w-3 sm:h-2.5 sm:w-2.5 fill-current" />
                        </span>
                        {p.review_count > 0 && <span className="text-[10px] text-muted-foreground">({p.review_count})</span>}
                      </div>
                    )}
                    {/* Pricing */}
                    {(() => {
                      const pricing = getPricingInfo(p.price, p.compare_price);
                      return (
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between gap-1.5">
                            <span className="font-semibold text-lg sm:text-lg text-primary leading-none">{formatPrice(p.price)}</span>
                            {pricing.hasDiscount && (
                              <Badge className="bg-green-100 hover:bg-green-100 text-green-800 text-xs sm:text-xs font-bold border-0 px-2 sm:px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                                {pricing.discountPercent}% OFF
                              </Badge>
                            )}
                          </div>
                          {pricing.hasDiscount && (
                            <span className="text-sm sm:text-sm text-muted-foreground line-through leading-none">{formatPrice(pricing.comparePrice)}</span>
                          )}
                        </div>
                      );
                    })()}
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
      )}
    </div>
  );
}
