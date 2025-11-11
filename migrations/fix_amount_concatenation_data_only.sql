-- ================================================================
-- FIX: Clean Corrupted Amount Data (Data Only - No Schema Changes)
-- ================================================================
-- This migration ONLY cleans corrupted data without altering column types
-- Use this if the safe version has issues with views
-- ================================================================

-- Clean corrupted data in customers table
DO $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  RAISE NOTICE '🧹 Cleaning customers table...';
  
  -- Fix total_spent
  UPDATE customers
  SET total_spent = 0
  WHERE 
    total_spent::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'  -- Concatenated pattern
    OR total_spent > 1000000000000  -- > 1 trillion
    OR total_spent < 0  -- Negative
    OR NOT (total_spent = total_spent);  -- NaN
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RAISE NOTICE '   ✅ Fixed % corrupted total_spent values', v_affected_rows;
  
  -- Fix points
  UPDATE customers
  SET points = 0
  WHERE 
    points > 10000000  -- Unrealistic
    OR points < 0  -- Negative
    OR NOT (points = points);  -- NaN
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RAISE NOTICE '   ✅ Fixed % corrupted points values', v_affected_rows;
END $$;

-- Clean corrupted data in lats_customers table
DO $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_customers') THEN
    RAISE NOTICE '🧹 Cleaning lats_customers table...';
    
    UPDATE lats_customers
    SET total_spent = 0
    WHERE 
      total_spent::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
      OR total_spent > 1000000000000
      OR total_spent < 0
      OR NOT (total_spent = total_spent);
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    RAISE NOTICE '   ✅ Fixed % corrupted total_spent values', v_affected_rows;
  END IF;
END $$;

-- Clean corrupted data in lats_sales table
DO $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  RAISE NOTICE '🧹 Cleaning lats_sales table...';
  
  -- Fix total_amount
  UPDATE lats_sales
  SET total_amount = 0
  WHERE 
    total_amount::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
    OR total_amount > 1000000000  -- > 1 billion per sale
    OR total_amount < 0
    OR NOT (total_amount = total_amount);
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RAISE NOTICE '   ✅ Fixed % corrupted total_amount values', v_affected_rows;
  
  -- Fix subtotal if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'subtotal') THEN
    UPDATE lats_sales 
    SET subtotal = 0 
    WHERE subtotal IS NULL OR NOT (subtotal = subtotal) OR subtotal < 0;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    IF v_affected_rows > 0 THEN
      RAISE NOTICE '   ✅ Fixed % corrupted subtotal values', v_affected_rows;
    END IF;
  END IF;
  
  -- Fix discount if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'discount') THEN
    UPDATE lats_sales 
    SET discount = 0 
    WHERE discount IS NULL OR NOT (discount = discount) OR discount < 0;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    IF v_affected_rows > 0 THEN
      RAISE NOTICE '   ✅ Fixed % corrupted discount values', v_affected_rows;
    END IF;
  END IF;
  
  -- Fix tax if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'tax') THEN
    UPDATE lats_sales 
    SET tax = 0 
    WHERE tax IS NULL OR NOT (tax = tax) OR tax < 0;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    IF v_affected_rows > 0 THEN
      RAISE NOTICE '   ✅ Fixed % corrupted tax values', v_affected_rows;
    END IF;
  END IF;
END $$;

-- Clean corrupted data in customer_payments table
DO $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_payments') THEN
    RAISE NOTICE '🧹 Cleaning customer_payments table...';
    
    UPDATE customer_payments
    SET amount = 0
    WHERE 
      amount::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
      OR amount > 1000000000
      OR amount < 0
      OR NOT (amount = amount);
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    RAISE NOTICE '   ✅ Fixed % corrupted amount values', v_affected_rows;
  END IF;
END $$;

-- Clean corrupted data in finance_accounts table
DO $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_accounts') THEN
    RAISE NOTICE '🧹 Cleaning finance_accounts table...';
    
    UPDATE finance_accounts
    SET balance = 0
    WHERE 
      balance::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
      OR ABS(balance) > 10000000000  -- > 10 billion (can be negative)
      OR NOT (balance = balance);
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    RAISE NOTICE '   ✅ Fixed % corrupted balance values', v_affected_rows;
  END IF;
END $$;

-- Clean corrupted data in lats_purchase_orders table
DO $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_purchase_orders') THEN
    RAISE NOTICE '🧹 Cleaning lats_purchase_orders table...';
    
    -- Fix total_amount
    UPDATE lats_purchase_orders
    SET total_amount = 0
    WHERE 
      total_amount::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
      OR total_amount > 10000000000
      OR total_amount < 0
      OR NOT (total_amount = total_amount);
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    IF v_affected_rows > 0 THEN
      RAISE NOTICE '   ✅ Fixed % corrupted total_amount values', v_affected_rows;
    END IF;
    
    -- Fix total_paid
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_purchase_orders' AND column_name = 'total_paid') THEN
      UPDATE lats_purchase_orders
      SET total_paid = 0
      WHERE 
        total_paid::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
        OR total_paid > 10000000000
        OR total_paid < 0
        OR NOT (total_paid = total_paid);
      
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
      IF v_affected_rows > 0 THEN
        RAISE NOTICE '   ✅ Fixed % corrupted total_paid values', v_affected_rows;
      END IF;
    END IF;
  END IF;
END $$;

-- Create helper function for safe amount addition
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
  -- Get current total, ensuring it's numeric
  SELECT COALESCE(total_spent::NUMERIC, 0)
  INTO v_current_total
  FROM customers
  WHERE id = p_customer_id;
  
  -- Validate input
  IF p_amount_to_add IS NULL OR p_amount_to_add < 0 THEN
    RAISE EXCEPTION 'Invalid amount: %', p_amount_to_add;
  END IF;
  
  -- Check for corruption in current total
  IF v_current_total > 1000000000000 OR v_current_total < 0 THEN
    RAISE WARNING 'Corrupted total_spent detected for customer %. Resetting to 0.', p_customer_id;
    v_current_total := 0;
  END IF;
  
  -- Calculate new total with explicit numeric addition
  v_new_total := v_current_total::NUMERIC + p_amount_to_add::NUMERIC;
  
  -- Validate result
  IF v_new_total > 1000000000000 THEN
    RAISE EXCEPTION 'New total % exceeds maximum allowed', v_new_total;
  END IF;
  
  -- Update customer with validated numeric value
  UPDATE customers
  SET 
    total_spent = v_new_total,
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN v_new_total;
END;
$$;

COMMENT ON FUNCTION safe_add_to_customer_total IS 
  'Safely adds an amount to customer total_spent, preventing string concatenation';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ================================================';
  RAISE NOTICE '✅  Data cleaning completed successfully!';
  RAISE NOTICE '✅ ================================================';
  RAISE NOTICE '';
  RAISE NOTICE '   ✓ Cleaned all corrupted amount values';
  RAISE NOTICE '   ✓ Created safe_add_to_customer_total function';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Note: This migration only cleaned data.';
  RAISE NOTICE '   Column types were NOT changed to avoid view conflicts.';
  RAISE NOTICE '   The application code now handles type conversion properly.';
  RAISE NOTICE '';
END $$;

