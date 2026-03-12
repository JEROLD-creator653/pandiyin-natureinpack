
-- Remove public access to product_reviews base table (user_id exposure)
-- The public_product_reviews view (without user_id) already exists for public reads
DROP POLICY IF EXISTS "Anyone can view product reviews" ON public.product_reviews;

-- Allow public reads only through the security-barrier view
CREATE POLICY "Authenticated users can view product reviews"
ON public.product_reviews
FOR SELECT
TO authenticated
USING (true);

-- Add input length constraints via validation trigger on orders.notes
CREATE OR REPLACE FUNCTION public.validate_order_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Sanitize notes field length
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 500 THEN
    NEW.notes := left(NEW.notes, 500);
  END IF;
  
  -- Sanitize coupon_code length
  IF NEW.coupon_code IS NOT NULL AND length(NEW.coupon_code) > 50 THEN
    RAISE EXCEPTION 'Invalid coupon code';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_fields
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_fields();

-- Add Puducherry to shipping_regions local zone if not already there
UPDATE public.shipping_regions
SET states = array_append(states, 'Puducherry')
WHERE region_key = 'local' 
  AND NOT ('Puducherry' = ANY(states));

UPDATE public.shipping_regions
SET states = array_append(states, 'Pondicherry')
WHERE region_key = 'local' 
  AND NOT ('Pondicherry' = ANY(states));
