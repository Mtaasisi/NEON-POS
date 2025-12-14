-- Fix process_purchase_order_payment function to include branch_id in account_transactions
-- This ensures PO payment expenses are properly recorded with branch isolation

-- Drop and recreate the function with branch_id support
CREATE OR REPLACE FUNCTION public.process_purchase_order_payment(
  purchase_order_id_param uuid, 
  payment_account_id_param uuid, 
  amount_param numeric, 
  currency_param character varying DEFAULT 'TZS'::character varying, 
  payment_method_param character varying DEFAULT 'Cash'::character varying, 
  payment_method_id_param uuid DEFAULT NULL::uuid, 
  user_id_param uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid, 
  reference_param text DEFAULT NULL::text, 
  notes_param text DEFAULT NULL::text
) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_payment_id UUID;
  v_po_total NUMERIC;
  v_po_paid NUMERIC;
  v_new_paid NUMERIC;
  v_payment_status VARCHAR;
  v_account_balance NUMERIC;
  v_branch_id UUID;
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

  -- Get current purchase order details and branch_id
  SELECT total_amount, COALESCE(total_paid, 0), branch_id
  INTO v_po_total, v_po_paid, v_branch_id
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found: ' || purchase_order_id_param
    );
  END IF;

  -- If PO doesn't have branch_id, try to get from payment account
  IF v_branch_id IS NULL THEN
    SELECT branch_id INTO v_branch_id
    FROM finance_accounts
    WHERE id = payment_account_id_param;
  END IF;

  -- If still no branch_id, get first active branch as fallback
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;
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

  -- Create account transaction record WITH branch_id
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
    branch_id,  -- ✅ ADDED: Include branch_id for proper expense tracking
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
    v_branch_id,  -- ✅ ADDED: Set branch_id for proper expense tracking
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
      'remaining', v_po_total - v_new_paid,
      'branch_id', v_branch_id  -- ✅ ADDED: Include branch_id in response
    )
  );

  RAISE NOTICE '✅ Payment % processed successfully with branch_id %', v_payment_id, v_branch_id;
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
$_$;

-- Add comment for documentation
COMMENT ON FUNCTION public.process_purchase_order_payment(uuid, uuid, numeric, character varying, character varying, uuid, uuid, text, text) IS 'Processes purchase order payment with atomic transaction handling and branch_id tracking for expenses.

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

Returns: JSON with success status, message, and payment data including branch_id

FIXED: Now includes branch_id in account_transactions for proper expense tracking and branch isolation.';

