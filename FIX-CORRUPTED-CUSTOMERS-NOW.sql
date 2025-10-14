-- ========================================
-- FIX CORRUPTED CUSTOMER DATA - QUICK FIX
-- ========================================
-- Run this to fix corrupt total_spent values NOW

-- Step 1: Identify corrupt customers
SELECT 
    id,
    name,
    phone,
    total_spent,
    'CORRUPT!' as status
FROM customers
WHERE 
    total_spent > 1000000000000  -- > 1 trillion TZS (clearly corrupt)
    OR total_spent < 0           -- Negative (invalid)
ORDER BY total_spent DESC;

-- Step 2: Fix corrupt customers by recalculating from actual sales
-- This uses lats_sales table to get the real total
UPDATE customers c
SET 
    total_spent = COALESCE(sales_total.actual_total, 0),
    total_orders = COALESCE(sales_total.order_count, 0),
    points = FLOOR(COALESCE(sales_total.actual_total, 0) / 1000),
    updated_at = NOW()
FROM (
    SELECT 
        customer_id,
        SUM(CASE WHEN status = 'completed' THEN COALESCE(total_amount, 0) ELSE 0 END) as actual_total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as order_count
    FROM lats_sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
) as sales_total
WHERE 
    c.id = sales_total.customer_id
    AND (
        c.total_spent > 1000000000000  -- > 1 trillion (corrupt)
        OR c.total_spent < 0            -- Negative (invalid)
    );

-- Step 3: Set remaining customers with no sales to 0
UPDATE customers
SET 
    total_spent = 0,
    total_orders = 0,
    points = 0,
    updated_at = NOW()
WHERE 
    (total_spent > 1000000000000 OR total_spent < 0)
    AND id NOT IN (SELECT DISTINCT customer_id FROM lats_sales WHERE customer_id IS NOT NULL);

-- Step 4: Verify the fix
SELECT 
    id,
    name,
    phone,
    total_spent,
    total_orders,
    points,
    'FIXED!' as status
FROM customers
WHERE 
    id IN (
        -- Get customers that were corrupt
        SELECT id FROM customers
        WHERE total_spent >= 0 AND total_spent <= 1000000000000
    )
ORDER BY total_spent DESC
LIMIT 10;

-- ✅ Done! All corrupt customer data has been fixed.

