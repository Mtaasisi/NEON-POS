-- ============================================
-- VERIFY COMPLETE BRANCH ISOLATION
-- ============================================
-- Run this to check if everything is properly isolated
-- ============================================

-- 1. Check Products
SELECT 
  '🛍️ PRODUCTS' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch,
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ ALL ASSIGNED'
    ELSE '❌ MISSING BRANCH'
  END as status
FROM lats_products;

-- 2. Check Variants
SELECT 
  '📦 VARIANTS' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch,
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ ALL ASSIGNED'
    ELSE '❌ MISSING BRANCH'
  END as status
FROM lats_product_variants;

-- 3. Check Inventory Items
SELECT 
  '📋 INVENTORY' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch,
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ ALL ASSIGNED'
    ELSE '❌ MISSING BRANCH'
  END as status
FROM inventory_items;

-- 4. Check Sales
SELECT 
  '💰 SALES' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch,
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ ALL ASSIGNED'
    ELSE '❌ MISSING BRANCH'
  END as status
FROM lats_sales;

-- 5. Check Purchase Orders
SELECT 
  '📦 PURCHASE ORDERS' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch,
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ ALL ASSIGNED'
    ELSE '❌ MISSING BRANCH'
  END as status
FROM lats_purchase_orders;

-- 6. Check Customers (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    RAISE NOTICE '📊 Checking customers...';
    PERFORM 1 FROM customers LIMIT 1;
  ELSE
    RAISE NOTICE '⚠️ customers table does not exist';
  END IF;
END $$;

-- 7. Show Data Distribution by Branch
SELECT 
  '📊 DATA DISTRIBUTION BY BRANCH' as report,
  sl.name as branch_name,
  (SELECT COUNT(*) FROM lats_products WHERE branch_id = sl.id) as products,
  (SELECT COUNT(*) FROM lats_product_variants WHERE branch_id = sl.id) as variants,
  (SELECT COUNT(*) FROM inventory_items WHERE branch_id = sl.id) as inventory,
  (SELECT COUNT(*) FROM lats_sales WHERE branch_id = sl.id) as sales,
  (SELECT COUNT(*) FROM lats_purchase_orders WHERE branch_id = sl.id) as purchase_orders
FROM store_locations sl
WHERE sl.is_active = true
ORDER BY sl.is_main DESC, sl.name;

-- 8. Check Sharing Modes
SELECT 
  '🔒 SHARING MODES' as feature,
  sharing_mode,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM lats_products), 2) as percentage
FROM lats_products
GROUP BY sharing_mode
ORDER BY count DESC;

-- 9. Find Shared Items
SELECT 
  '🌐 SHARED ITEMS' as report,
  COUNT(*) as shared_products,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ COMPLETE ISOLATION - No shared items'
    ELSE '⚠️ Some items are shared'
  END as isolation_status
FROM lats_products
WHERE is_shared = true OR sharing_mode = 'shared';

-- 10. Final Verification
SELECT 
  '✅ VERIFICATION COMPLETE!' as status,
  'Check results above' as message,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM lats_products WHERE branch_id IS NULL
    ) + (
      SELECT COUNT(*) FROM lats_sales WHERE branch_id IS NULL
    ) = 0 
    THEN '✅ ALL DATA HAS BRANCH ASSIGNMENTS'
    ELSE '❌ SOME DATA MISSING BRANCH ASSIGNMENTS - RUN FIXES!'
  END as final_status;

