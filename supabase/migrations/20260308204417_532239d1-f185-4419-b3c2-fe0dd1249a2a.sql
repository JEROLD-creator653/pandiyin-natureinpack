
-- Fix 1: Drop the overly permissive profile policy
DROP POLICY IF EXISTS "Anyone can view profile names" ON public.profiles;

-- Fix 3: Ensure RLS is enabled on gst_settings and invoices (idempotent)
ALTER TABLE public.gst_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
