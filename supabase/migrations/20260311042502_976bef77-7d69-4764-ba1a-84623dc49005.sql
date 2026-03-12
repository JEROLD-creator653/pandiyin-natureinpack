ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_id text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name text DEFAULT '';