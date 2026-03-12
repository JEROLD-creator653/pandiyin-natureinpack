import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StoreSettings {
  id: string;
  store_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  gst_enabled: boolean;
  gst_number: string | null;
}

const fetchStoreSettings = async (): Promise<StoreSettings | null> => {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as StoreSettings | null;
};

/**
 * Shared hook for store settings. Uses React Query so the data is
 * fetched once and shared across all components that need it
 * (WhatsApp button, Footer, Checkout, etc.).
 */
export function useStoreSettings() {
  return useQuery({
    queryKey: ['store_settings'],
    queryFn: fetchStoreSettings,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 60 * 60 * 1000,    // 1 hour
    refetchOnWindowFocus: true, // Refresh when user switches back to this tab
  });
}
