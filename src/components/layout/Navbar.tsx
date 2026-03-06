import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, User, Menu, Search, LogOut, Package, Shield, UserCog, ArrowRight, Leaf, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatters';

interface ProductSuggestion {
  id: string;
  name: string;
  price: number;
  compare_price: number | null;
  image_url: string | null;
  categories: { name: string } | null;
}

export default function Navbar() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLFormElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const urlSearchQuery = searchParams.get('search') || '';
    setSearchQuery(urlSearchQuery);
  }, [searchParams]);

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideDesktop = searchRef.current?.contains(target);
      const clickedInsideMobile = mobileSearchRef.current?.contains(target);

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setShowSuggestions(false);
        setMobileSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (searchQuery.trim().length >= 2) {
      setIsLoadingSuggestions(true);
      debounceTimerRef.current = setTimeout(async () => {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, compare_price, image_url, categories(name)')
          .eq('is_available', true)
          .ilike('name', `%${searchQuery.trim()}%`)
          .limit(8);
        
        setSuggestions(data || []);
        setIsLoadingSuggestions(false);
        setShowSuggestions(true);
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!isHomePage) {
      setIsScrolled(false);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (productId: string) => {
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    navigate(`/products/${productId}`);
  };

  const handleViewAll = () => {
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Products', to: '/products' },
    { label: 'About', to: '/about' },
  ];

  const isActive = isHomePage ? (isScrolled || isHovered || mobileOpen) : true;
  const isProductsPage = location.pathname === '/products';

  // Reusable suggestions dropdown
  const SuggestionsDropdown = ({ isMobile = false }: { isMobile?: boolean }) => (
    <AnimatePresence>
      {showSuggestions && searchQuery.trim().length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 ${isMobile ? 'max-h-[300px]' : 'max-h-[400px]'} overflow-y-auto`}
        >
          {isLoadingSuggestions ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSuggestionClick(product.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-gray-100 last:border-0"
                >
                  <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-md bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center`}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Leaf className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-muted-foreground/30`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-foreground truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {product.name}
                    </p>
                    {product.categories?.name && (
                      <p className={`text-muted-foreground truncate ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                        {product.categories.name}
                      </p>
                    )}
                  </div>
                  <span className={`font-semibold text-foreground flex-shrink-0 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {formatPrice(product.price)}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleViewAll}
                className="w-full p-3 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors text-primary border-t border-gray-200 font-medium"
              >
                <span className={isMobile ? 'text-xs' : 'text-sm'}>View all results</span>
                <ArrowRight className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">No products found</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHomePage
          ? (isActive
              ? 'bg-white/95 backdrop-blur-md border-b border-black/5 shadow-sm'
              : 'md:bg-transparent bg-white/95 md:border-0 border-b border-black/5')
          : 'bg-white border-b border-black/5 shadow-sm'
      }`}
      onMouseEnter={() => isHomePage && setIsHovered(true)}
      onMouseLeave={() => isHomePage && setIsHovered(false)}
    >
      <div className="container mx-auto px-3 sm:px-4 h-16 transition-colors duration-300">
        {/* ===== MOBILE HEADER (4-element layout) ===== */}
        <div className="md:hidden flex items-center justify-between h-full gap-1 sm:gap-2">
          {/* Left: Hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-foreground hover:bg-secondary">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col [&>button]:hidden">
              {/* Sidebar Header with Close Button */}
              <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-gray-200">
                <h2 className="text-lg font-bold text-foreground flex-shrink">Menu</h2>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex-shrink-0 h-10 w-10 rounded-md hover:bg-secondary flex items-center justify-center transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
              </div>

              <SheetHeader className="sr-only">
                <SheetTitle>Mobile navigation</SheetTitle>
              </SheetHeader>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Account Section */}
                <div className="border-b p-4">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 pb-3 border-b">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{user.email?.split('@')[0] || 'Profile'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full rounded-full h-9 text-sm" onClick={() => { navigate('/profile'); setMobileOpen(false); }}>
                        <UserCog className="mr-2 h-4 w-4" /> Profile
                      </Button>
                      <Button variant="outline" className="w-full rounded-full h-9 text-sm" onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}>
                        <Package className="mr-2 h-4 w-4" /> My Orders
                      </Button>
                      {isAdmin && (
                        <Button variant="outline" className="w-full rounded-full h-9 text-sm" onClick={() => { navigate('/admin'); setMobileOpen(false); }}>
                          <Shield className="mr-2 h-4 w-4" /> Admin
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button className="w-full rounded-full h-10 text-sm" onClick={() => { navigate('/auth'); setMobileOpen(false); }}>
                      <User className="mr-2 h-4 w-4" /> Sign In
                    </Button>
                  )}
                </div>

                {/* Menu Items */}
                <div className="p-4 space-y-1">
                  {[
                    { label: 'Home', to: '/' },
                    { label: 'Products', to: '/products' },
                    { label: 'About', to: '/about' },
                  ].map(l => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-3 text-base font-medium rounded-lg hover:bg-secondary transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      const footer = document.getElementById('footer');
                      if (footer) footer.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="block w-full text-left px-3 py-3 text-base font-medium rounded-lg hover:bg-secondary transition-colors"
                  >
                    Contact
                  </button>
                </div>
              </div>

              {/* Logout */}
              {user && (
                <div className="border-t p-4">
                  <Button variant="destructive" className="w-full rounded-full h-10" onClick={() => { signOut(); setMobileOpen(false); }}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Center: Logo */}
          <Link to="/" className="flex-1 flex justify-center mx-1 min-w-0">
            <div className="flex flex-col items-center leading-none">
              <span className="text-base sm:text-lg font-display font-bold text-primary">PANDIYIN</span>
              <span className="text-[9px] sm:text-[10px] tracking-[0.15em] text-muted-foreground font-medium -mt-0.5">Nature In Pack</span>
            </div>
          </Link>

          {/* Right: Search + Cart */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {!isProductsPage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-foreground hover:bg-secondary"
                onClick={() => setMobileSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground hover:bg-secondary">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-accent text-accent-foreground">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* ===== DESKTOP HEADER ===== */}
        <div className="hidden md:flex items-center justify-between h-full gap-4">
          <Link to="/" className="flex items-center gap-2 transition-colors duration-300">
            <span className={`text-xl font-display font-bold transition-colors duration-300 ${
              (isHomePage && !isActive) ? 'md:text-white text-primary md:drop-shadow-lg' : 'text-primary'
            }`}>
              PANDIYIN
            </span>
            <span className={`hidden sm:inline text-xs font-sans transition-colors duration-300 ${
              (isHomePage && !isActive) ? 'md:text-white/80 text-muted-foreground md:drop-shadow' : 'text-muted-foreground'
            }`}>
              Nature In Pack
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium transition-colors duration-300 ${
                  (isHomePage && !isActive)
                    ? 'md:text-white/90 md:hover:text-white text-foreground/70 hover:text-primary md:drop-shadow'
                    : 'text-foreground/70 hover:text-primary'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={handleSearch} className="hidden md:flex items-center max-w-xs relative">
            <div className="relative w-full" ref={searchRef}>
              <div className="relative">
                <Search className={`absolute left-2.5 top-2.5 h-4 w-4 transition-colors duration-300 ${
                  (isHomePage && !isActive) ? 'md:text-white/60 text-muted-foreground' : 'text-muted-foreground'
                }`} />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                  onClick={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                  onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
                  className={`pl-9 h-9 w-48 lg:w-64 transition-all duration-300 ${
                    (isHomePage && !isActive)
                      ? 'md:bg-white/20 md:text-white md:placeholder:text-white/50 md:border-white/20 bg-secondary/50 text-foreground placeholder:text-muted-foreground/60'
                      : 'bg-secondary/50 text-foreground placeholder:text-muted-foreground/60'
                  }`}
                />
              </div>
              <SuggestionsDropdown isMobile={false} />
            </div>
          </form>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/cart" className="relative">
              <Button
                variant="ghost"
                size="icon"
                className={`transition-colors duration-300 ${
                  (isHomePage && !isActive) ? 'md:text-white md:hover:bg-white/10 text-foreground hover:bg-secondary' : 'text-foreground hover:bg-secondary'
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-accent text-accent-foreground">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`transition-colors duration-300 ${
                      (isHomePage && !isActive) ? 'md:text-white md:hover:bg-white/10 text-foreground hover:bg-secondary' : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <UserCog className="mr-2 h-4 w-4" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <Package className="mr-2 h-4 w-4" /> My Orders
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/auth')}
                className={`transition-colors duration-300 ${
                  (isHomePage && !isActive) ? 'md:bg-white md:text-primary md:hover:bg-white/90' : ''
                }`}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ===== MOBILE FLOATING SEARCH OVERLAY ===== */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 left-0 right-0 bg-white pt-3 pb-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto px-3 sm:px-4">
                <form onSubmit={e => { handleSearch(e); setMobileSearchOpen(false); }} ref={mobileSearchRef} className="relative space-y-2">
                  <div className="relative flex items-center gap-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      ref={mobileSearchInputRef}
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                      onClick={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                      onKeyDown={(e) => e.key === 'Escape' && setMobileSearchOpen(false)}
                      className="pl-9 h-10"
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <SuggestionsDropdown isMobile={true} />
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

