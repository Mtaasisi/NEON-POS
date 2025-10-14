-- ============================================
-- MOVE ALL SALES TO MAIN STORE
-- ============================================
-- Run this to move all sales back to Main Store
-- ============================================

-- STEP 1: Verify Main Store branch ID
SELECT 
  id,
  name,
  code,
  is_active
FROM store_locations
WHERE name = 'Main Store' OR code = 'MAIN-001'
LIMIT 1;

-- Expected ID: 24cd45b8-1ce1-486a-b055-29d169c3a8ea

-- STEP 2: Check current distribution BEFORE moving
SELECT 
  sl.name as branch_name,
  COUNT(ls.id) as sales_count
FROM store_locations sl
LEFT JOIN lats_sales ls ON ls.branch_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name
ORDER BY sales_count DESC;

-- STEP 3: Move ALL sales to Main Store
UPDATE lats_sales 
SET 
  branch_id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea',
  updated_at = NOW()
WHERE branch_id IS NULL 
   OR branch_id != '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

-- STEP 4: Verify the move
SELECT 
  sl.name as branch_name,
  COUNT(ls.id) as sales_count,
  ROUND(SUM(COALESCE(ls.total_amount, 0))::numeric, 2) as total_revenue
FROM store_locations sl
LEFT JOIN lats_sales ls ON ls.branch_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name
ORDER BY sales_count DESC;

-- STEP 5: Sample Main Store sales
SELECT 
  sale_number,
  total_amount,
  created_at::date as sale_date,
  branch_id
FROM lats_sales
WHERE branch_id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea'
ORDER BY created_at DESC
LIMIT 10;

-- ✅ DONE! All sales should now be in Main Store
-- Refresh your POS application to see the changes

