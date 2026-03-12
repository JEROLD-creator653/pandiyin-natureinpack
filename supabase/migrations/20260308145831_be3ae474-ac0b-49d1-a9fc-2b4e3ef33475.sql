
-- Add weight_kg column (shipping weight in kilograms) to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_kg numeric NOT NULL DEFAULT 0;

-- Add per_kg_rate column to shipping_regions for weight-based pricing
ALTER TABLE public.shipping_regions ADD COLUMN IF NOT EXISTS per_kg_rate numeric NOT NULL DEFAULT 0;

-- Update existing shipping regions with the per-kg rates
UPDATE public.shipping_regions SET per_kg_rate = 40 WHERE region_key = 'local';
UPDATE public.shipping_regions SET per_kg_rate = 150 WHERE region_key = 'rest_of_india';

-- Add a new "nearby" region for Kerala, Karnataka, Andhra Pradesh, Telangana
INSERT INTO public.shipping_regions (region_name, region_key, states, base_charge, free_delivery_above, per_kg_rate, is_enabled, sort_order, gst_type)
VALUES ('Nearby States', 'nearby', ARRAY['Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana'], 0, NULL, 70, true, 1, 'IGST')
ON CONFLICT DO NOTHING;

-- Update sort orders
UPDATE public.shipping_regions SET sort_order = 0 WHERE region_key = 'local';
UPDATE public.shipping_regions SET sort_order = 1 WHERE region_key = 'nearby';
UPDATE public.shipping_regions SET sort_order = 2 WHERE region_key = 'rest_of_india';
UPDATE public.shipping_regions SET sort_order = 3 WHERE region_key = 'international';
