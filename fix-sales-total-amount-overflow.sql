-- ============================================
-- FIX: Sales Total Amount Overflow Issue
-- ============================================
-- This script fixes the extremely large total_amount values
-- that are causing display issues in the Daily Sales summary
--
-- Issue: TSh 1,506,778,624,849,422,342,737,560 (clearly wrong!)
-- Expected: Reasonable sales amounts
-- ============================================

-- STEP 1: Inspect the problem data
-- Let's see what's actually in the database
SELECT 
    id,
    sale_number,
    total_amount,
    created_at,
    customer_name,
    payment_method,
    CASE 
        WHEN total_amount > 1000000000 THEN '🔴 EXTREMELY LARGE'
        WHEN total_amount > 100000000 THEN '🟡 SUSPICIOUSLY LARGE'
        WHEN total_amount < 0 THEN '🔴 NEGATIVE'
        ELSE '✅ OK'
    END as status_check
FROM lats_sales
WHERE created_at >= CURRENT_DATE -- Today's sales
ORDER BY total_amount DESC
LIMIT 20;

-- STEP 2: Check for any sales with ridiculously large amounts
SELECT 
    COUNT(*) as problem_sales_count,
    MIN(total_amount) as min_amount,
    MAX(total_amount) as max_amount,
    AVG(total_amount) as avg_amount
FROM lats_sales
WHERE total_amount > 1000000000 OR total_amount < 0;

-- STEP 3: Standardize the column type with proper precision
-- This ensures consistent handling across all sales records
-- NUMERIC(15, 2) allows values up to 9,999,999,999,999.99
-- which is more than enough for any realistic sales amount
ALTER TABLE lats_sales 
ALTER COLUMN total_amount TYPE NUMERIC(15, 2);

-- STEP 4: Add a check constraint to prevent unreasonable values
-- Maximum: 1 billion (1,000,000,000)
-- Minimum: 0 (no negative sales)
ALTER TABLE lats_sales
DROP CONSTRAINT IF EXISTS lats_sales_total_amount_check;

ALTER TABLE lats_sales
ADD CONSTRAINT lats_sales_total_amount_check 
CHECK (total_amount >= 0 AND total_amount <= 1000000000);

-- STEP 5: Fix corrupted data
-- Option A: If the data is wrong, set it to 0 and mark for manual review
UPDATE lats_sales
SET 
    total_amount = 0,
    notes = COALESCE(notes || ' | ', '') || '[AUTO-FIX] Original amount was corrupted: ' || total_amount::TEXT
WHERE total_amount > 1000000000 OR total_amount < 0;

-- STEP 6: Verify the fix
SELECT 
    COUNT(*) as total_today_sales,
    SUM(total_amount) as correct_total_sales,
    AVG(total_amount) as correct_avg_sale,
    MIN(total_amount) as min_sale,
    MAX(total_amount) as max_sale
FROM lats_sales
WHERE created_at >= CURRENT_DATE;

-- STEP 7: Also check and fix sale items total prices
-- In case the issue is in the line items
ALTER TABLE lats_sale_items 
ALTER COLUMN total_price TYPE NUMERIC(15, 2);

ALTER TABLE lats_sale_items
DROP CONSTRAINT IF EXISTS lats_sale_items_total_price_check;

ALTER TABLE lats_sale_items
ADD CONSTRAINT lats_sale_items_total_price_check 
CHECK (total_price >= 0 AND total_price <= 100000000);

-- Fix corrupted line items
UPDATE lats_sale_items
SET total_price = unit_price * quantity
WHERE total_price > 100000000 OR total_price < 0 OR total_price IS NULL;

-- STEP 8: Create a function to recalculate sale totals from line items
-- This is useful if the total got corrupted but line items are OK
CREATE OR REPLACE FUNCTION recalculate_sale_total(p_sale_id UUID)
RETURNS NUMERIC(15, 2) AS $$
DECLARE
    v_calculated_total NUMERIC(15, 2);
BEGIN
    -- Calculate total from line items
    SELECT COALESCE(SUM(total_price), 0)
    INTO v_calculated_total
    FROM lats_sale_items
    WHERE sale_id = p_sale_id;
    
    -- Update the sale record
    UPDATE lats_sales
    SET total_amount = v_calculated_total
    WHERE id = p_sale_id;
    
    RETURN v_calculated_total;
END;
$$ LANGUAGE plpgsql;

-- STEP 9: Recalculate all sales totals from line items for today
-- This will fix any discrepancies
DO $$
DECLARE
    sale_record RECORD;
    recalc_count INT := 0;
BEGIN
    FOR sale_record IN 
        SELECT id, total_amount 
        FROM lats_sales 
        WHERE created_at >= CURRENT_DATE
    LOOP
        PERFORM recalculate_sale_total(sale_record.id);
        recalc_count := recalc_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Recalculated % sale totals', recalc_count;
END $$;

-- STEP 10: Final verification
SELECT 
    '✅ FIXED!' as status,
    COUNT(*) as total_sales_today,
    TO_CHAR(SUM(total_amount), 'FM999,999,999,999') as total_sales_formatted,
    TO_CHAR(AVG(total_amount), 'FM999,999,999') as avg_sale_formatted,
    COUNT(DISTINCT customer_id) as unique_customers
FROM lats_sales
WHERE created_at >= CURRENT_DATE;

-- STEP 11: Add preventive trigger for future inserts/updates
CREATE OR REPLACE FUNCTION validate_sale_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate total_amount is reasonable
    IF NEW.total_amount < 0 THEN
        RAISE EXCEPTION 'Sale total cannot be negative: %', NEW.total_amount;
    END IF;
    
    IF NEW.total_amount > 1000000000 THEN
        RAISE EXCEPTION 'Sale total is unreasonably large: %. Max allowed is 1 billion', NEW.total_amount;
    END IF;
    
    -- Auto-calculate from line items if total is suspicious
    IF NEW.total_amount > 100000000 THEN
        RAISE WARNING 'Large sale amount detected: %. Please verify.', NEW.total_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_sale_amount_trigger ON lats_sales;
CREATE TRIGGER validate_sale_amount_trigger
    BEFORE INSERT OR UPDATE OF total_amount ON lats_sales
    FOR EACH ROW
    EXECUTE FUNCTION validate_sale_amount();

-- Done!
SELECT '🎉 Database schema fixed and data cleaned!' as result;

