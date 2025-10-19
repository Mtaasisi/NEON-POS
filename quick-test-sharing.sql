-- ============================================================================
-- 🚀 QUICK TEST: Is Data Sharing Working?
-- ============================================================================
-- Run this 30-second test to verify your data sharing toggles
-- ============================================================================

-- TEST 1: Do the columns exist?
SELECT 
  '✅ TEST 1: Checking if is_shared columns exist...' AS test;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_products' AND column_name = 'is_shared'
    ) THEN '✅ YES - is_shared column exists on lats_products'
    ELSE '❌ NO - Migration needed! Run: 🔧-FIX-DATA-SHARING-MIGRATION.sql'
  END AS result;

-- TEST 2: Do branches have isolation settings?
SELECT 
  '✅ TEST 2: Checking branch isolation settings...' AS test;

SELECT 
  name,
  data_isolation_mode,
  share_products,
  share_customers,
  CASE 
    WHEN data_isolation_mode = 'shared' THEN '✅ SHARED - All data shared'
    WHEN data_isolation_mode = 'isolated' THEN '✅ ISOLATED - No sharing'
    WHEN data_isolation_mode = 'hybrid' THEN '✅ HYBRID - Toggles control'
    ELSE '❌ INVALID - Check configuration'
  END AS status
FROM store_locations
ORDER BY name;

-- TEST 3: Cross-branch visibility test
SELECT 
  '✅ TEST 3: Testing cross-branch product visibility...' AS test;

-- Example: Can DAR branch see products from other branches?
SELECT 
  viewing_branch.name AS "Branch",
  COUNT(DISTINCT p.id) AS "Products They Can See",
  COUNT(DISTINCT CASE WHEN p.branch_id = viewing_branch.id THEN p.id END) AS "Their Own Products",
  COUNT(DISTINCT CASE WHEN p.branch_id != viewing_branch.id THEN p.id END) AS "Shared From Others",
  viewing_branch.data_isolation_mode AS "Isolation Mode"
FROM store_locations viewing_branch
CROSS JOIN lats_products p
LEFT JOIN store_locations product_branch ON p.branch_id = product_branch.id
WHERE 
  -- Viewing branch can see product if:
  viewing_branch.data_isolation_mode = 'shared'  -- Shared mode = see all
  OR p.branch_id = viewing_branch.id             -- It's their own product
  OR (p.is_shared = true AND product_branch.share_products = true)  -- Product is shared
GROUP BY viewing_branch.id, viewing_branch.name, viewing_branch.data_isolation_mode
ORDER BY viewing_branch.name;

-- TEST 4: Check for sync issues
SELECT 
  '✅ TEST 4: Checking for data sync issues...' AS test;

SELECT 
  COUNT(*) AS issues_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PERFECT - No sync issues'
    ELSE '⚠️ WARNING - ' || COUNT(*) || ' products need sync. Run sync_product_sharing()'
  END AS recommendation
FROM lats_products p
LEFT JOIN store_locations sl ON p.branch_id = sl.id
WHERE 
  -- Issue 1: Product is shared but shouldn't be
  (p.is_shared = true AND sl.share_products = false AND sl.data_isolation_mode != 'shared')
  OR
  -- Issue 2: Product isn't shared but should be
  (p.is_shared = false AND sl.share_products = true AND sl.data_isolation_mode != 'isolated');

-- ============================================================================
-- 🎯 FINAL VERDICT
-- ============================================================================
SELECT 
  '🎯 FINAL VERDICT' AS summary;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_products' AND column_name = 'is_shared'
    ) 
    AND EXISTS (
      SELECT 1 FROM store_locations WHERE data_isolation_mode IS NOT NULL
    )
    THEN '✅ SYSTEM IS CONFIGURED AND READY'
    ELSE '❌ SYSTEM NEEDS SETUP - See recommendations above'
  END AS overall_status;

-- ============================================================================
-- 📖 HOW TO READ RESULTS
-- ============================================================================
/*

TEST 1: 
  ✅ = Column exists, system is ready
  ❌ = Need to run migration

TEST 2:
  Shows each branch and their sharing settings
  - 'shared' = Everything shared (toggles ignored)
  - 'isolated' = Nothing shared (toggles ignored)
  - 'hybrid' = Individual toggles control sharing

TEST 3:
  Most important test! Shows what each branch can actually see
  - "Their Own Products" = Products created by this branch
  - "Shared From Others" = Products from other branches (only if shared)
  - If "Shared From Others" > 0, sharing is WORKING ✅

TEST 4:
  Checks if is_shared flags match branch settings
  - 0 issues = Perfect sync
  - > 0 issues = Need to run sync function

EXPECTED RESULTS:
✅ All tests pass
✅ Cross-branch visibility matches toggle settings
✅ No sync issues

*/

