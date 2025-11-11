-- ================================================
-- ACTIVATE ALL SUPPLIERS AND SET DEFAULT
-- ================================================
-- This script ensures all suppliers are active
-- and sets the default value for is_active to true
-- ================================================

-- Update all existing suppliers to be active
UPDATE lats_suppliers
SET is_active = true
WHERE is_active IS NULL OR is_active = false;

-- Set default value for is_active column to true
ALTER TABLE lats_suppliers
ALTER COLUMN is_active SET DEFAULT true;

-- Ensure is_active is NOT NULL by setting default for null values
UPDATE lats_suppliers
SET is_active = true
WHERE is_active IS NULL;

-- Make is_active column NOT NULL (optional - uncomment if you want to enforce this)
-- ALTER TABLE lats_suppliers
-- ALTER COLUMN is_active SET NOT NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_suppliers,
  COUNT(*) FILTER (WHERE is_active = true) as active_suppliers,
  COUNT(*) FILTER (WHERE is_active = false OR is_active IS NULL) as inactive_suppliers
FROM lats_suppliers;

-- Show all suppliers (should all be active now)
SELECT 
  name,
  company_name,
  is_active,
  city,
  country
FROM lats_suppliers
ORDER BY name;

