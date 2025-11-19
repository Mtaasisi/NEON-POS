-- ============================================
-- FINAL FIX: Drop and recreate process_purchase_order_payment
-- This ensures no cached versions or signature mismatches
-- ============================================

-- Step 1: Drop ALL versions using dynamic SQL
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT oid::regprocedure 
    FROM pg_proc 
    WHERE proname = 'process_purchase_order_payment'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    RAISE NOTICE 'Dropped function: %', r.oid::regprocedure;
  END LOOP;
END $$;

-- Step 2: Create the function with STRICT parameter validation
CREATE OR REPLACE FUNCTION process_purchase_order_payment(
  purchase_order_id_param UUID,
  payment_account_id_param UUID,
  amount_param NUMERIC,
  currency_param VARCHAR DEFAULT 'TZS',
  payment_method_param VARCHAR DEFAULT 'Cash',
  payment_method_id_param UUID DEFAULT NULL,
  user_id_param UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  reference_param TEXT DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with function creator's permissions
AS $$
DECLARE
  v_payment_id UUID;
  v_po_total NUMERIC;
  v_po_paid NUMERIC;
  v_new_paid NUMERIC;
  v_payment_status VARCHAR;
  v_result JSON;
BEGIN
  -- Parameter validation with detailed error messages
  IF purchase_order_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Purchase order ID is required');
  END IF;
  
  IF payment_account_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Payment account ID is required');
  END IF;
  
  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Payment amount must be greater than 0');
  END IF;
  
  -- Validate currency is NOT a UUID
  IF currency_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'Invalid currency: "' || currency_param || '" appears to be a UUID. Expected currency code like TZS, USD, etc.'
    );
  END IF;
  
  -- Validate payment method is NOT a UUID
  IF payment_method_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'Invalid payment method: "' || payment_method_param || '" appears to be a UUID. Expected method name like Cash, Bank Transfer, etc.'
    );
  END IF;
  
  -- Get purchase order details
  SELECT total_amount, COALESCE(total_paid, 0)
  INTO v_po_total, v_po_paid
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Purchase order not found');
  END IF;

  -- Calculate new totals
  v_new_paid := v_po_paid + amount_param;

  -- Determine payment status
  IF v_new_paid >= v_po_total THEN
    v_payment_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

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
    gen_random_uuid(),
    purchase_order_id_param,
    payment_account_id_param,
    amount_param,
    currency_param,
    payment_method_param,
    payment_method_id_param,
    reference_param,
    notes_param,
    'completed',
    NOW(),
    user_id_param,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payment_id;

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

  -- Return success result
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

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION process_purchase_order_payment IS 'Processes purchase order payments with atomic transaction handling. Parameters: PO ID (uuid), Account ID (uuid), Amount (numeric), Currency (varchar), Payment Method (varchar), Method ID (uuid), User ID (uuid), Reference (text), Notes (text)';

-- Verify creation
DO $$
DECLARE
  func_count INTEGER;
  func_signature TEXT;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname = 'process_purchase_order_payment';
  
  IF func_count = 0 THEN
    RAISE EXCEPTION '❌ Function was not created!';
  ELSIF func_count > 1 THEN
    RAISE WARNING '⚠️  Multiple versions exist: %', func_count;
  ELSE
    SELECT pg_get_function_identity_arguments(oid)
    INTO func_signature
    FROM pg_proc
    WHERE proname = 'process_purchase_order_payment';
    
    RAISE NOTICE '✅ Function created successfully!';
    RAISE NOTICE '📋 Signature: process_purchase_order_payment(%)', func_signature;
  END IF;
END $$;

