-- ====================================================================
-- FIX: STOCK TRANSFER BRANCH ISOLATION ISSUE
-- ====================================================================
-- Problem: Products from ARUSHA branch are visible in DAR branch's
--          stock transfer modal
-- 
-- Root Cause: Product variants likely have NULL or incorrect branch_id
--             values in the lats_product_variants table
-- ====================================================================

BEGIN;

-- Step 1: Check current state
SELECT '=== CURRENT BRANCH ASSIGNMENT STATUS ===' as section;

SELECT 
  CASE 
    WHEN branch_id IS NULL THEN 'NULL (No Branch)'
    ELSE sl.name
  END as branch_assignment,
  COUNT(*) as variant_count
FROM lats_product_variants pv
LEFT JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
GROUP BY pv.branch_id, sl.name
ORDER BY variant_count DESC;

-- Step 2: Find variants with NULL branch_id
SELECT '=== VARIANTS WITHOUT BRANCH ASSIGNMENT ===' as section;

SELECT 
  pv.id,
  p.name as product_name,
  pv.sku,
  pv.quantity,
  pv.branch_id
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
WHERE pv.branch_id IS NULL
  AND pv.quantity > 0
LIMIT 10;

-- ====================================================================
-- OPTION 1: If most products have NULL branch_id
-- ====================================================================
-- This happens when products were created without branch assignment
-- You need to manually assign them to branches

/*
-- Example: Assign all NULL branch_id products to DAR branch
UPDATE lats_product_variants
SET branch_id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea'::uuid
WHERE branch_id IS NULL;

-- Or assign to ARUSHA branch
UPDATE lats_product_variants
SET branch_id = (SELECT id FROM store_locations WHERE code = 'ARUSHA')
WHERE branch_id IS NULL;
*/

-- ====================================================================
-- OPTION 2: If products have wrong branch assignments
-- ====================================================================
-- Check if products were assigned to wrong branches

SELECT '=== CHECKING SPECIFIC PROBLEMATIC PRODUCTS ===' as section;

-- Check JBL products that user mentioned
SELECT 
  p.name as product_name,
  pv.sku,
  pv.quantity as stock,
  sl.code as current_branch,
  sl.name as branch_name
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN store_locations sl ON pv.branch_id = sl.id
WHERE p.name LIKE '%JBL%'
  AND pv.quantity > 0
ORDER BY p.name, sl.code;

-- ====================================================================
-- SOLUTION: Update Stock Transfer Query to Enforce Branch Filter
-- ====================================================================
-- The code in StockTransferPage.tsx line 847 already has:
-- .eq('branch_id', currentBranchId)
--
-- But if branch_id is NULL, the filter won't work properly.
-- We need to either:
-- 1. Fix the data by assigning proper branch_ids
-- 2. Or handle NULL values in the query

-- ====================================================================
-- RECOMMENDED FIX: Assign all products to their respective branches
-- ====================================================================

-- Get branch IDs
SELECT '=== AVAILABLE BRANCHES ===' as section;
SELECT id, code, name FROM store_locations WHERE is_active = true;

-- If you want to assign products manually, use statements like:
/*
-- Assign specific products to DAR
UPDATE lats_product_variants
SET branch_id = (SELECT id FROM store_locations WHERE code = 'DAR')
WHERE sku IN ('SKU-1760969748314-T8O-V01', 'SKU-1760971908583-C8A-V01');

-- Assign specific products to ARUSHA  
UPDATE lats_product_variants
SET branch_id = (SELECT id FROM store_locations WHERE code = 'ARUSHA')
WHERE sku IN ('SKU-1760970434733-KDB-V01', 'SKU-1760964118966-LUS-V01');
*/

-- ====================================================================
-- VERIFICATION: Check after fix
-- ====================================================================

SELECT '=== VERIFICATION: Products by Branch ===' as section;

SELECT 
  sl.code as branch,
  COUNT(DISTINCT pv.product_id) as unique_products,
  COUNT(pv.id) as total_variants,
  SUM(pv.quantity) as total_stock
FROM lats_product_variants pv
JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
GROUP BY sl.code
ORDER BY sl.code;

-- Verify DAR branch products
SELECT '=== DAR BRANCH PRODUCTS (Should be visible in DAR transfer) ===' as section;
SELECT 
  p.name,
  pv.sku,
  pv.quantity
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
WHERE pv.branch_id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea'::uuid
  AND pv.quantity > 0
LIMIT 10;

-- Verify ARUSHA branch products
SELECT '=== ARUSHA BRANCH PRODUCTS (Should NOT be visible in DAR transfer) ===' as section;
SELECT 
  p.name,
  pv.sku,
  pv.quantity
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
JOIN store_locations sl ON pv.branch_id = sl.id
WHERE sl.code = 'ARUSHA'
  AND pv.quantity > 0
LIMIT 10;

-- DO NOT COMMIT YET - Review the results first
ROLLBACK;

-- ====================================================================
-- TO APPLY THE FIX:
-- ====================================================================
-- 1. Run this script to understand the current state
-- 2. Uncomment the appropriate UPDATE statements based on your needs
-- 3. Change ROLLBACK to COMMIT
-- 4. Run the script again to apply changes
-- ====================================================================

