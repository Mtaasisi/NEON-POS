-- ============================================
-- DIAGNOSTIC: Check Sales Data Problem
-- ============================================
-- Run this FIRST to see what's wrong
-- ============================================

-- 1. Check today's sales with problems
SELECT 
    'Today''s Sales Data' as report_section,
    id,
    sale_number,
    total_amount,
    LENGTH(total_amount::TEXT) as digits_count,
    created_at,
    customer_name
FROM lats_sales
WHERE created_at >= CURRENT_DATE
ORDER BY total_amount DESC;

-- 2. Summary of the problem
SELECT 
    'Summary' as report_section,
    COUNT(*) as total_sales_today,
    SUM(total_amount) as sum_total,
    AVG(total_amount) as avg_total,
    MAX(total_amount) as max_total,
    MIN(total_amount) as min_total,
    COUNT(*) FILTER (WHERE total_amount > 1000000000) as problematic_count
FROM lats_sales
WHERE created_at >= CURRENT_DATE;

-- 3. Check sale items for today's sales
SELECT 
    'Sale Items Check' as report_section,
    ls.sale_number,
    ls.total_amount as sale_total,
    SUM(lsi.total_price) as calculated_from_items,
    (ls.total_amount - COALESCE(SUM(lsi.total_price), 0)) as difference
FROM lats_sales ls
LEFT JOIN lats_sale_items lsi ON lsi.sale_id = ls.id
WHERE ls.created_at >= CURRENT_DATE
GROUP BY ls.id, ls.sale_number, ls.total_amount
ORDER BY difference DESC;

-- 4. Check column data type
SELECT 
    'Column Info' as report_section,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'lats_sales' 
AND column_name = 'total_amount';

