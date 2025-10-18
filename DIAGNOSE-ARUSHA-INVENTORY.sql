-- ============================================================================
-- DIAGNOSE ARUSHA INVENTORY ISSUE
-- ============================================================================
-- Run this FIRST to see what's wrong with Arusha inventory
-- ============================================================================

-- ============================================================================
-- 1. Check if is_shared column exists
-- ============================================================================

SELECT 
  '📋 COLUMN CHECK' as section,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('lats_products', 'lats_product_variants')
  AND column_name IN ('is_shared', 'branch_id')
ORDER BY table_name, column_name;

-- ============================================================================
-- 2. Get branch IDs for reference
-- ============================================================================

SELECT 
  '🏪 BRANCHES' as section,
  id,
  name,
  code,
  city
FROM store_locations
WHERE is_active = true
ORDER BY name;

-- ============================================================================
-- 3. Check products by is_shared status
-- ============================================================================

SELECT 
  '📦 PRODUCTS BY SHARING STATUS' as section,
  is_shared,
  COUNT(*) as product_count
FROM lats_products
GROUP BY is_shared
ORDER BY is_shared;

-- ============================================================================
-- 4. Check products that have variants in multiple branches
-- ============================================================================

SELECT 
  '🔄 MULTI-BRANCH PRODUCTS' as section,
  p.id,
  p.name,
  p.sku,
  p.is_shared,
  COUNT(DISTINCT pv.branch_id) as branch_count,
  ARRAY_AGG(DISTINCT sl.name) as branches
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
LEFT JOIN store_locations sl ON sl.id = pv.branch_id
WHERE pv.branch_id IS NOT NULL
GROUP BY p.id, p.name, p.sku, p.is_shared
HAVING COUNT(DISTINCT pv.branch_id) > 1
ORDER BY branch_count DESC;

-- ============================================================================
-- 5. Check ARUSHA branch specifically
-- ============================================================================

-- Get ARUSHA branch ID
DO $$
DECLARE
  arusha_id UUID;
  arusha_name TEXT;
BEGIN
  -- Try to find ARUSHA branch
  SELECT id, name INTO arusha_id, arusha_name
  FROM store_locations
  WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
  LIMIT 1;
  
  IF arusha_id IS NULL THEN
    RAISE NOTICE '⚠️ Could not find ARUSHA branch!';
    RAISE NOTICE 'Available branches:';
  ELSE
    RAISE NOTICE '✅ Found ARUSHA branch:';
    RAISE NOTICE '   ID: %', arusha_id;
    RAISE NOTICE '   Name: %', arusha_name;
  END IF;
END $$;

-- ============================================================================
-- 6. Check what products ARUSHA should see with CURRENT query logic
-- ============================================================================

-- Replace 'ARUSHA_BRANCH_ID' with actual ARUSHA branch ID
WITH arusha_branch AS (
  SELECT id, name
  FROM store_locations
  WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
  LIMIT 1
)
SELECT 
  '📊 PRODUCTS VISIBLE TO ARUSHA (CURRENT LOGIC)' as section,
  p.id,
  p.name,
  p.sku,
  p.is_shared,
  p.branch_id,
  CASE 
    WHEN p.is_shared = true THEN '✅ Shared'
    WHEN p.branch_id = (SELECT id FROM arusha_branch) THEN '✅ Branch-specific'
    ELSE '❌ Not visible'
  END as visibility_status,
  (SELECT COUNT(*) FROM lats_product_variants pv 
   WHERE pv.product_id = p.id 
   AND pv.branch_id = (SELECT id FROM arusha_branch)) as arusha_variants
FROM lats_products p
WHERE p.is_shared = true 
   OR p.branch_id = (SELECT id FROM arusha_branch)
ORDER BY p.created_at DESC
LIMIT 20;

-- ============================================================================
-- 7. Check variants at ARUSHA
-- ============================================================================

WITH arusha_branch AS (
  SELECT id, name
  FROM store_locations
  WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
  LIMIT 1
)
SELECT 
  '📦 VARIANTS AT ARUSHA' as section,
  pv.id as variant_id,
  p.name as product_name,
  p.sku as product_sku,
  pv.variant_name,
  pv.quantity,
  pv.reserved_quantity,
  p.is_shared as product_is_shared,
  pv.is_shared as variant_is_shared
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE pv.branch_id = (SELECT id FROM arusha_branch)
ORDER BY pv.created_at DESC;

