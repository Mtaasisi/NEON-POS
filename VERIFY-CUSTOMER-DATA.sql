-- ================================================================================
-- VERIFICATION SCRIPT: Check Customer Data Quality
-- ================================================================================
-- Run this BEFORE and AFTER applying fixes to compare results
-- This helps verify that the fix worked correctly
-- ================================================================================

SELECT '========================================' as divider;
SELECT '  CUSTOMER DATA VERIFICATION REPORT' as title;
SELECT '  Sale: SALE-77358826-03CI' as sale;
SELECT '  Customer: Samuel masika' as customer;
SELECT '========================================' as divider;
SELECT '' as space;

-- ================================================================================
-- 1. CUSTOMER PROFILE CHECK
-- ================================================================================

SELECT '📋 CUSTOMER PROFILE' as section;
SELECT '' as space;

SELECT 
  '👤 Name: ' || name as info,
  '📞 Phone: ' || phone as contact,
  '📍 Location: ' || COALESCE(city, 'Not set') as location,
  '📅 Joined: ' || TO_CHAR(COALESCE(joined_date, created_at), 'DD Mon YYYY') as joined,
  '🔄 Last Visit: ' || TO_CHAR(last_visit, 'DD Mon YYYY, HH24:MI') as last_visit
FROM customers
WHERE phone = '+255712378850' OR name ILIKE '%Samuel masika%'
LIMIT 1;

SELECT '' as space;

-- ================================================================================
-- 2. FINANCIAL DATA CHECK
-- ================================================================================

SELECT '💰 FINANCIAL DATA' as section;
SELECT '' as space;

SELECT 
  'Total Spent (Recorded): TSh ' || TO_CHAR(total_spent, 'FM999,999,999,990') as recorded_total,
  'Loyalty Points: ' || points as points,
  'Loyalty Level: ' || UPPER(loyalty_level) as level,
  CASE 
    WHEN total_spent > 1000000000 THEN '❌ UNREALISTIC (>1 Billion)'
    WHEN total_spent > 100000000 THEN '⚠️ SUSPICIOUS (>100 Million)'
    WHEN total_spent > 10000000 THEN '✅ HIGH VALUE CUSTOMER'
    WHEN total_spent > 1000000 THEN '✅ REGULAR CUSTOMER'
    ELSE '✅ NORMAL'
  END as total_status,
  CASE 
    WHEN points != FLOOR(total_spent / 1000) THEN '❌ POINTS MISMATCH'
    ELSE '✅ POINTS CORRECT'
  END as points_status
FROM customers
WHERE phone = '+255712378850'
LIMIT 1;

SELECT '' as space;

-- ================================================================================
-- 3. ACTUAL SALES CALCULATION
-- ================================================================================

SELECT '📊 ACTUAL SALES CALCULATION' as section;
SELECT '' as space;

WITH customer_id AS (
  SELECT id FROM customers WHERE phone = '+255712378850' LIMIT 1
),
sales_calc AS (
  SELECT 
    COUNT(*) as total_sales,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sales,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(final_amount, total_amount, 0) END), 0) as actual_total_spent,
    MIN(created_at) as first_sale,
    MAX(created_at) as last_sale
  FROM lats_sales
  WHERE customer_id = (SELECT id FROM customer_id)
)
SELECT 
  'Total Sales: ' || total_sales as sales_count,
  'Completed Sales: ' || completed_sales as completed,
  'Actual Total Spent: TSh ' || TO_CHAR(actual_total_spent, 'FM999,999,999,990') as calculated_total,
  'First Sale: ' || TO_CHAR(first_sale, 'DD Mon YYYY') as first_purchase,
  'Last Sale: ' || TO_CHAR(last_sale, 'DD Mon YYYY') as last_purchase
FROM sales_calc;

SELECT '' as space;

-- ================================================================================
-- 4. DISCREPANCY CHECK
-- ================================================================================

SELECT '🔍 DISCREPANCY ANALYSIS' as section;
SELECT '' as space;

