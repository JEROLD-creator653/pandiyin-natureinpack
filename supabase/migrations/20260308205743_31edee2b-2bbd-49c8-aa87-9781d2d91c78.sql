
-- Fix the security definer view by making it security invoker
ALTER VIEW public.public_product_reviews SET (security_invoker = on);