-- ============================================================================
-- 8. Check completed transfers TO ARUSHA
-- ============================================================================

WITH arusha_branch AS (
  SELECT id, name
  FROM store_locations
  WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
  LIMIT 1
)
SELECT 
  '🔄 COMPLETED TRANSFERS TO ARUSHA' as section,
  bt.id as transfer_id,
  bt.status,
  bt.quantity,
  bt.completed_at,
  from_branch.name as from_branch,
  to_branch.name as to_branch,
  p.name as product_name,
  p.is_shared as product_is_shared
FROM branch_transfers bt
JOIN store_locations from_branch ON from_branch.id = bt.from_branch_id
JOIN store_locations to_branch ON to_branch.id = bt.to_branch_id
LEFT JOIN lats_product_variants pv ON pv.id = bt.entity_id
LEFT JOIN lats_products p ON p.id = pv.product_id
WHERE bt.to_branch_id = (SELECT id FROM arusha_branch)
  AND bt.status = 'completed'
ORDER BY bt.completed_at DESC
LIMIT 10;

-- ============================================================================
-- 9. THE SMOKING GUN: Products with variants at ARUSHA but is_shared=false
-- ============================================================================

WITH arusha_branch AS (
  SELECT id, name
  FROM store_locations
  WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
  LIMIT 1
)
SELECT 
  '🔴 PROBLEM PRODUCTS (At ARUSHA but not shared)' as section,
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.is_shared,
  p.branch_id as product_branch_id,
  pv.id as variant_id,
  pv.quantity as arusha_stock,
  pv.branch_id as variant_branch_id,
  CASE 
    WHEN p.is_shared = false THEN '❌ Product not marked as shared - WONT SHOW IN ARUSHA!'
    ELSE '✅ Product is shared - should show'
  END as diagnosis
FROM lats_products p
JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE pv.branch_id = (SELECT id FROM arusha_branch)
  AND (p.is_shared = false OR p.is_shared IS NULL)
ORDER BY p.created_at DESC;

-- ============================================================================
-- 10. Summary
-- ============================================================================

DO $$
DECLARE
  arusha_id UUID;
  total_products INTEGER;
  shared_products INTEGER;
  arusha_variants INTEGER;
  problem_products INTEGER;
BEGIN
  -- Get ARUSHA branch ID
  SELECT id INTO arusha_id
  FROM store_locations
  WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
  LIMIT 1;
  
  IF arusha_id IS NULL THEN
    RAISE NOTICE '⚠️ ARUSHA branch not found!';
    RETURN;
  END IF;
  
  -- Get counts
  SELECT COUNT(*) INTO total_products FROM lats_products;
  SELECT COUNT(*) INTO shared_products FROM lats_products WHERE is_shared = true;
  SELECT COUNT(*) INTO arusha_variants FROM lats_product_variants WHERE branch_id = arusha_id;
  
  SELECT COUNT(*) INTO problem_products 
  FROM lats_products p
  JOIN lats_product_variants pv ON pv.product_id = p.id
  WHERE pv.branch_id = arusha_id
    AND (p.is_shared = false OR p.is_shared IS NULL);
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 ARUSHA INVENTORY DIAGNOSIS SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Total products in system: %', total_products;
  RAISE NOTICE 'Products marked as shared: %', shared_products;
  RAISE NOTICE 'Product variants at ARUSHA: %', arusha_variants;
  RAISE NOTICE '';
  IF problem_products > 0 THEN
    RAISE NOTICE '🔴 PROBLEM FOUND!';
    RAISE NOTICE '   % products have stock at ARUSHA but is_shared=false', problem_products;
    RAISE NOTICE '   These products WONT show in ARUSHA inventory!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 SOLUTION:';
    RAISE NOTICE '   Run the FIX-ARUSHA-INVENTORY-COMPLETE.sql script';
  ELSE
    RAISE NOTICE '✅ No obvious problems found!';
    RAISE NOTICE '   If inventory still empty, check:';
    RAISE NOTICE '   1. Browser console for errors';
    RAISE NOTICE '   2. Branch selection in frontend';
    RAISE NOTICE '   3. Frontend query logic';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

