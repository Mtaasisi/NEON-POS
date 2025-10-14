-- ============================================
-- UPDATE SALES DATES TO RECENT TIMESTAMPS
-- ============================================
-- This makes the reassigned sales appear in recent date filters
-- ============================================

ROLLBACK;

-- Show current date distribution
SELECT 
  sl.name as branch_name,
  COUNT(ls.id) as sales_count,
  MIN(ls.created_at) as oldest_sale,
  MAX(ls.created_at) as newest_sale,
  MAX(ls.created_at) > NOW() - INTERVAL '1 day' as has_recent_sales
FROM lats_sales ls
JOIN store_locations sl ON sl.id = ls.branch_id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name
ORDER BY sl.name;

-- Update ARUSHA sales to have recent dates (spread over last 7 hours)
WITH ranked_sales AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM lats_sales
  WHERE branch_id = (SELECT id FROM store_locations WHERE code = 'SADSAD')
)
UPDATE lats_sales 
SET created_at = NOW() - (INTERVAL '1 hour' * ranked_sales.rn),
    updated_at = NOW()
FROM ranked_sales
WHERE lats_sales.id = ranked_sales.id;

-- Update Airport Branch sales to have recent dates (spread over last 12 hours)
WITH ranked_sales AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM lats_sales
  WHERE branch_id = (SELECT id FROM store_locations WHERE code = 'APT-001')
)
UPDATE lats_sales 
SET created_at = NOW() - (INTERVAL '2 hours' * ranked_sales.rn),
    updated_at = NOW()
FROM ranked_sales
WHERE lats_sales.id = ranked_sales.id;

-- Update Main Store sales to have recent dates (spread over last 10 hours)
WITH ranked_sales AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM lats_sales
  WHERE branch_id = (SELECT id FROM store_locations WHERE code = 'MAIN-001')
)
UPDATE lats_sales 
SET created_at = NOW() - (INTERVAL '1.5 hours' * ranked_sales.rn),
    updated_at = NOW()
FROM ranked_sales
WHERE lats_sales.id = ranked_sales.id;

-- Verify new dates
SELECT 
  sl.name as branch_name,
  sl.code as branch_code,
  COUNT(ls.id) as sales_count,
  MIN(ls.created_at)::timestamp(0) as oldest_sale,
  MAX(ls.created_at)::timestamp(0) as newest_sale,
  COUNT(CASE WHEN ls.created_at > NOW() - INTERVAL '1 day' THEN 1 END) as sales_last_24h,
  COUNT(CASE WHEN ls.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as sales_last_7d
FROM lats_sales ls
JOIN store_locations sl ON sl.id = ls.branch_id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name, sl.code
ORDER BY sl.name;

-- Show sample sales with new dates
SELECT 
  sl.name as branch_name,
  ls.sale_number,
  ls.total_amount,
  ls.created_at::timestamp(0) as sale_time,
  NOW() - ls.created_at as age
FROM lats_sales ls
JOIN store_locations sl ON sl.id = ls.branch_id
WHERE sl.is_active = true
ORDER BY ls.created_at DESC
LIMIT 15;

-- ✅ DONE! Sales now have recent timestamps
-- Refresh your POS to see sales in "Last 1 day" filter

