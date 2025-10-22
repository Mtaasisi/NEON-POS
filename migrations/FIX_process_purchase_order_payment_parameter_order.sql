-- ============================================
-- FIX: process_purchase_order_payment parameter order
-- ============================================
-- This migration drops ALL versions of the function and recreates it
-- with the correct parameter order to match the TypeScript call

-- Step 1: Drop ALL versions of the function
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT oid::regprocedure AS func_sig
    FROM pg_proc 
    WHERE proname = 'process_purchase_order_payment'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    RAISE NOTICE 'Dropped function: %', r.func_sig;
  END LOOP;
END $$;

-- Step 2: Recreate the function with correct parameter order
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
SECURITY DEFINER
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
  -- Validate parameters
  IF purchase_order_id_param IS NULL THEN
    RAISE EXCEPTION 'Purchase order ID cannot be null';
  END IF;
  
  IF payment_account_id_param IS NULL THEN
    RAISE EXCEPTION 'Payment account ID cannot be null';
  END IF;
  
  IF amount_param IS NULL OR amount_param <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  
  IF payment_method_id_param IS NULL THEN
    RAISE EXCEPTION 'Payment method ID cannot be null';
  END IF;

  -- Log the parameters
  RAISE NOTICE 'Processing payment with params: PO=%, Account=%, Amount=%, Currency=%, Method=%', 
    purchase_order_id_param, payment_account_id_param, amount_param, currency_param, payment_method_param;

  -- Get current purchase order details
  SELECT total_amount, total_paid
  INTO v_po_total, v_po_paid
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', purchase_order_id_param;
  END IF;

  -- Calculate new paid amount
  v_new_paid := COALESCE(v_po_paid, 0) + amount_param;

  -- Determine payment status
  IF v_new_paid >= v_po_total THEN
    v_payment_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Check account balance
  SELECT balance INTO v_account_balance
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment account not found: %', payment_account_id_param;
  END IF;

  IF v_account_balance < amount_param THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_account_balance, amount_param;
  END IF;

  -- Generate new payment ID
  v_payment_id := gen_random_uuid();

  -- Insert payment record
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
    'Purchase Order Payment: ' || COALESCE(reference_param, v_payment_id::TEXT),
    COALESCE(reference_param, 'PO-PAY-' || SUBSTRING(v_payment_id::TEXT, 1, 8)),
    'purchase_order_payment',
    v_payment_id,
    user_id_param,
    NOW()
  );

  -- Build result JSON
  v_result := json_build_object(
    'success', true,
    'message', 'Payment processed successfully',
    'data', json_build_object(
      'payment_id', v_payment_id,
      'amount_paid', amount_param,
      'new_total_paid', v_new_paid,
      'payment_status', v_payment_status,
      'remaining_amount', v_po_total - v_new_paid
    )
  );

  RAISE NOTICE 'Payment processed successfully: %', v_payment_id;
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in process_purchase_order_payment: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'data', NULL
    );
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION process_purchase_order_payment IS 
'Processes a purchase order payment atomically. Parameter order:
1. purchase_order_id_param (UUID)
2. payment_account_id_param (UUID)
3. amount_param (NUMERIC)
4. currency_param (VARCHAR, default TZS)
5. payment_method_param (VARCHAR, default Cash)
6. payment_method_id_param (UUID, default NULL)
7. user_id_param (UUID, default system user)
8. reference_param (TEXT, default NULL)
9. notes_param (TEXT, default NULL)';

-- Verify the function was created
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'process_purchase_order_payment';

