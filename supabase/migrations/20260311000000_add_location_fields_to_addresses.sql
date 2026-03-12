-- Add missing location columns to the addresses table
ALTER TABLE addresses 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS display_name text;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
