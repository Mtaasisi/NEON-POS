-- ================================================
-- VERIFY PRODUCT SHARING CONFIGURATION
-- ================================================
-- This script verifies that the product sharing configuration
-- has been applied correctly to all branches.
-- ================================================
-- 
-- Expected Configuration:
-- - share_products = true   (Shared catalog)
-- - share_inventory = false (Isolated stock)
-- ================================================

-- ================================================
-- CHECK 1: All Active Branches Configuration
-- ================================================

SELECT 
  '📊 Branch Configuration Status' as check_name,
  id,
  name,
  code,
  data_isolation_mode,
  share_products,
  share_inventory,
  is_active,
  CASE 
    WHEN share_products = true AND share_inventory = false THEN '✅ CORRECT'
    WHEN share_products IS NULL OR share_inventory IS NULL THEN '⚠️  MISSING VALUES'
    WHEN share_products = false THEN '❌ PRODUCTS NOT SHARED'
    WHEN share_inventory = true THEN '❌ INVENTORY NOT ISOLATED'
    ELSE '❌ INCORRECT'
  END as status
FROM store_locations
WHERE is_active = true
ORDER BY name;

-- ================================================
-- CHECK 2: Summary Statistics
-- ================================================

SELECT 
  '📈 Configuration Summary' as check_name,
  COUNT(*) as total_active_branches,
  COUNT(*) FILTER (WHERE share_products = true) as branches_with_shared_products,
  COUNT(*) FILTER (WHERE share_inventory = false) as branches_with_isolated_inventory,
  COUNT(*) FILTER (WHERE share_products = true AND share_inventory = false) as correctly_configured,
  COUNT(*) FILTER (WHERE share_products IS NULL OR share_inventory IS NULL) as missing_values,
  COUNT(*) FILTER (WHERE share_products = false) as products_not_shared,
  COUNT(*) FILTER (WHERE share_inventory = true) as inventory_not_isolated
FROM store_locations
WHERE is_active = true;

-- ================================================
-- CHECK 3: Products Distribution
-- ================================================

SELECT 
  '📦 Products by Branch' as check_name,
  COALESCE(branch_id::TEXT, 'NULL') as branch_id,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE is_active = true) as active_products,
  COUNT(*) FILTER (WHERE is_shared = true) as shared_products
FROM lats_products
GROUP BY branch_id
ORDER BY total_products DESC;

-- ================================================
-- CHECK 4: Variants Distribution (Inventory)
-- ================================================

SELECT 
  '📦 Variants by Branch (Inventory)' as check_name,
  COALESCE(branch_id::TEXT, 'NULL') as branch_id,
  COUNT(*) as total_variants,
  COUNT(*) FILTER (WHERE is_active = true) as active_variants,
  SUM(quantity) as total_stock,
  COUNT(*) FILTER (WHERE is_shared = true) as shared_variants
FROM lats_product_variants
GROUP BY branch_id
ORDER BY total_stock DESC;

-- ================================================
-- CHECK 5: Configuration Compliance
-- ================================================

SELECT 
  '✅ Configuration Compliance Check' as check_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE share_products = true AND share_inventory = false) = COUNT(*) 
    THEN '✅ ALL BRANCHES CORRECTLY CONFIGURED'
    ELSE '❌ SOME BRANCHES NEED FIXING'
  END as compliance_status,
  COUNT(*) FILTER (WHERE share_products = true AND share_inventory = false) as correctly_configured,
  COUNT(*) as total_branches
FROM store_locations
WHERE is_active = true;

-- ================================================
-- EXPECTED RESULTS
-- ================================================
-- 
-- ✅ All active branches should show:
--    - share_products = true
--    - share_inventory = false
-- 
-- ✅ Configuration Summary should show:
--    - correctly_configured = total_active_branches
--    - missing_values = 0
--    - products_not_shared = 0
--    - inventory_not_isolated = 0
-- 
-- ✅ Compliance Check should show:
--    - "ALL BRANCHES CORRECTLY CONFIGURED"
-- 
-- ================================================
