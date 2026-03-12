-- Backfill weight_kg from existing weight + unit data
UPDATE products
SET weight_kg = CASE
  WHEN unit = 'g' AND weight IS NOT NULL AND weight != '' THEN CAST(weight AS numeric) / 1000
  WHEN unit = 'kg' AND weight IS NOT NULL AND weight != '' THEN CAST(weight AS numeric)
  ELSE weight_kg
END
WHERE weight IS NOT NULL AND weight != '' AND weight_kg = 0;