WITH customer_id AS (
  SELECT id FROM customers WHERE phone = '+255712378850' LIMIT 1
),
comparison AS (
  SELECT 
    c.total_spent as recorded_total,
    c.points as recorded_points,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) as actual_total,
    FLOOR(COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) / 1000) as calculated_points
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id
  WHERE c.id = (SELECT id FROM customer_id)
  GROUP BY c.id, c.total_spent, c.points
)
SELECT 
  'Recorded Total: TSh ' || TO_CHAR(recorded_total, 'FM999,999,999,990') as recorded,
  'Actual Total: TSh ' || TO_CHAR(actual_total, 'FM999,999,999,990') as actual,
  'Difference: TSh ' || TO_CHAR(ABS(recorded_total - actual_total), 'FM999,999,999,990') as difference,
  CASE 
    WHEN ABS(recorded_total - actual_total) < 1000 THEN '✅ MATCH'
    WHEN ABS(recorded_total - actual_total) < 10000 THEN '⚠️ MINOR DISCREPANCY'
    WHEN ABS(recorded_total - actual_total) < 1000000 THEN '⚠️ MODERATE DISCREPANCY'
    ELSE '❌ MAJOR CORRUPTION'
  END as status,
  '' as spacer,
  'Recorded Points: ' || recorded_points as recorded_pts,
  'Calculated Points: ' || calculated_points as calculated_pts,
  CASE 
    WHEN recorded_points = calculated_points THEN '✅ POINTS MATCH'
    ELSE '❌ POINTS MISMATCH'
  END as points_check
FROM comparison;

SELECT '' as space;

-- ================================================================================
-- 5. LOYALTY LEVEL CHECK
-- ================================================================================

SELECT '🏆 LOYALTY LEVEL VERIFICATION' as section;
SELECT '' as space;

WITH customer_id AS (
  SELECT id FROM customers WHERE phone = '+255712378850' LIMIT 1
),
loyalty_check AS (
  SELECT 
    c.loyalty_level as current_level,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) as actual_total,
    CASE 
      WHEN COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) >= 10000000 THEN 'platinum'
      WHEN COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) >= 5000000 THEN 'gold'
      WHEN COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) >= 1000000 THEN 'silver'
      ELSE 'bronze'
    END as calculated_level
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id
  WHERE c.id = (SELECT id FROM customer_id)
  GROUP BY c.id, c.loyalty_level
)
SELECT 
  'Current Level: ' || UPPER(current_level) as current,
  'Should Be: ' || UPPER(calculated_level) as should_be,
  CASE 
    WHEN current_level = calculated_level THEN '✅ CORRECT'
    ELSE '❌ NEEDS UPDATE'
  END as status,
  '' as spacer,
  'Thresholds:' as info,
  '  Bronze: < TSh 1M' as bronze,
  '  Silver: TSh 1M - 5M' as silver,
  '  Gold: TSh 5M - 10M' as gold,
  '  Platinum: > TSh 10M' as platinum
FROM loyalty_check;

SELECT '' as space;

-- ================================================================================
-- 6. SALE DETAILS CHECK (SALE-77358826-03CI)
-- ================================================================================

SELECT '🧾 SALE DETAILS: SALE-77358826-03CI' as section;
SELECT '' as space;

SELECT 
  'Sale Number: ' || sale_number as sale_no,
  'Status: ' || status as status,
  'Total Amount: TSh ' || TO_CHAR(total_amount, 'FM999,999,990') as total,
  'Final Amount: TSh ' || TO_CHAR(COALESCE(final_amount, total_amount), 'FM999,999,990') as final,
  'Payment Method: ' || COALESCE(payment_method::TEXT, 'Not recorded') as payment,
  'Date: ' || TO_CHAR(created_at, 'DD Mon YYYY, HH24:MI') as date
FROM lats_sales
WHERE sale_number = 'SALE-77358826-03CI';

SELECT '' as space;

-- Get sale items
SELECT 
  'Product: ' || product_name as product,
  'SKU: ' || COALESCE(sku, 'N/A') as sku,
  'Quantity: ' || quantity as qty,
  'Unit Price: TSh ' || TO_CHAR(unit_price, 'FM999,999,990') as unit_price,
  'Total: TSh ' || TO_CHAR(COALESCE(total_price, unit_price * quantity), 'FM999,999,990') as total,
  CASE 
    WHEN product_name ILIKE '%Samsung%S24%' AND unit_price < 100000 THEN '❌ UNREALISTIC PRICE'
    WHEN unit_price < 100 THEN '⚠️ VERY LOW PRICE'
    ELSE '✅ REASONABLE'
  END as price_check
FROM lats_sale_items
WHERE sale_id = (SELECT id FROM lats_sales WHERE sale_number = 'SALE-77358826-03CI');

SELECT '' as space;

