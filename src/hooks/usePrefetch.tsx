import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePrefetchProducts() {
  const queryClient = useQueryClient();

  const prefetchProducts = async () => {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ['products'],
      queryFn: async ({ pageParam = 0 }) => {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, image_url, categories(name)')
          .range(pageParam * 12, pageParam * 12 + 11)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      },
      initialPageParam: 0,
    });
  };

  return { prefetchProducts };
}

export function usePrefetchBanners() {
  const queryClient = useQueryClient();

  const prefetchBanners = async () => {
    await queryClient.prefetchQuery({
      queryKey: ['banners'],
      queryFn: async () => {
        const { data, error } = await (supabase as any)
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return data;
      },
    });
  };

  return { prefetchBanners };
}

export function usePrefetchCategories() {
  const queryClient = useQueryClient();

  const prefetchCategories = async () => {
    await queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: async () => {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });
        if (catError) throw catError;
        return catData;
      },
    });
  };

  return { prefetchCategories };
}

export function usePrefetchOnHover(callback: () => Promise<void>) {
  const handleMouseEnter = () => {
    callback();
  };

  return { onMouseEnter: handleMouseEnter };
}
