-- ====================================================================
-- FIX: Move products to correct branches
-- DAR should have 1 product, ARUSHA should have 96 products
-- ====================================================================

BEGIN;

-- Get branch IDs
SELECT '=== BRANCH IDs ===' as info;
SELECT id, code, name FROM store_locations WHERE code IN ('DAR-01', 'R-01');

-- Check current distribution
SELECT '=== BEFORE FIX ===' as info;
SELECT 
  COALESCE(sl.code, 'NULL') as branch,
  COUNT(*) as product_count
FROM lats_product_variants pv
LEFT JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
GROUP BY sl.code;

-- Show all DAR products so you can identify which ONE should stay
SELECT '=== ALL PRODUCTS CURRENTLY IN DAR ===' as info;
SELECT 
  pv.id,
  p.name as product_name,
  pv.sku,
  pv.quantity
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
JOIN store_locations sl ON pv.branch_id = sl.id
WHERE sl.code = 'DAR-01'
AND pv.quantity > 0
ORDER BY p.name;

-- ====================================================================
-- OPTION 1: If you know which product should stay in DAR
-- ====================================================================
-- Replace 'KEEP-THIS-SKU' with the actual SKU that should stay in DAR
-- Example: 'SKU-1760969748314-T8O-V01'

/*
-- Move all products EXCEPT one to ARUSHA
UPDATE lats_product_variants
SET branch_id = (SELECT id FROM store_locations WHERE code = 'R-01')
WHERE branch_id = (SELECT id FROM store_locations WHERE code = 'DAR-01')
AND sku != 'KEEP-THIS-SKU';  -- Replace with actual SKU to keep in DAR
*/

-- ====================================================================
-- OPTION 2: Move ALL products to ARUSHA, then move one back to DAR
-- ====================================================================

-- Step 1: Move ALL products from DAR to ARUSHA
UPDATE lats_product_variants
SET branch_id = (SELECT id FROM store_locations WHERE code = 'R-01')
WHERE branch_id = (SELECT id FROM store_locations WHERE code = 'DAR-01');

-- Step 2: Check the result
SELECT '=== AFTER MOVING ALL TO ARUSHA ===' as info;
SELECT 
  sl.code as branch,
  COUNT(*) as product_count
FROM lats_product_variants pv
JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
GROUP BY sl.code;

-- Step 3: Move ONE product back to DAR (uncomment and specify SKU)
/*
UPDATE lats_product_variants
SET branch_id = (SELECT id FROM store_locations WHERE code = 'DAR-01')
WHERE sku = 'SKU-OF-PRODUCT-FOR-DAR';  -- Replace with actual SKU
*/

-- Verify final distribution
SELECT '=== FINAL DISTRIBUTION ===' as info;
SELECT 
  sl.code as branch,
  COUNT(*) as product_count
FROM lats_product_variants pv
JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
GROUP BY sl.code;

-- Show products in each branch
SELECT '=== DAR PRODUCTS ===' as info;
SELECT p.name, pv.sku
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
WHERE pv.branch_id = (SELECT id FROM store_locations WHERE code = 'DAR-01')
AND pv.quantity > 0;

SELECT '=== ARUSHA PRODUCTS (showing first 10) ===' as info;
SELECT p.name, pv.sku
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
WHERE pv.branch_id = (SELECT id FROM store_locations WHERE code = 'R-01')
AND pv.quantity > 0
LIMIT 10;

COMMIT;