-- ================================================================================
-- 7. PRODUCT PRICING CHECK
-- ================================================================================

SELECT '💎 PRODUCT PRICING CHECK' as section;
SELECT '' as space;

SELECT 
  'Product: ' || name as product,
  'SKU: ' || sku as sku,
  'Price: TSh ' || TO_CHAR(unit_price, 'FM999,999,990') as price,
  'Category: ' || COALESCE(category, 'Uncategorized') as category,
  CASE 
    WHEN name ILIKE '%Samsung%S24%' AND unit_price < 100000 THEN '❌ TOO LOW (Should be ~2.5M)'
    WHEN name ILIKE '%Samsung%' AND unit_price < 10000 THEN '⚠️ SUSPICIOUSLY LOW'
    ELSE '✅ OK'
  END as price_status
FROM lats_products
WHERE sku = 'SAMSUNG-S24-PREMIUM' OR name ILIKE '%Samsung Galaxy S24%';

SELECT '' as space;

-- ================================================================================
-- 8. OVERALL HEALTH SCORE
-- ================================================================================

SELECT '📊 OVERALL DATA HEALTH SCORE' as section;
SELECT '' as space;

WITH customer_id AS (
  SELECT id FROM customers WHERE phone = '+255712378850' LIMIT 1
),
health_check AS (
  SELECT 
    c.total_spent as recorded_total,
    c.points as recorded_points,
    c.loyalty_level,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) as actual_total,
    FLOOR(COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) / 1000) as calculated_points
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id
  WHERE c.id = (SELECT id FROM customer_id)
  GROUP BY c.id, c.total_spent, c.points, c.loyalty_level
),
scores AS (
  SELECT 
    CASE WHEN ABS(recorded_total - actual_total) < 1000 THEN 100 ELSE GREATEST(0, 100 - (ABS(recorded_total - actual_total) / 10000)) END as total_score,
    CASE WHEN recorded_points = calculated_points THEN 100 ELSE 0 END as points_score,
    CASE 
      WHEN (actual_total >= 10000000 AND loyalty_level = 'platinum') OR
           (actual_total >= 5000000 AND actual_total < 10000000 AND loyalty_level = 'gold') OR
           (actual_total >= 1000000 AND actual_total < 5000000 AND loyalty_level = 'silver') OR
           (actual_total < 1000000 AND loyalty_level = 'bronze') 
      THEN 100 
      ELSE 0 
    END as loyalty_score
  FROM health_check
)
SELECT 
  'Total Spent Accuracy: ' || ROUND(total_score) || '%' as total_check,
  'Points Accuracy: ' || ROUND(points_score) || '%' as points_check,
  'Loyalty Level Accuracy: ' || ROUND(loyalty_score) || '%' as loyalty_check,
  '' as spacer,
  'Overall Health: ' || ROUND((total_score + points_score + loyalty_score) / 3) || '%' as overall,
  CASE 
    WHEN (total_score + points_score + loyalty_score) / 3 >= 90 THEN '✅ HEALTHY'
    WHEN (total_score + points_score + loyalty_score) / 3 >= 70 THEN '⚠️ NEEDS ATTENTION'
    WHEN (total_score + points_score + loyalty_score) / 3 >= 50 THEN '⚠️ CORRUPTED'
    ELSE '❌ SEVERELY CORRUPTED'
  END as status
FROM scores;

SELECT '' as space;
SELECT '========================================' as divider;
SELECT '  END OF VERIFICATION REPORT' as footer;
SELECT '========================================' as divider;

-- ================================================================================
-- Quick Action Recommendation
-- ================================================================================

WITH customer_id AS (
  SELECT id FROM customers WHERE phone = '+255712378850' LIMIT 1
),
needs_fix AS (
  SELECT 
    ABS(c.total_spent - COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0)) as discrepancy
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id
  WHERE c.id = (SELECT id FROM customer_id)
  GROUP BY c.id, c.total_spent
)
SELECT 
  CASE 
    WHEN discrepancy < 1000 THEN '✅ No fix needed - data is accurate'
    WHEN discrepancy < 10000 THEN '⚠️ Minor fix recommended - run QUICK-FIX-SALE-77358826.sql'
    ELSE '❌ FIX REQUIRED - run QUICK-FIX-SALE-77358826.sql immediately'
  END as recommendation
FROM needs_fix;

-- ================================================================================
-- END OF VERIFICATION SCRIPT
-- ================================================================================

