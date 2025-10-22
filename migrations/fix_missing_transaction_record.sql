-- ============================================
-- FIX: Add Transaction Record Creation to PO Payment Processing
-- ============================================
-- This fixes the missing transaction records in account_transactions
-- when processing purchase order payments

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
  v_po_number VARCHAR;
  v_supplier_name VARCHAR;
  v_balance_before DECIMAL;
  v_balance_after DECIMAL;
  v_reference_number VARCHAR;
BEGIN
  -- Log the input parameters for debugging
  RAISE NOTICE 'Processing payment: PO=%, Account=%, Amount=%, Currency=%, Method=%', 
    purchase_order_id_param, payment_account_id_param, amount_param, currency_param, payment_method_param;

  -- Validate that currency is not a UUID
  IF currency_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid currency parameter: appears to be a UUID instead of currency code'
    );
  END IF;

  -- Get current purchase order details including PO number and supplier
  SELECT 
    po.total_amount, 
    COALESCE(po.total_paid, 0),
    po.po_number,
    s.name
  INTO v_po_total, v_po_paid, v_po_number, v_supplier_name
  FROM lats_purchase_orders po
  LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
  WHERE po.id = purchase_order_id_param;

  -- Check if purchase order exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found'
    );
  END IF;

  -- Get current account balance BEFORE the transaction
  SELECT balance INTO v_balance_before
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment account not found'
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

  -- Create payment record with explicit column order
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
    'completed',
    NOW(),
    user_id_param,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payment_id;

  -- Update purchase order payment status and total paid
  UPDATE lats_purchase_orders
  SET 
    total_paid = v_new_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- Update finance account balance (deduct payment)
  UPDATE finance_accounts
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = payment_account_id_param
  RETURNING balance INTO v_balance_after;

  -- Generate reference number
  v_reference_number := 'PO-PAY-' || substring(v_payment_id::text, 1, 8);

  -- **FIX: Create transaction record in account_transactions**
  INSERT INTO account_transactions (
    id,
    account_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_number,
    description,
    related_transaction_id,
    metadata,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    payment_account_id_param,
    'expense',  -- PO payments are expenses
    amount_param,
    v_balance_before,
    v_balance_after,
    v_reference_number,
    'PO Payment: ' || COALESCE(v_po_number, 'Unknown') || ' - ' || COALESCE(v_supplier_name, 'Unknown Supplier'),
    v_payment_id,  -- Link to the payment record
    jsonb_build_object(
      'purchase_order_id', purchase_order_id_param,
      'purchase_order_number', v_po_number,
      'supplier_name', v_supplier_name,
      'payment_method', payment_method_param,
      'currency', currency_param,
      'notes', notes_param
    ),
    user_id_param,
    NOW(),
    NOW()
  );

  -- Build result
  v_result := json_build_object(
    'success', true,
    'message', 'Payment processed successfully',
    'data', json_build_object(
      'payment_id', v_payment_id,
      'reference_number', v_reference_number,
      'amount_paid', amount_param,
      'total_paid', v_new_paid,
      'payment_status', v_payment_status,
      'remaining', v_po_total - v_new_paid,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Payment processing error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION process_purchase_order_payment IS 'Atomically processes a purchase order payment, updates PO status, adjusts account balance, and creates transaction record. FIXED to include account_transactions entry.';

