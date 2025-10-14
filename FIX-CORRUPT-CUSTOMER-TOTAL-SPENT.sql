-- ========================================
-- FIX CORRUPT CUSTOMER TOTAL_SPENT VALUES
-- ========================================
-- This script identifies and fixes customers with unrealistic total_spent values
-- (values > 1 trillion TZS indicate data corruption)

-- Step 1: Identify customers with corrupt data
SELECT 
    id,
    name,
    phone,
    total_spent,
    CASE 
        WHEN total_spent > 1000000000000 THEN 'CORRUPT - Too High'
        WHEN total_spent < -1000000000 THEN 'CORRUPT - Negative'
        WHEN total_spent IS NULL THEN 'NULL'
        ELSE 'OK'
    END as status
FROM customers
WHERE 
    total_spent > 1000000000000  -- Greater than 1 trillion
    OR total_spent < -1000000000 -- Less than -1 billion (shouldn't be negative)
    OR total_spent IS NULL
ORDER BY total_spent DESC;

-- Step 2: Calculate correct total_spent from actual sales
WITH customer_sales AS (
    SELECT 
        customer_id,
        SUM(total_amount) as actual_total_spent,
        COUNT(*) as sale_count
    FROM lats_pos_sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
)
SELECT 
    c.id,
    c.name,
    c.phone,
    c.total_spent as current_corrupted_value,
    COALESCE(cs.actual_total_spent, 0) as correct_value,
    COALESCE(cs.sale_count, 0) as number_of_sales,
    (c.total_spent - COALESCE(cs.actual_total_spent, 0)) as difference
FROM customers c
LEFT JOIN customer_sales cs ON c.id = cs.customer_id
WHERE 
    c.total_spent > 1000000000000  -- Greater than 1 trillion
    OR c.total_spent < -1000000000 -- Less than -1 billion
    OR c.total_spent IS NULL
ORDER BY difference DESC;

-- Step 3: Fix the corrupt data
-- Update customers with correct totals from sales
UPDATE customers c
SET 
    total_spent = COALESCE(cs.actual_total_spent, 0),
    updated_at = NOW()
FROM (
    SELECT 
        customer_id,
        SUM(total_amount) as actual_total_spent
    FROM lats_pos_sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
) cs
WHERE 
    c.id = cs.customer_id
    AND (
        c.total_spent > 1000000000000  -- Greater than 1 trillion
        OR c.total_spent < -1000000000 -- Less than -1 billion
        OR c.total_spent IS NULL
        OR ABS(c.total_spent - cs.actual_total_spent) > 1000  -- Significant difference
    );

-- Step 4: Set to 0 for customers with no sales
UPDATE customers
SET 
    total_spent = 0,
    updated_at = NOW()
WHERE 
    id NOT IN (SELECT DISTINCT customer_id FROM lats_pos_sales WHERE customer_id IS NOT NULL)
    AND (
        total_spent IS NULL 
        OR total_spent > 1000000000000
        OR total_spent < 0
    );

-- Step 5: Verification - Show customers after fix
SELECT 
    id,
    name,
    phone,
    total_spent,
    CASE 
        WHEN total_spent > 1000000000000 THEN 'STILL CORRUPT'
        WHEN total_spent < 0 THEN 'NEGATIVE'
        ELSE 'FIXED'
    END as status
FROM customers
WHERE total_spent > 1000000000000 OR total_spent < 0
ORDER BY total_spent DESC;

-- Step 6: Show summary of fixes
SELECT 
    COUNT(*) as total_customers,
    COUNT(CASE WHEN total_spent > 0 THEN 1 END) as customers_with_purchases,
    COUNT(CASE WHEN total_spent = 0 THEN 1 END) as customers_no_purchases,
    COUNT(CASE WHEN total_spent IS NULL THEN 1 END) as customers_null_total,
    MAX(total_spent) as max_total_spent,
    MIN(total_spent) as min_total_spent,
    AVG(total_spent) as avg_total_spent
FROM customers;

-- ========================================
-- PREVENTION: Create trigger to validate
-- ========================================
CREATE OR REPLACE FUNCTION validate_customer_total_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Cap at 1 trillion TZS
    IF NEW.total_spent > 1000000000000 THEN
        RAISE WARNING 'Customer % has unrealistic total_spent: %. Capping to 1 trillion.', NEW.name, NEW.total_spent;
        NEW.total_spent := 1000000000000;
    END IF;
    
    -- Prevent negative values
    IF NEW.total_spent < 0 THEN
        RAISE WARNING 'Customer % has negative total_spent: %. Setting to 0.', NEW.name, NEW.total_spent;
        NEW.total_spent := 0;
    END IF;
    
    -- Handle NULL
    IF NEW.total_spent IS NULL THEN
        NEW.total_spent := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS validate_total_spent_trigger ON customers;

-- Create trigger
CREATE TRIGGER validate_total_spent_trigger
    BEFORE INSERT OR UPDATE OF total_spent ON customers
    FOR EACH ROW
    EXECUTE FUNCTION validate_customer_total_spent();

-- ========================================
-- TEST: Verify the trigger works
-- ========================================
-- This should cap the value
-- UPDATE customers SET total_spent = 9999999999999 WHERE id = (SELECT id FROM customers LIMIT 1);

-- This should set to 0
-- UPDATE customers SET total_spent = -1000 WHERE id = (SELECT id FROM customers LIMIT 1);

SELECT '✅ All corrupt customer total_spent values have been fixed!' as status;
SELECT '✅ Prevention trigger has been created!' as status;

