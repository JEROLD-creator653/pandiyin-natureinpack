import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STATE_ZONES, getChargedWeight, type ShippingZoneConfig } from '@/lib/deliveryCalculations';

export interface ShippingRegion {
  id: string;
  region_name: string;
  region_key: string;
  states: string[];
  base_charge: number;
  per_kg_rate: number;
  free_delivery_above: number | null;
  is_enabled: boolean;
  sort_order: number;
}

export function useShippingRegions() {
  const [regions, setRegions] = useState<ShippingRegion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('shipping_regions')
      .select('*')
      .order('sort_order');
    setRegions((data || []).map((r: any) => ({
      ...r,
      base_charge: Number(r.base_charge),
      per_kg_rate: Number(r.per_kg_rate || 0),
      free_delivery_above: r.free_delivery_above ? Number(r.free_delivery_above) : null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime: auto-refresh when shipping_regions change
  useEffect(() => {
    const channel = supabase
      .channel('shipping-regions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipping_regions' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /** Build a ShippingZoneConfig from the DB regions */
  const getZoneConfig = useCallback((): ShippingZoneConfig => {
    const config: ShippingZoneConfig = {
      local: { perKgRate: 40, freeAbove: 799 },
      nearby: { perKgRate: 70, freeAbove: null },
      rest_of_india: { perKgRate: 150, freeAbove: null },
    };
    regions.forEach(r => {
      if (r.region_key === 'local' && r.is_enabled) {
        config.local = { perKgRate: r.per_kg_rate || 40, freeAbove: r.free_delivery_above };
      } else if (r.region_key === 'nearby' && r.is_enabled) {
        config.nearby = { perKgRate: r.per_kg_rate || 70, freeAbove: r.free_delivery_above };
      } else if (r.region_key === 'rest_of_india' && r.is_enabled) {
        config.rest_of_india = { perKgRate: r.per_kg_rate || 150, freeAbove: r.free_delivery_above };
      }
    });
    return config;
  }, [regions]);

  /** Legacy compatibility - calculate delivery based on weight */
  const getDeliveryCharge = useCallback((state: string, subtotal: number, totalWeightKg: number = 1): number => {
    const zone = STATE_ZONES[state?.trim()];
    if (!zone) return 0;
    const config = getZoneConfig();
    const zoneConfig = config[zone as keyof ShippingZoneConfig];
    if (!zoneConfig) return 0;
    const chargedWeight = getChargedWeight(totalWeightKg);
    if (chargedWeight === 0) return 0;
    if (zoneConfig.freeAbove !== null && subtotal >= zoneConfig.freeAbove) return 0;
    return chargedWeight * zoneConfig.perKgRate;
  }, [getZoneConfig]);

  return { regions, loading, load, getDeliveryCharge, getZoneConfig };
}
