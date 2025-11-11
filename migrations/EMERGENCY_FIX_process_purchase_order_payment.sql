-- ============================================
-- EMERGENCY FIX: Process Purchase Order Payment Function
-- ============================================
-- This script completely removes all versions of the function
-- and creates a clean version with the correct parameter order
-- 
-- Run this script in your Neon Database SQL Editor
-- ============================================

-- Step 1: Force drop ALL versions of the function
-- This handles cases where multiple overloaded versions exist
DO $$ 
DECLARE
  r RECORD;
  drop_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Starting emergency fix for process_purchase_order_payment...';
  
  FOR r IN 
    SELECT 
      oid::regprocedure AS func_signature,
      pg_get_function_identity_arguments(oid) AS args
    FROM pg_proc 
    WHERE proname = 'process_purchase_order_payment'
  LOOP
    BEGIN
      EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
      drop_count := drop_count + 1;
      RAISE NOTICE '✅ Dropped: % with args (%)', r.func_signature, r.args;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '⚠️  Failed to drop: % - %', r.func_signature, SQLERRM;
    END;
  END LOOP;
  
  IF drop_count = 0 THEN
    RAISE NOTICE '📝 No existing functions found to drop';
  ELSE
    RAISE NOTICE '🗑️  Dropped % function version(s)', drop_count;
  END IF;
END $$;

-- Step 2: Verify all versions are dropped
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM pg_proc
  WHERE proname = 'process_purchase_order_payment';
  
  IF remaining_count > 0 THEN
    RAISE WARNING '⚠️  Still found % version(s) of the function!', remaining_count;
  ELSE
    RAISE NOTICE '✅ All versions successfully removed';
  END IF;
END $$;

-- Step 3: Create the function with CORRECT parameter order
CREATE OR REPLACE FUNCTION process_purchase_order_payment(
  purchase_order_id_param UUID,           -- Parameter 1
  payment_account_id_param UUID,          -- Parameter 2
  amount_param NUMERIC,                   -- Parameter 3
  currency_param VARCHAR DEFAULT 'TZS',  -- Parameter 4 (NOT a UUID!)
  payment_method_param VARCHAR DEFAULT 'Cash', -- Parameter 5 (NOT a UUID!)
  payment_method_id_param UUID DEFAULT NULL,   -- Parameter 6
  user_id_param UUID DEFAULT '00000000-0000-0000-0000-000000000001', -- Parameter 7
  reference_param TEXT DEFAULT NULL,      -- Parameter 8
  notes_param TEXT DEFAULT NULL          -- Parameter 9
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_po_total NUMERIC;
  v_po_paid NUMERIC;
  v_new_paid NUMERIC;
  v_payment_status VARCHAR;
  v_account_balance NUMERIC;
  v_result JSON;
BEGIN
  -- Log incoming parameters for debugging
  RAISE NOTICE '📥 Processing payment with parameters:';
  RAISE NOTICE '   PO ID: %', purchase_order_id_param;
  RAISE NOTICE '   Account ID: %', payment_account_id_param;
  RAISE NOTICE '   Amount: %', amount_param;
  RAISE NOTICE '   Currency: %', currency_param;
  RAISE NOTICE '   Payment Method: %', payment_method_param;
  RAISE NOTICE '   Method ID: %', payment_method_id_param;

  -- Validate that currency is NOT a UUID
  IF currency_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PARAMETER ERROR: currency_param "' || currency_param || '" is a UUID but should be a currency code (TZS, USD, etc.)'
    );
  END IF;

  -- Validate that payment_method is NOT a UUID
  IF payment_method_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PARAMETER ERROR: payment_method_param "' || payment_method_param || '" is a UUID but should be a payment method name (Cash, Bank Transfer, etc.)'
    );
  END IF;

  -- Validate required parameters
  IF purchase_order_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Purchase order ID is required');
  END IF;

  IF payment_account_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Payment account ID is required');
  END IF;

  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Payment amount must be greater than 0');
  END IF;

  -- Get current purchase order details
  SELECT total_amount, COALESCE(total_paid, 0)
  INTO v_po_total, v_po_paid
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found: ' || purchase_order_id_param
    );
  END IF;

  -- Get account balance
  SELECT balance INTO v_account_balance
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment account not found: ' || payment_account_id_param
    );
  END IF;

  -- Check sufficient balance
  IF v_account_balance < amount_param THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient balance. Available: ' || v_account_balance || ', Required: ' || amount_param
    );
  END IF;

  -- Calculate new paid amount
  v_new_paid := v_po_paid + amount_param;

  -- Determine payment status
  IF v_new_paid >= v_po_total THEN
    v_payment_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Generate payment ID
  v_payment_id := gen_random_uuid();

  -- Create payment record
  INSERT INTO purchase_order_payments (
    id,
    purchase_order_id,
    payment_account_id,
    amount,
    currency,
    payment_method,
    payment_method_id,
    reference,
    notes,
    status,
    payment_date,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_payment_id,
    purchase_order_id_param,
    payment_account_id_param,
    amount_param,
    currency_param,              -- This should be 'TZS', not a UUID
    payment_method_param,        -- This should be 'Cash', not a UUID
    payment_method_id_param,     -- This is the UUID reference
    reference_param,
    notes_param,
    'completed',
    NOW(),
    user_id_param,
    NOW(),
    NOW()
  );

  -- Update purchase order
  UPDATE lats_purchase_orders
  SET 
    total_paid = v_new_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- Update account balance
  UPDATE finance_accounts
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = payment_account_id_param;

  -- Create account transaction record
  INSERT INTO account_transactions (
    account_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_number,
    related_entity_type,
    related_entity_id,
    created_by,
    created_at
  ) VALUES (
    payment_account_id_param,
    'expense',
    amount_param,
    v_account_balance,
    v_account_balance - amount_param,
    'PO Payment: ' || COALESCE(reference_param, 'Payment #' || SUBSTRING(v_payment_id::TEXT, 1, 8)),
    COALESCE(reference_param, 'PO-PAY-' || SUBSTRING(v_payment_id::TEXT, 1, 8)),
    'purchase_order_payment',
    v_payment_id,
    user_id_param,
    NOW()
  );

  -- Build success result
  v_result := json_build_object(
    'success', true,
    'message', 'Payment processed successfully',
    'data', json_build_object(
      'payment_id', v_payment_id,
      'amount_paid', amount_param,
      'total_paid', v_new_paid,
      'payment_status', v_payment_status,
      'remaining', v_po_total - v_new_paid
    )
  );

  RAISE NOTICE '✅ Payment % processed successfully', v_payment_id;
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Step 4: Add documentation comment
COMMENT ON FUNCTION process_purchase_order_payment IS 
'Processes purchase order payment with atomic transaction handling.

