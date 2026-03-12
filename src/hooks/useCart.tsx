import { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface CartProduct {
  id: string;
  name: string;
  price: number;
  compare_price: number | null;
  image_url: string;
  stock_quantity: number;
  weight_kg: number;
  gst_percentage: number;
  hsn_code: string;
  tax_inclusive: boolean;
  is_available: boolean;
  description: string | null;
  images: string[] | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: CartProduct;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  refetch: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Track previous prices to detect changes
  const prevPricesRef = useRef<Map<string, number>>(new Map());

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity, products(id, name, price, compare_price, image_url, stock_quantity, weight_kg, gst_percentage, hsn_code, tax_inclusive, is_available, description, images)')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || [])
        .map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: item.products,
        }))
        .filter((item: any) => item.product != null) as CartItem[];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30_000, // Refetch every 30s
  });

  // Realtime: auto-refresh cart + product queries when products table changes
  useEffect(() => {
    const channel = supabase
      .channel('product-changes-for-cart')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        // Invalidate all product-related queries
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Detect price changes and notify user
  useEffect(() => {
    if (items.length === 0) return;
    const prev = prevPricesRef.current;
    const changedProducts: string[] = [];

    items.forEach(item => {
      const oldPrice = prev.get(item.product_id);
      if (oldPrice !== undefined && oldPrice !== item.product.price) {
        changedProducts.push(item.product.name);
      }
    });

    // Update ref with current prices
    const newMap = new Map<string, number>();
    items.forEach(item => newMap.set(item.product_id, item.product.price));
    prevPricesRef.current = newMap;

    if (changedProducts.length > 0) {
      toast({
        title: 'Cart updated',
        description: 'Product prices have been updated. Your cart has been refreshed with the latest prices.',
      });
    }
  }, [items]);

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!user) throw new Error('Not logged in');
      // Fetch latest stock before adding
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity, is_available, price')
        .eq('id', productId)
        .maybeSingle();
      if (!product || !product.is_available) throw new Error('Product is no longer available');
      if (quantity > product.stock_quantity) throw new Error(`Only ${product.stock_quantity} available`);
      const { error } = await supabase.from('cart_items').upsert(
        { user_id: user.id, product_id: productId, quantity },
        { onConflict: 'user_id,product_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({ title: 'Added to cart!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not add to cart', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        await supabase.from('cart_items').delete().eq('id', itemId);
      } else {
        await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase.from('cart_items').delete().eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({ title: 'Removed from cart' });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from('cart_items').delete().eq('user_id', user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      total,
      loading: isLoading,
      refetch: () => refetch(),
      addToCart: (productId, quantity = 1) => {
        if (!user) {
          toast({
            title: 'Please sign in',
            description: 'You need to sign in to add items to cart',
            variant: 'destructive'
          });
          window.location.href = '/auth';
          return;
        }
        const existing = items.find(i => i.product_id === productId);
        const newQty = existing ? existing.quantity + quantity : quantity;
        addMutation.mutate({ productId, quantity: newQty });
      },
      updateQuantity: (itemId, quantity) => {
        const item = items.find(i => i.id === itemId);
        if (item && quantity > item.product.stock_quantity) {
          toast({ title: 'Stock limit reached', description: `Only ${item.product.stock_quantity} available`, variant: 'destructive' });
          return;
        }
        updateMutation.mutate({ itemId, quantity });
      },
      removeItem: (itemId) => removeMutation.mutate(itemId),
      clearCart: () => clearMutation.mutate(),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
