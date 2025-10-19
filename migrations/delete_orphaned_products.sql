-- ================================================================================
-- DELETE ORPHANED PRODUCTS (Products with non-existent branch IDs)
-- ================================================================================
-- This will delete all products that are assigned to branches that don't exist
-- in the lats_store_locations table
-- ================================================================================

BEGIN;

-- Show what will be deleted
SELECT 
  '🔍 ORPHANED PRODUCTS FOUND' as status,
  p.branch_id,
  COUNT(*) as product_count
FROM lats_products p
LEFT JOIN lats_store_locations l ON p.branch_id = l.id
WHERE l.id IS NULL
GROUP BY p.branch_id;

-- Count variants to be deleted
SELECT 
  '🔍 ORPHANED VARIANTS FOUND' as status,
  COUNT(*) as variant_count
FROM lats_product_variants v
LEFT JOIN lats_store_locations l ON v.branch_id = l.id
WHERE l.id IS NULL;

-- Step 1: Delete branch transfers that reference orphaned variants
DELETE FROM branch_transfers
WHERE entity_type = 'variant'
AND entity_id IN (
  SELECT v.id
  FROM lats_product_variants v
  LEFT JOIN lats_store_locations l ON v.branch_id = l.id
  WHERE l.id IS NULL
);

-- Step 2: Delete orphaned variants
DELETE FROM lats_product_variants
WHERE branch_id IN (
  SELECT DISTINCT v.branch_id
  FROM lats_product_variants v
  LEFT JOIN lats_store_locations l ON v.branch_id = l.id
  WHERE l.id IS NULL
);

-- Delete orphaned products
DELETE FROM lats_products
WHERE branch_id IN (
  SELECT DISTINCT p.branch_id
  FROM lats_products p
  LEFT JOIN lats_store_locations l ON p.branch_id = l.id
  WHERE l.id IS NULL
);

COMMIT;

-- Verify deletion
SELECT 
  '✅ DELETION COMPLETE' as status,
  COUNT(*) as remaining_orphaned_products
FROM lats_products p
LEFT JOIN lats_store_locations l ON p.branch_id = l.id
WHERE l.id IS NULL;

SELECT 
  '📊 PRODUCTS BY BRANCH (After Cleanup)' as status,
  COALESCE(l.name, 'NO BRANCH') as branch_name,
  COUNT(p.id) as product_count
FROM lats_products p
LEFT JOIN lats_store_locations l ON p.branch_id = l.id
GROUP BY l.name;

