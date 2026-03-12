
-- Create a security definer function to get reviewer names
-- This allows anyone to see reviewer names without needing SELECT on profiles
CREATE OR REPLACE FUNCTION public.get_review_user_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(full_name, ''),
    'Customer'
  )
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;
