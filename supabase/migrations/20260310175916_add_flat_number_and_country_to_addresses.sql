-- Add missing columns to the addresses table
ALTER TABLE addresses 
ADD COLUMN IF NOT EXISTS country text DEFAULT 'India',
ADD COLUMN IF NOT EXISTS "flatNumber" text;
