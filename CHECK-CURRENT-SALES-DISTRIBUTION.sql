-- ============================================
-- CHECK CURRENT SALES DISTRIBUTION
-- ============================================
-- Run this to see where your sales are actually assigned

-- 1. Show all branches and their sales count
SELECT 
  sl.name as branch_name,
  sl.code as branch_code,
  sl.id as branch_id,
  COUNT(ls.id) as sales_count,
  ROUND(SUM(COALESCE(ls.total_amount, 0))::numeric, 2) as total_revenue
FROM store_locations sl
LEFT JOIN lats_sales ls ON ls.branch_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name, sl.code
ORDER BY sales_count DESC;

-- 2. Show sales with NULL branch_id (unassigned sales)
SELECT 
  COUNT(*) as unassigned_sales_count,
  ROUND(SUM(COALESCE(total_amount, 0))::numeric, 2) as unassigned_revenue
FROM lats_sales
WHERE branch_id IS NULL;

-- 3. Show recent sales with their branch assignments
SELECT 
  ls.sale_number,
  ls.total_amount,
  sl.name as branch_name,
  sl.code as branch_code,
  ls.branch_id,
  ls.created_at::date as sale_date
FROM lats_sales ls
LEFT JOIN store_locations sl ON sl.id = ls.branch_id
ORDER BY ls.created_at DESC
LIMIT 25;

-- 4. Main Store specific check
SELECT 
  COUNT(*) as main_store_sales,
  ROUND(SUM(COALESCE(total_amount, 0))::numeric, 2) as main_store_revenue
FROM lats_sales
WHERE branch_id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

-- ✅ This will show you exactly where your sales are distributed