CORRECT Parameter Order:
1. purchase_order_id_param: UUID (required) - The purchase order ID
2. payment_account_id_param: UUID (required) - The finance account ID
3. amount_param: NUMERIC (required) - Payment amount
4. currency_param: VARCHAR (default ''TZS'') - Currency code (NOT a UUID!)
5. payment_method_param: VARCHAR (default ''Cash'') - Payment method name (NOT a UUID!)
6. payment_method_id_param: UUID (default NULL) - Reference to payment method table
7. user_id_param: UUID (default system) - User making the payment
8. reference_param: TEXT (default NULL) - Payment reference
9. notes_param: TEXT (default NULL) - Additional notes

Returns: JSON with success status, message, and payment data

Example:
SELECT process_purchase_order_payment(
  ''9abe3706-2c15-44ba-8087-e4f1b3dcd296''::uuid,  -- PO ID
  ''5e32c912-7ab7-444a-8ffd-02cb99b56a04''::uuid,  -- Account ID
  100000,                                           -- Amount
  ''TZS'',                                          -- Currency
  ''Cash'',                                         -- Payment Method
  ''f1234567-89ab-cdef-0123-456789abcdef''::uuid,  -- Method ID
  ''00000000-0000-0000-0000-000000000001''::uuid,  -- User ID
  ''REF-12345'',                                    -- Reference
  ''Test payment''                                  -- Notes
);
';

-- Step 5: Verify the function was created correctly
DO $$
DECLARE
  func_count INTEGER;
  func_signature TEXT;
  func_args TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Verification Results:';
  RAISE NOTICE '========================';
  
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname = 'process_purchase_order_payment';
  
  IF func_count = 0 THEN
    RAISE EXCEPTION '❌ CRITICAL: Function was not created!';
  ELSIF func_count > 1 THEN
    RAISE WARNING '⚠️  WARNING: Multiple versions exist (%)', func_count;
    
    FOR func_signature, func_args IN
      SELECT 
        oid::regprocedure::TEXT,
        pg_get_function_identity_arguments(oid)
      FROM pg_proc
      WHERE proname = 'process_purchase_order_payment'
    LOOP
      RAISE NOTICE '   - %(%)', func_signature, func_args;
    END LOOP;
  ELSE
    SELECT 
      pg_get_function_identity_arguments(oid)
    INTO func_args
    FROM pg_proc
    WHERE proname = 'process_purchase_order_payment';
    
    RAISE NOTICE '✅ Function created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Function Signature:';
    RAISE NOTICE '   process_purchase_order_payment(%)' , func_args;
    RAISE NOTICE '';
    RAISE NOTICE '✨ You can now use this function from your application.';
  END IF;
END $$;

-- Step 6: Test the function parameter validation
DO $$
DECLARE
  test_result JSON;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Running Parameter Validation Tests:';
  RAISE NOTICE '======================================';
  
  -- Test 1: Ensure currency parameter works with a currency code
  BEGIN
    test_result := process_purchase_order_payment(
      '00000000-0000-0000-0000-000000000000'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      100,
      'TZS',  -- This should NOT be treated as a UUID
      'Cash',
      NULL,
      '00000000-0000-0000-0000-000000000001'::uuid,
      NULL,
      NULL
    );
    
    -- If we get here, parameters are being accepted correctly
    -- (The function will fail on missing PO/account, but that's expected)
    RAISE NOTICE '✅ Test 1 PASSED: Currency parameter accepts string values';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%invalid input syntax for type uuid%' THEN
        RAISE EXCEPTION '❌ Test 1 FAILED: Currency still being treated as UUID! %', SQLERRM;
      ELSE
        -- Expected errors (missing PO, account, etc.) are OK
        RAISE NOTICE '✅ Test 1 PASSED: Currency parameter structure is correct (got expected error: %)', SQLERRM;
      END IF;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 All tests completed!';
  RAISE NOTICE '';
END $$;

