
-- Fix 1: Replace permissive audit log INSERT with restricted policy
DROP POLICY IF EXISTS "Authenticated users can insert own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
-- Only the log_admin_action function (called server-side) should write audit logs.
-- No direct client INSERT allowed.

-- Fix 2: Create a view for product reviews that hides user_id
CREATE OR REPLACE VIEW public.public_product_reviews AS
SELECT 
  id,
  product_id,
  rating,
  description,
  user_name,
  created_at
FROM public.product_reviews;

-- Grant access to the view
GRANT SELECT ON public.public_product_reviews TO anon;
GRANT SELECT ON public.public_product_reviews TO authenticated;
