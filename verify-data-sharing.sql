-- ============================================================================
-- 🔍 VERIFY DATA SHARING TOGGLE STATUS
-- ============================================================================
-- Run this to check if your data sharing is working correctly
-- Date: October 19, 2025
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if is_shared columns exist
-- ============================================================================
SELECT 
  '🔍 Checking if is_shared columns exist...' AS status;

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE column_name = 'is_shared'
  AND table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- STEP 2: Check branch isolation settings
-- ============================================================================
SELECT 
  '📋 Branch Isolation Settings' AS status;

SELECT 
  id,
  name,
  data_isolation_mode,
  share_products,
  share_customers,
  share_inventory,
  share_suppliers,
  share_categories,
  share_employees,
  CASE 
    WHEN data_isolation_mode = 'shared' THEN '🌐 All data shared'
    WHEN data_isolation_mode = 'isolated' THEN '🔒 All data isolated'
    WHEN data_isolation_mode = 'hybrid' THEN '⚖️ Individual toggles control'
    ELSE '❓ Unknown mode'
  END AS description
FROM store_locations
ORDER BY name;

-- ============================================================================
-- STEP 3: Check products sharing status
-- ============================================================================
SELECT 
  '📦 Products Sharing Status' AS status;

SELECT 
  sl.name AS branch_name,
  COUNT(p.id) AS total_products,
  COUNT(CASE WHEN p.is_shared = true THEN 1 END) AS shared_products,
  COUNT(CASE WHEN p.is_shared = false OR p.is_shared IS NULL THEN 1 END) AS private_products,
  sl.share_products AS branch_shares_products
FROM store_locations sl
LEFT JOIN lats_products p ON p.branch_id = sl.id
GROUP BY sl.id, sl.name, sl.share_products
ORDER BY sl.name;

-- ============================================================================
-- STEP 4: Test cross-branch visibility (Example)
-- ============================================================================
SELECT 
  '🔬 Cross-Branch Visibility Test' AS status;

-- Show which products each branch can see
WITH branch_products AS (
  SELECT 
    p.id,
    p.name AS product_name,
    owner.name AS owner_branch,
    p.is_shared,
    owner.share_products AS owner_sharing_enabled
  FROM lats_products p
  JOIN store_locations owner ON p.branch_id = owner.id
)
SELECT 
  viewer.name AS viewing_branch,
  viewer.data_isolation_mode,
  COUNT(bp.id) AS visible_products,
  STRING_AGG(bp.product_name, ', ' ORDER BY bp.product_name) AS sample_products
FROM store_locations viewer
CROSS JOIN branch_products bp
WHERE 
  -- Branch can see product if:
  (viewer.data_isolation_mode = 'shared') OR  -- Shared mode sees all
  (bp.owner_branch = viewer.name) OR          -- It's their own product
  (bp.is_shared = true)                        -- Product is marked as shared
GROUP BY viewer.id, viewer.name, viewer.data_isolation_mode
ORDER BY viewer.name;

-- ============================================================================
-- STEP 5: Check for data integrity issues
-- ============================================================================
SELECT 
  '⚠️ Data Integrity Check' AS status;

-- Products with is_shared = true but branch has share_products = false
SELECT 
  'Products marked as shared but branch sharing is OFF' AS issue_type,
  COUNT(*) AS affected_count
FROM lats_products p
JOIN store_locations sl ON p.branch_id = sl.id
WHERE p.is_shared = true 
  AND sl.share_products = false
  AND sl.data_isolation_mode != 'shared';

-- Products with is_shared = false but branch has share_products = true
SELECT 
  'Products NOT marked as shared but branch sharing is ON' AS issue_type,
  COUNT(*) AS affected_count
FROM lats_products p
JOIN store_locations sl ON p.branch_id = sl.id
WHERE (p.is_shared = false OR p.is_shared IS NULL)
  AND sl.share_products = true
  AND sl.data_isolation_mode != 'isolated';

-- ============================================================================
-- STEP 6: Summary Report
-- ============================================================================
SELECT 
  '📊 SUMMARY REPORT' AS status;

SELECT 
  '✅ System Status' AS metric,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lats_products' 
                 AND column_name = 'is_shared') 
    THEN '✅ CONFIGURED'
    ELSE '❌ NOT CONFIGURED'
  END AS value
UNION ALL
SELECT 
  'Total Branches' AS metric,
  COUNT(*)::text AS value
FROM store_locations
UNION ALL
SELECT 
  'Shared Mode Branches' AS metric,
  COUNT(*)::text AS value
FROM store_locations
WHERE data_isolation_mode = 'shared'
UNION ALL
SELECT 
  'Isolated Mode Branches' AS metric,
  COUNT(*)::text AS value
FROM store_locations
WHERE data_isolation_mode = 'isolated'
UNION ALL
SELECT 
  'Hybrid Mode Branches' AS metric,
  COUNT(*)::text AS value
FROM store_locations
WHERE data_isolation_mode = 'hybrid'
UNION ALL
SELECT 
  'Branches Sharing Products' AS metric,
  COUNT(*)::text AS value
FROM store_locations
WHERE share_products = true;

-- ============================================================================
-- 🎯 INTERPRETATION GUIDE
-- ============================================================================
/*
HOW TO READ THE RESULTS:

1. STEP 1 (is_shared columns):
   ✅ Should show: lats_products, lats_product_variants, customers, etc.
   ❌ If empty: The SQL migration hasn't been run yet

2. STEP 2 (Branch settings):
   - Look at data_isolation_mode and individual share_* columns
   - 'shared' = Everything ON
   - 'isolated' = Everything OFF
   - 'hybrid' = Individual toggles control

3. STEP 3 (Products status):
   - Shows how many products each branch has
   - Shows how many are shared vs private

4. STEP 4 (Cross-branch visibility):
   - Shows which products each branch can actually see
   - This is the REAL TEST of whether sharing works

5. STEP 5 (Data integrity):
   - Should show 0 for both issues
   - If > 0, there's a sync problem

EXPECTED RESULTS FOR WORKING SYSTEM:
- is_shared column exists ✅
- Branches have correct isolation mode ✅
- Cross-branch visibility matches toggle settings ✅
- No data integrity issues (count = 0) ✅

*/

