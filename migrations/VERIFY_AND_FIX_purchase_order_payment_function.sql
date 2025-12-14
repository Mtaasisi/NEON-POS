-- ============================================
-- VERIFY AND FIX PURCHASE ORDER PAYMENT FUNCTION
-- ============================================

-- Step 1: Check what functions exist
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'process_purchase_order_payment';

-- Step 2: Drop ALL versions of the function (including overloaded versions)
DROP FUNCTION IF EXISTS process_purchase_order_payment(UUID, UUID, DECIMAL, VARCHAR, VARCHAR, UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS process_purchase_order_payment(UUID, UUID, DECIMAL, VARCHAR, VARCHAR, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS process_purchase_order_payment(UUID, UUID, DECIMAL, VARCHAR, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS process_purchase_order_payment CASCADE;

-- Step 3: Create the function with explicit parameter order and type casting
CREATE OR REPLACE FUNCTION process_purchase_order_payment(
  purchase_order_id_param UUID,
  payment_account_id_param UUID,
  amount_param DECIMAL,
  currency_param VARCHAR DEFAULT 'TZS',
  payment_method_param VARCHAR DEFAULT 'Cash',
  payment_method_id_param UUID DEFAULT NULL,
  user_id_param UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  reference_param TEXT DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id UUID;
  v_po_total DECIMAL;
  v_po_paid DECIMAL;
  v_new_paid DECIMAL;
  v_payment_status VARCHAR;
  v_result JSON;
BEGIN
  -- Extensive logging
  RAISE NOTICE '=== PAYMENT PROCESSING START ===';
  RAISE NOTICE 'PO ID: %', purchase_order_id_param;
  RAISE NOTICE 'Account ID: %', payment_account_id_param;
  RAISE NOTICE 'Amount: %', amount_param;
  RAISE NOTICE 'Currency: %', currency_param;
  RAISE NOTICE 'Method: %', payment_method_param;
  RAISE NOTICE 'Method ID: %', payment_method_id_param;
  
  -- Validate parameters are correct types
  IF NOT (purchase_order_id_param::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'Invalid purchase_order_id format: %', purchase_order_id_param;
  END IF;
  
  IF NOT (payment_account_id_param::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'Invalid payment_account_id format: %', payment_account_id_param;
  END IF;
  
  IF currency_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Currency parameter appears to be a UUID: %', currency_param;
  END IF;
  
  -- Get current purchase order details
  SELECT total_amount, COALESCE(total_paid, 0)
  INTO v_po_total, v_po_paid
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found'
    );
  END IF;

  -- Calculate new total paid
  v_new_paid := v_po_paid + amount_param;

  -- Determine payment status
  IF v_new_paid >= v_po_total THEN
    v_payment_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Insert payment with explicit column names and values
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
    gen_random_uuid(),
    purchase_order_id_param,
    payment_account_id_param,
    amount_param,
    currency_param::VARCHAR,
    payment_method_param::VARCHAR,
    payment_method_id_param,
    reference_param,
    notes_param,
    'completed'::VARCHAR,
    NOW(),
    user_id_param,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payment_id;

  RAISE NOTICE 'Payment record created: %', v_payment_id;

  -- Update purchase order
  UPDATE lats_purchase_orders
  SET 
    total_paid = v_new_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- Update finance account balance
  UPDATE finance_accounts
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = payment_account_id_param;

  -- Build result
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

  RAISE NOTICE '=== PAYMENT PROCESSING END ===';
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Payment error: % (State: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION process_purchase_order_payment IS 'Processes purchase order payments with extensive validation and logging';

-- Verify the function signature
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'process_purchase_order_payment'
AND n.nspname = 'public';

