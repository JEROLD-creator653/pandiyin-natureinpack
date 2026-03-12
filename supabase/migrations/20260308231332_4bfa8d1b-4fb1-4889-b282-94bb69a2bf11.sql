
-- Drop the restrictive SELECT policy on product_reviews
DROP POLICY IF EXISTS "Authenticated users can view product reviews" ON public.product_reviews;

-- Create a PERMISSIVE SELECT policy so anyone (including anonymous) can view reviews
CREATE POLICY "Anyone can view product reviews"
ON public.product_reviews
FOR SELECT
TO public
USING (true);
