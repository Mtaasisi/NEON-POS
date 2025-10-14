-- =========================================================================
-- EMERGENCY FIX: Corrupted total_spent Values
-- =========================================================================
-- This script identifies and fixes customers with unrealistic total_spent 
-- values (values > 1 trillion TZS indicate data corruption)
--
-- Run this script to fix the database corruption immediately
-- =========================================================================

BEGIN;

-- Step 1: Show corrupted customers BEFORE fix
SELECT 
    '🚨 CORRUPTED CUSTOMERS FOUND:' as status,
    COUNT(*) as count
FROM customers
WHERE 
    total_spent > 1000000000000  -- Greater than 1 trillion
    OR total_spent < 0;          -- Negative values

-- Step 2: Show the specific corrupted records
SELECT 
    id,
    name,
    phone,
    total_spent as corrupted_value,
    points,
    '⚠️ CORRUPTED' as status
FROM customers
WHERE 
    total_spent > 1000000000000  -- Greater than 1 trillion
    OR total_spent < 0           -- Negative values
ORDER BY total_spent DESC
LIMIT 20;

-- Step 3: Calculate correct values from actual sales
WITH customer_correct_totals AS (
    SELECT 
        c.id,
        c.name,
        c.phone,
        c.total_spent as current_corrupted,
        COALESCE(
            SUM(
                CASE 
                    WHEN s.status = 'completed' 
                    THEN COALESCE(s.final_amount, s.total_amount, 0)
                    ELSE 0 
                END
            ), 
            0
        ) as correct_total_spent,
        COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_sales_count
    FROM customers c
    LEFT JOIN lats_sales s ON s.customer_id = c.id
    WHERE 
        c.total_spent > 1000000000000  -- Greater than 1 trillion
        OR c.total_spent < 0           -- Negative values
    GROUP BY c.id, c.name, c.phone, c.total_spent
)
SELECT 
    name,
    phone,
    current_corrupted,
    correct_total_spent,
    completed_sales_count,
    '🔧 WILL BE FIXED' as action
FROM customer_correct_totals;

-- Step 4: FIX THE CORRUPTION
-- Update customers with correct totals from actual sales
UPDATE customers c
SET 
    total_spent = COALESCE(
        (
            SELECT SUM(
                CASE 
                    WHEN s.status = 'completed' 
                    THEN COALESCE(s.final_amount, s.total_amount, 0)
                    ELSE 0 
                END
            )
            FROM lats_sales s
            WHERE s.customer_id = c.id
        ),
        0
    ),
    points = FLOOR(
        COALESCE(
            (
                SELECT SUM(
                    CASE 
                        WHEN s.status = 'completed' 
                        THEN COALESCE(s.final_amount, s.total_amount, 0)
                        ELSE 0 
                    END
                )
                FROM lats_sales s
                WHERE s.customer_id = c.id
            ),
            0
        ) / 1000  -- 1 point per 1000 TZS
    ),
    updated_at = NOW()
WHERE 
    c.total_spent > 1000000000000  -- Greater than 1 trillion
    OR c.total_spent < 0;          -- Negative values

-- Step 5: Verify the fix
SELECT 
    '✅ FIX COMPLETE - Verification:' as status,
    COUNT(*) as remaining_corrupted_count
FROM customers
WHERE 
    total_spent > 1000000000000  -- Greater than 1 trillion
    OR total_spent < 0;          -- Negative values

-- Step 6: Show the fixed records
SELECT 
    id,
    name,
    phone,
    total_spent as corrected_value,
    points,
    '✅ FIXED' as status
FROM customers
WHERE 
    id IN (
        SELECT DISTINCT id 
        FROM customers 
        WHERE updated_at > NOW() - INTERVAL '1 minute'
    )
ORDER BY total_spent DESC
LIMIT 20;

COMMIT;

-- =========================================================================
-- Additional: Prevent future corruption by adding a constraint
-- =========================================================================
-- Run this to add a check constraint (optional - might affect existing data)

-- ALTER TABLE customers
-- ADD CONSTRAINT check_total_spent_reasonable 
-- CHECK (total_spent >= 0 AND total_spent <= 1000000000000);

-- =========================================================================
-- Note: If you see any issues, you can ROLLBACK instead of COMMIT
-- =========================================================================

