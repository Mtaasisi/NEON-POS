-- ============================================
-- CREATE PROCESS PURCHASE ORDER PAYMENT FUNCTION
-- ============================================
-- This function atomically processes a purchase order payment
-- including creating the payment record and updating the PO status

-- Drop existing function (all versions)
DROP FUNCTION IF EXISTS process_purchase_order_payment CASCADE;

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
  -- Get current purchase order details
  SELECT total_amount, COALESCE(total_paid, 0)
  INTO v_po_total, v_po_paid
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- Check if purchase order exists
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

-- Add comment for documentation
COMMENT ON FUNCTION process_purchase_order_payment IS 'Atomically processes a purchase order payment, updates PO status, and adjusts account balance';

