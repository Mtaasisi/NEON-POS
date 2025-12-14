-- ================================================================
-- FIX: Prevent String Concatenation of Amount Fields
-- ================================================================
-- This migration ensures all amount/money columns are properly typed
-- as NUMERIC and adds constraints to prevent string concatenation issues
-- ================================================================

-- Step 1: Clean up corrupted data in customers table
-- Detect and fix values that look like concatenated strings
UPDATE customers
SET total_spent = 0
WHERE 
  total_spent::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'  -- Pattern like "123.45678.90"
  OR total_spent > 1000000000000  -- Unrealistic values > 1 trillion
  OR total_spent < 0  -- Negative values
  OR total_spent::TEXT LIKE '%e%';  -- Scientific notation (might be corrupted)

UPDATE lats_customers
SET total_spent = 0
WHERE 
  total_spent::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
  OR total_spent > 1000000000000
  OR total_spent < 0
  OR total_spent::TEXT LIKE '%e%';

-- Clean up corrupted points
UPDATE customers
SET points = 0
WHERE 
  points > 10000000  -- Unrealistic points
  OR points < 0;

-- Step 2: Ensure all amount columns are explicitly NUMERIC type
-- This prevents implicit type conversions that can cause concatenation

-- Customers tables
ALTER TABLE customers 
  ALTER COLUMN total_spent TYPE NUMERIC USING total_spent::NUMERIC,
  ALTER COLUMN total_spent SET DEFAULT 0,
  ALTER COLUMN total_spent SET NOT NULL;

ALTER TABLE lats_customers 
  ALTER COLUMN total_spent TYPE NUMERIC USING total_spent::NUMERIC,
  ALTER COLUMN total_spent SET DEFAULT 0;

-- Sales tables
ALTER TABLE lats_sales 
  ALTER COLUMN total_amount TYPE NUMERIC USING total_amount::NUMERIC,
  ALTER COLUMN subtotal TYPE NUMERIC USING COALESCE(subtotal, 0)::NUMERIC,
  ALTER COLUMN discount TYPE NUMERIC USING COALESCE(discount, 0)::NUMERIC,
  ALTER COLUMN tax TYPE NUMERIC USING COALESCE(tax, 0)::NUMERIC;

-- Sale items
ALTER TABLE lats_sale_items
  ALTER COLUMN price TYPE NUMERIC USING COALESCE(price, 0)::NUMERIC,
  ALTER COLUMN unit_price TYPE NUMERIC USING unit_price::NUMERIC,
  ALTER COLUMN total_price TYPE NUMERIC USING total_price::NUMERIC,
  ALTER COLUMN cost_price TYPE NUMERIC USING COALESCE(cost_price, 0)::NUMERIC;

-- Purchase orders
ALTER TABLE lats_purchase_orders
  ALTER COLUMN total_amount TYPE NUMERIC USING total_amount::NUMERIC,
  ALTER COLUMN total_paid TYPE NUMERIC USING COALESCE(total_paid, 0)::NUMERIC;

-- Customer payments
ALTER TABLE customer_payments
  ALTER COLUMN amount TYPE NUMERIC USING amount::NUMERIC;

-- Finance accounts
ALTER TABLE finance_accounts
  ALTER COLUMN balance TYPE NUMERIC USING balance::NUMERIC;

-- Account transactions
ALTER TABLE account_transactions
  ALTER COLUMN amount TYPE NUMERIC USING amount::NUMERIC;

-- Step 3: Add CHECK constraints to prevent invalid values
ALTER TABLE customers 
  DROP CONSTRAINT IF EXISTS customers_total_spent_check,
  ADD CONSTRAINT customers_total_spent_check 
    CHECK (total_spent >= 0 AND total_spent < 1000000000000);

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_points_check,
  ADD CONSTRAINT customers_points_check 
    CHECK (points >= 0 AND points < 100000000);

ALTER TABLE lats_customers 
  DROP CONSTRAINT IF EXISTS lats_customers_total_spent_check,
  ADD CONSTRAINT lats_customers_total_spent_check 
    CHECK (total_spent >= 0 AND total_spent < 1000000000000);

ALTER TABLE lats_sales
  DROP CONSTRAINT IF EXISTS lats_sales_total_amount_check,
  ADD CONSTRAINT lats_sales_total_amount_check 
    CHECK (total_amount >= 0 AND total_amount < 1000000000);

-- Step 4: Create a function to safely update customer totals
-- This function ensures numeric addition and prevents string concatenation
CREATE OR REPLACE FUNCTION safe_add_to_customer_total(
  p_customer_id UUID,
  p_amount_to_add NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_total NUMERIC;
  v_new_total NUMERIC;
BEGIN
  -- Get current total, ensuring it's a valid number
  SELECT COALESCE(total_spent, 0)::NUMERIC
  INTO v_current_total
  FROM customers
  WHERE id = p_customer_id;
  
  -- Validate input amount
  IF p_amount_to_add IS NULL OR p_amount_to_add < 0 THEN
    RAISE EXCEPTION 'Invalid amount: %', p_amount_to_add;
  END IF;
  
  -- Validate current total isn't corrupted
  IF v_current_total > 1000000000000 OR v_current_total < 0 THEN
    RAISE WARNING 'Corrupted total_spent detected for customer %. Resetting to 0.', p_customer_id;
    v_current_total := 0;
  END IF;
  
  -- Calculate new total
  v_new_total := v_current_total + p_amount_to_add;
  
  -- Validate new total
  IF v_new_total > 1000000000000 THEN
    RAISE EXCEPTION 'New total % exceeds maximum allowed value', v_new_total;
  END IF;
  
  -- Update the customer record
  UPDATE customers
  SET 
    total_spent = v_new_total,
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN v_new_total;
END;
$$;

-- Step 5: Add comments for documentation
COMMENT ON FUNCTION safe_add_to_customer_total IS 
  'Safely adds an amount to customer total_spent, preventing string concatenation and validating inputs';

COMMENT ON CONSTRAINT customers_total_spent_check ON customers IS 
  'Ensures total_spent is non-negative and below 1 trillion (prevents corruption)';

COMMENT ON CONSTRAINT lats_sales_total_amount_check ON lats_sales IS 
  'Ensures sale amounts are realistic (0 to 1 billion TZS)';

-- Step 6: Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Amount string concatenation fix completed successfully';
  RAISE NOTICE '   - Cleaned corrupted customer data';
  RAISE NOTICE '   - Enforced NUMERIC types on all amount columns';
  RAISE NOTICE '   - Added validation constraints';
  RAISE NOTICE '   - Created safe_add_to_customer_total function';
END $$;

