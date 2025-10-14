-- ============================================
-- VERIFY BRANCH SYSTEM IS WORKING
-- Run this to check everything is set up correctly
-- ============================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 BRANCH SYSTEM VERIFICATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- 1. Check store_locations table exists
\echo ''
\echo '✅ CHECK 1: Store Locations Table'
SELECT 
  name as "Store Name",
  code as "Code",
  city as "City",
  CASE WHEN is_main THEN '⭐ Main' ELSE 'Branch' END as "Type",
  CASE WHEN is_active THEN '✅ Active' ELSE '❌ Inactive' END as "Status",
  data_isolation_mode as "Mode",
  CASE 
    WHEN share_products THEN '✓' ELSE '✗'
  END || ' Products | ' ||
  CASE 
    WHEN share_customers THEN '✓' ELSE '✗'
  END || ' Customers | ' ||
  CASE 
    WHEN share_inventory THEN '✓' ELSE '✗'
  END || ' Inventory' as "Sharing"
FROM store_locations
ORDER BY is_main DESC, name;

-- 2. Check branch columns in products table
\echo ''
\echo '✅ CHECK 2: Products Table Has Branch Support'
SELECT 
  COUNT(*) as "Total Products",
  COUNT(*) FILTER (WHERE branch_id IS NOT NULL) as "Branch-Specific",
  COUNT(*) FILTER (WHERE is_shared = true) as "Shared Products",
  COUNT(*) FILTER (WHERE branch_id IS NULL AND is_shared IS NULL) as "Unassigned"
FROM lats_products;

-- 3. Check customers table
\echo ''
\echo '✅ CHECK 3: Customers Table Has Branch Support'
SELECT 
  COUNT(*) as "Total Customers",
  COUNT(*) FILTER (WHERE branch_id IS NOT NULL) as "Branch-Specific",
  COUNT(*) FILTER (WHERE is_shared = true) as "Shared Customers"
FROM customers;

-- 4. Check sales by branch
\echo ''
\echo '✅ CHECK 4: Sales by Branch'
SELECT 
  COALESCE(sl.name, 'No Branch Assigned') as "Branch",
  COUNT(ls.id) as "Sales Count",
  COALESCE(SUM(ls.total_amount), 0) as "Total Revenue"
FROM lats_sales ls
LEFT JOIN store_locations sl ON ls.branch_id = sl.id
GROUP BY sl.name
ORDER BY "Sales Count" DESC;

-- 5. Check branch transfer system
\echo ''
\echo '✅ CHECK 5: Branch Transfer System'
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'branch_transfers'
) as "Transfers Table Exists";

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'user_branch_assignments'
) as "User Assignments Table Exists";

-- 6. Check helper functions
\echo ''
\echo '✅ CHECK 6: Helper Functions'
SELECT 
  routine_name as "Function Name",
  'EXISTS ✓' as "Status"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_user_current_branch',
  'can_user_access_branch',
  'is_data_shared'
)
ORDER BY routine_name;

-- 7. Check views
\echo ''
\echo '✅ CHECK 7: Branch Views'
SELECT 
  table_name as "View Name",
  'EXISTS ✓' as "Status"
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'branch_accessible_products',
  'branch_accessible_customers'
)
ORDER BY table_name;

-- 8. Sample branch data access
\echo ''
\echo '✅ CHECK 8: Sample Products by Branch (Top 5)'
SELECT 
  p.name as "Product",
  COALESCE(sl.name, 'All Branches') as "Branch",
  CASE WHEN p.is_shared THEN '🌐 Shared' ELSE '🔒 Private' END as "Sharing"
FROM lats_products p
LEFT JOIN store_locations sl ON p.branch_id = sl.id
LIMIT 5;

-- Final Summary
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 VERIFICATION SUMMARY'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  '✅ Store Locations: ' || COUNT(*) || ' branches configured' as "Status"
FROM store_locations;

SELECT 
  '✅ Products: ' || COUNT(*) || ' products in database' as "Status"
FROM lats_products;

SELECT 
  '✅ Sales: ' || COUNT(*) || ' sales recorded' as "Status"
FROM lats_sales;

SELECT 
  '✅ Transfers: ' || COUNT(*) || ' transfers' as "Status"
FROM branch_transfers;

\echo ''
\echo '🎯 NEXT STEPS:'
\echo '1. Login to app as care@care.com'
\echo '2. Look for branch selector in top-right'
\echo '3. Click to switch between branches'
\echo '4. Test sales recording to correct branch'
\echo '5. Verify data isolation modes work'
\echo ''
\echo '✨ System verification complete!'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

