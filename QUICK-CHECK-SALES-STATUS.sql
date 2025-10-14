-- ============================================
-- QUICK CHECK: Sales Status
-- ============================================
-- Run this to quickly see your current situation
-- ============================================

-- 1️⃣ QUICK SUMMARY: How many sales per branch?
SELECT 
  COALESCE(sl.name, '⚠️ UNASSIGNED') as branch_name,
  COUNT(ls.id) as sales_count,
  ROUND(SUM(COALESCE(ls.total_amount, 0))::numeric, 2) as total_revenue
FROM lats_sales ls
LEFT JOIN store_locations sl ON sl.id = ls.branch_id
GROUP BY sl.name
ORDER BY sales_count DESC;

-- 2️⃣ MAIN STORE STATUS: What's in Main Store?
SELECT 
  'Main Store Status' as info,
  COUNT(*) as sales_in_main_store,
  ROUND(SUM(COALESCE(total_amount, 0))::numeric, 2) as main_store_revenue
FROM lats_sales
WHERE branch_id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

-- 3️⃣ RECENT SALES: Last 10 sales with branch info
SELECT 
  ls.sale_number,
  ROUND(ls.total_amount::numeric, 2) as amount,
  COALESCE(sl.name, '⚠️ UNASSIGNED') as branch,
  ls.created_at::timestamp::date as date,
  LEFT(ls.created_at::timestamp::time::text, 8) as time
FROM lats_sales ls
LEFT JOIN store_locations sl ON sl.id = ls.branch_id
ORDER BY ls.created_at DESC
LIMIT 10;

-- 4️⃣ BRANCH LIST: All active branches
SELECT 
  name,
  code,
  id as branch_id,
  CASE 
    WHEN id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea' THEN '✅ MAIN STORE'
    ELSE '📍 Branch'
  END as type
FROM store_locations
WHERE is_active = true
ORDER BY name;

-- ============================================
-- 💡 INTERPRETATION:
-- ============================================
-- If Main Store shows 0 sales → That's why you see "SALES RETURNED: 0"
-- If ARUSHA/Airport show sales → Switch to those branches to see them
-- If many sales are UNASSIGNED → Run migration to assign them
-- ============================================

