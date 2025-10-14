-- ============================================
-- SIMPLE SALES REASSIGNMENT (STEP BY STEP)
-- ============================================
-- Run this if you're having transaction issues
-- Execute each section separately
-- ============================================

-- STEP 1: Clear any stuck transaction
ROLLBACK;

-- STEP 2: Check current distribution
SELECT 
  sl.name as branch_name,
  sl.code as branch_code,
  sl.id as branch_id,
  COUNT(ls.id) as sales_count
FROM store_locations sl
LEFT JOIN lats_sales ls ON ls.branch_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name, sl.code
ORDER BY sales_count DESC;

-- STEP 3: Get branch IDs (copy these for next steps)
SELECT 
  name,
  code,
  id as branch_id
FROM store_locations 
WHERE is_active = true
ORDER BY name;

-- STEP 4: Move 7 sales to ARUSHA
-- Replace 'YOUR_ARUSHA_ID' with the actual ARUSHA branch ID from Step 3
UPDATE lats_sales 
SET branch_id = (SELECT id FROM store_locations WHERE code = 'SADSAD'),
    updated_at = NOW()
WHERE id IN (
  SELECT id 
  FROM lats_sales 
  WHERE branch_id = (SELECT id FROM store_locations WHERE code = 'MAIN-001')
  ORDER BY created_at DESC
  OFFSET 7
  LIMIT 7
);

-- STEP 5: Move 6 sales to Airport Branch
UPDATE lats_sales 
SET branch_id = (SELECT id FROM store_locations WHERE code = 'APT-001'),
    updated_at = NOW()
WHERE id IN (
  SELECT id 
  FROM lats_sales 
  WHERE branch_id = (SELECT id FROM store_locations WHERE code = 'MAIN-001')
  ORDER BY created_at ASC
  LIMIT 6
);

-- STEP 6: Verify new distribution
SELECT 
  sl.name as branch_name,
  sl.code as branch_code,
  COUNT(ls.id) as sales_count,
  ROUND(SUM(ls.total_amount)::numeric, 2) as total_amount
FROM store_locations sl
LEFT JOIN lats_sales ls ON ls.branch_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name, sl.code
ORDER BY sales_count DESC;

-- STEP 7: View sample sales per branch
SELECT 
  sl.name as branch_name,
  ls.sale_number,
  ls.total_amount,
  ls.created_at::date as sale_date
FROM lats_sales ls
JOIN store_locations sl ON sl.id = ls.branch_id
WHERE sl.is_active = true
ORDER BY sl.name, ls.created_at DESC
LIMIT 20;

-- ✅ DONE! Refresh your POS application to see the changes.

