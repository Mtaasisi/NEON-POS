-- ====================================================================
-- CHECK PRODUCT VARIANT BRANCH ASSIGNMENTS
-- This query checks which products belong to which branches
-- ====================================================================

-- Get all branches
SELECT '=== ALL BRANCHES ===' as section;
SELECT id, code, name, city
FROM store_locations
WHERE is_active = true
ORDER BY name;

SELECT '';
SELECT '=== PRODUCT VARIANTS BY BRANCH ===' as section;

-- Count variants by branch
SELECT 
  sl.code as branch_code,
  sl.name as branch_name,
  COUNT(pv.id) as variant_count,
  COUNT(DISTINCT pv.product_id) as unique_products
FROM lats_product_variants pv
LEFT JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
GROUP BY sl.code, sl.name
ORDER BY sl.code;

SELECT '';
SELECT '=== SAMPLE PRODUCTS FROM DAR BRANCH ===' as section;

-- Get sample products from DAR branch
SELECT 
  pv.id,
  pv.sku,
  p.name as product_name,
  pv.variant_name,
  pv.quantity,
  pv.branch_id,
  sl.code as branch_code,
  sl.name as branch_name
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
  AND sl.code = 'DAR'
ORDER BY p.name
LIMIT 10;

SELECT '';
SELECT '=== SAMPLE PRODUCTS FROM ARUSHA BRANCH ===' as section;

-- Get sample products from ARUSHA branch
SELECT 
  pv.id,
  pv.sku,
  p.name as product_name,
  pv.variant_name,
  pv.quantity,
  pv.branch_id,
  sl.code as branch_code,
  sl.name as branch_name
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
  AND sl.code = 'ARUSHA'
ORDER BY p.name
LIMIT 10;

SELECT '';
SELECT '=== CHECKING IF BRANCH_ID MATCHES CURRENT BRANCH (DAR) ===' as section;

-- Check if the displayed products are actually from DAR branch
SELECT 
  '24cd45b8-1ce1-486a-b055-29d169c3a8ea'::uuid as expected_dar_branch_id,
  (SELECT id FROM store_locations WHERE code = 'DAR') as actual_dar_branch_id,
  CASE 
    WHEN '24cd45b8-1ce1-486a-b055-29d169c3a8ea'::uuid = (SELECT id FROM store_locations WHERE code = 'DAR')
    THEN '✅ MATCH - Branch ID is correct'
    ELSE '❌ MISMATCH - Branch ID does not match DAR'
  END as status;

SELECT '';
SELECT '=== PRODUCTS THAT SHOULD BE VISIBLE IN DAR STOCK TRANSFER ===' as section;

-- This is what the query in StockTransferPage should return
SELECT 
  pv.id,
  p.name as product_name,
  pv.sku,
  pv.quantity,
  sl.code as branch_code
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.branch_id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea'::uuid
  AND pv.quantity > 0
ORDER BY p.name
LIMIT 20;

