-- =====================================================
-- FIX: Product Insert Issue - Foreign Key Constraint
-- =====================================================
-- Problem: lats_products.branch_id references store_locations.id
-- But some products might be trying to use branch IDs that don't exist
-- in store_locations (they exist in lats_branches but not store_locations)
-- =====================================================

-- SOLUTION 1: Make branch_id nullable (allow products without branch assignment)
-- This is the safest approach if branches are optional

ALTER TABLE lats_products 
ALTER COLUMN branch_id DROP NOT NULL;

COMMENT ON COLUMN lats_products.branch_id IS 
'Optional reference to store_locations. NULL means product is available to all branches.';

-- SOLUTION 2: Sync missing branches from lats_branches to store_locations
-- This ensures all branch IDs in lats_branches also exist in store_locations

INSERT INTO store_locations (
  id,
  name,
  code,
  city,
  address,
  phone,
  is_main,
  is_active,
  data_isolation_mode,
  share_products,
  share_customers,
  share_inventory,
  created_at,
  updated_at
)
SELECT 
  lb.id,
  lb.name,
  UPPER(LEFT(lb.name, 3)) as code,
  NULL as city,
  NULL as address,
  NULL as phone,
  CASE WHEN lb.id = '00000000-0000-0000-0000-000000000001' THEN true ELSE false END as is_main,
  lb.is_active,
  'isolated' as data_isolation_mode,
  false as share_products,
  false as share_customers,
  false as share_inventory,
  lb.created_at,
  lb.updated_at
FROM lats_branches lb
WHERE NOT EXISTS (
  SELECT 1 FROM store_locations sl WHERE sl.id = lb.id
);

-- SOLUTION 3: Update existing products with invalid branch_id to NULL
-- This fixes any existing data issues

UPDATE lats_products
SET branch_id = NULL
WHERE branch_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM store_locations WHERE id = lats_products.branch_id
  );

-- Verify the fix
SELECT 
  'Products with valid branch_id' as status,
  COUNT(*) as count
FROM lats_products
WHERE branch_id IS NOT NULL
UNION ALL
SELECT 
  'Products with NULL branch_id' as status,
  COUNT(*) as count
FROM lats_products
WHERE branch_id IS NULL
UNION ALL
SELECT 
  'Total products' as status,
  COUNT(*) as count
FROM lats_products;

-- Show all available branches
SELECT 
  id,
  name,
  is_main,
  is_active
FROM store_locations
ORDER BY is_main DESC, name;

