import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import ScrollToTop from "@/components/ScrollToTop";
import { RouteLoaderProvider } from "@/contexts/RouteLoaderContext";

import CustomerLayout from "@/components/layout/CustomerLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminGuard from "@/components/AdminGuard";
import { GlobalLoader } from "@/components/GlobalLoader";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Dashboard from "./pages/Dashboard";
import OrderDetail from "./pages/OrderDetail";
import Profile from "./pages/Profile";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

// Lazy load policy pages for better performance
const PrivacyPolicy = lazy(() => import("./pages/policies/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/policies/TermsOfService"));
const ReturnRefundPolicy = lazy(() => import("./pages/policies/ReturnRefundPolicy"));
const ShippingPolicy = lazy(() => import("./pages/policies/ShippingPolicy"));
const CancellationPolicy = lazy(() => import("./pages/policies/CancellationPolicy"));

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminShipping from "./pages/admin/AdminShipping";
import AdminAlerts from "./pages/admin/AdminAlerts";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";

// React Query client — ensures fresh data on navigation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes — data considered fresh
      gcTime: 1000 * 60 * 10, // 10 minutes — cached data removed after 10 minutes
      retry: 2, // Retry failed queries twice
      refetchOnWindowFocus: true, // Refetch stale queries when window regains focus
      refetchOnMount: true, // Always refetch when component mounts if data is stale
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteLoaderProvider>
              <ScrollToTop />
              <Routes>
                <Route element={<CustomerLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/orders/:id" element={<OrderDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/privacy-policy" element={<Suspense fallback={<GlobalLoader />}><PrivacyPolicy /></Suspense>} />
                  <Route path="/terms" element={<Suspense fallback={<GlobalLoader />}><TermsOfService /></Suspense>} />
                  <Route path="/return-refund" element={<Suspense fallback={<GlobalLoader />}><ReturnRefundPolicy /></Suspense>} />
                  <Route path="/shipping-policy" element={<Suspense fallback={<GlobalLoader />}><ShippingPolicy /></Suspense>} />
                  <Route path="/cancellation-policy" element={<Suspense fallback={<GlobalLoader />}><CancellationPolicy /></Suspense>} />
                </Route>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="alerts" element={<AdminAlerts />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/:orderNumber" element={<AdminOrderDetail />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="banners" element={<AdminBanners />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="shipping" element={<AdminShipping />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteLoaderProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
