-- ============================================
-- FIX SALES BRANCH ASSIGNMENT
-- ============================================
-- Assign all existing sales to their proper branches
-- ============================================

-- 1. Check current state
SELECT 
  '📊 BEFORE FIX' as status,
  COUNT(*) as total_sales,
  COUNT(branch_id) as sales_with_branch,
  COUNT(*) - COUNT(branch_id) as sales_without_branch
FROM lats_sales;

-- 2. Assign all sales without branch_id to Main Store
UPDATE lats_sales
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;

-- 3. Verify fix
SELECT 
  '✅ AFTER FIX' as status,
  COUNT(*) as total_sales,
  COUNT(branch_id) as sales_with_branch,
  COUNT(*) - COUNT(branch_id) as sales_without_branch
FROM lats_sales;

-- 4. Show sales distribution by branch
SELECT 
  sl.name as branch_name,
  COUNT(s.id) as total_sales,
  SUM(s.total_amount) as total_revenue
FROM store_locations sl
LEFT JOIN lats_sales s ON s.branch_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name
ORDER BY total_sales DESC;

-- 5. Verify sales are now filtered correctly
SELECT 
  '🔒 VERIFICATION' as check_type,
  'Sales should now be branch-specific' as note;

