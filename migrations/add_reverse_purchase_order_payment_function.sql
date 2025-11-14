-- ============================================
-- REVERSE PURCHASE ORDER PAYMENT FUNCTION
-- ============================================
-- Provides an atomic way to undo a purchase order payment by
-- restoring finance account balances, removing ledger entries,
-- deleting related expenses, and updating the purchase order
-- totals/status. Exposed via RPC for the UI undo button.
-- ============================================

CREATE OR REPLACE FUNCTION public.reverse_purchase_order_payment(
  payment_id_param UUID,
  user_id_param UUID DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment               purchase_order_payments%ROWTYPE;
  v_po                    lats_purchase_orders%ROWTYPE;
  v_total_base            NUMERIC := 0;
  v_new_total_paid        NUMERIC := 0;
  v_new_status            TEXT := 'unpaid';
  v_account               finance_accounts%ROWTYPE;
  v_deleted_transactions  INTEGER := 0;
  v_deleted_expenses      INTEGER := 0;
  v_receipt_number        TEXT;
BEGIN
  -- Lock payment row to prevent concurrent reversals
  SELECT *
  INTO v_payment
  FROM purchase_order_payments
  WHERE id = payment_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment not found'
    );
  END IF;

  -- Lock the related purchase order row
  SELECT *
  INTO v_po
  FROM lats_purchase_orders
  WHERE id = v_payment.purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Related purchase order not found'
    );
  END IF;

  -- Calculate new totals and payment status
  v_new_total_paid := GREATEST(COALESCE(v_po.total_paid, 0) - COALESCE(v_payment.amount, 0), 0);
  v_total_base := COALESCE(v_po.total_amount_base_currency, v_po.total_amount, 0);

  IF v_new_total_paid <= 0 THEN
    v_new_status := 'unpaid';
  ELSIF v_total_base > 0 AND v_new_total_paid >= v_total_base THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Restore finance account balance
  UPDATE finance_accounts
  SET balance = balance + COALESCE(v_payment.amount, 0),
      updated_at = NOW()
  WHERE id = v_payment.payment_account_id
  RETURNING * INTO v_account;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Related finance account not found'
    );
  END IF;

  -- Remove linked account transactions
  DELETE FROM account_transactions
  WHERE related_entity_type = 'purchase_order_payment'
    AND related_entity_id = v_payment.id;
  GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;

  -- Remove any finance expense created by the payment trigger
  v_receipt_number := COALESCE(v_payment.reference, 'PO-PAY-' || SUBSTRING(v_payment.id::TEXT, 1, 8));

  DELETE FROM finance_expenses
  WHERE receipt_number = v_receipt_number
     OR description ILIKE '%' || v_payment.id::TEXT || '%';
  GET DIAGNOSTICS v_deleted_expenses = ROW_COUNT;

  -- Delete the payment record itself
  DELETE FROM purchase_order_payments
  WHERE id = v_payment.id;

  -- Update purchase order totals and status
  UPDATE lats_purchase_orders
  SET total_paid = v_new_total_paid,
      payment_status = v_new_status,
      updated_at = NOW()
  WHERE id = v_payment.purchase_order_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Payment reversed successfully',
    'data', json_build_object(
      'purchase_order_id', v_payment.purchase_order_id,
      'amount_reversed', v_payment.amount,
      'new_total_paid', v_new_total_paid,
      'payment_status', v_new_status,
      'account_id', v_account.id,
      'account_balance', v_account.balance,
      'transactions_removed', v_deleted_transactions,
      'expenses_removed', v_deleted_expenses,
      'performed_by', user_id_param,
      'performed_at', NOW()
    )
  );
END;
$$;

COMMENT ON FUNCTION public.reverse_purchase_order_payment(UUID, UUID) IS
  'Reverses a purchase order payment, restoring balances, removing related records, and updating the purchase order totals.';

GRANT EXECUTE ON FUNCTION public.reverse_purchase_order_payment(UUID, UUID) TO authenticated;

