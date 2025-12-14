-- ============================================
-- FIX CURRENCY CONVERSION IN PURCHASE ORDER PAYMENTS
-- ============================================
-- This migration fixes the payment calculation to properly handle currency conversion
-- The issue: Payments in TZS were being compared directly with PO totals in foreign currencies
-- The fix: Use total_amount_base_currency for comparison (all values in TZS)
-- ============================================

-- Drop and recreate the payment processing function with currency conversion support
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
  v_po_total_base DECIMAL;  -- Total in base currency (TZS)
  v_po_paid DECIMAL;
  v_new_paid DECIMAL;
  v_po_currency VARCHAR;
  v_exchange_rate DECIMAL;
  v_payment_status VARCHAR;
  v_result JSON;
  v_account_balance DECIMAL;
BEGIN
  -- Validate that currency is not a UUID
  IF currency_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid currency parameter: appears to be a UUID instead of currency code'
    );
  END IF;

  -- Get current purchase order details including currency information
  SELECT 
    total_amount,
    COALESCE(total_amount_base_currency, total_amount) as total_base,
    COALESCE(total_paid, 0) as paid,
    COALESCE(currency, 'TZS') as po_currency,
    COALESCE(exchange_rate, 1.0) as rate
  INTO 
    v_po_total,
    v_po_total_base,
    v_po_paid,
    v_po_currency,
    v_exchange_rate
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- Check if purchase order exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found'
    );
  END IF;

  -- Get account balance
  SELECT balance INTO v_account_balance
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment account not found'
    );
  END IF;

  -- Check sufficient balance
  IF v_account_balance < amount_param THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient balance. Available: ' || v_account_balance || ', Required: ' || amount_param
    );
  END IF;

  -- Calculate new total paid (always in TZS)
  v_new_paid := v_po_paid + amount_param;

  -- Determine payment status by comparing with base currency total
  -- This ensures proper comparison regardless of PO currency
  IF v_new_paid >= v_po_total_base THEN
    v_payment_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Generate payment ID
  v_payment_id := gen_random_uuid();

  -- Log payment processing for debugging
  RAISE NOTICE '💰 Processing payment: PO=%, Amount=% %, PO Currency=%, PO Total=% (% TZS), Paid=% TZS, New Total=% TZS, Status=%',
    purchase_order_id_param, amount_param, currency_param, v_po_currency, v_po_total, v_po_total_base, v_po_paid, v_new_paid, v_payment_status;

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

  -- Update purchase order with new payment status
  UPDATE lats_purchase_orders
  SET 
    total_paid = v_new_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- Update account balance (deduct payment)
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
      'currency', currency_param,
      'new_total_paid', v_new_paid,
      'payment_status', v_payment_status,
      'po_currency', v_po_currency,
      'po_total', v_po_total,
      'po_total_base_currency', v_po_total_base,
      'remaining_amount', GREATEST(0, v_po_total_base - v_new_paid)
    )
  );

  RETURN v_result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION process_purchase_order_payment IS 
  'Processes purchase order payments with proper currency conversion. ' ||
  'All payments are processed in TZS and compared against total_amount_base_currency ' ||
  'to ensure accurate payment status regardless of the PO currency.';

-- ============================================
-- FIX EXISTING OVERPAID PURCHASE ORDERS
-- ============================================
-- Recalculate payment status for all POs using base currency

DO $$
DECLARE
  po_record RECORD;
  v_new_status VARCHAR;
  v_total_base DECIMAL;
  v_total_paid DECIMAL;
  v_updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Starting to fix overpaid purchase orders...';
  
  FOR po_record IN 
    SELECT 
      id,
      po_number,
      currency,
      total_amount,
      COALESCE(total_amount_base_currency, total_amount) as total_base,
      COALESCE(total_paid, 0) as paid,
      payment_status,
      exchange_rate
    FROM lats_purchase_orders
    WHERE payment_status IN ('overpaid', 'paid', 'partial', 'unpaid')
  LOOP
    v_total_base := po_record.total_base;
    v_total_paid := po_record.paid;
    
    -- Determine correct payment status based on base currency
    IF v_total_paid >= v_total_base THEN
      v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'unpaid';
    END IF;
    
    -- Only update if status changed
    IF v_new_status != po_record.payment_status THEN
      UPDATE lats_purchase_orders
      SET 
        payment_status = v_new_status,
        updated_at = NOW()
      WHERE id = po_record.id;
      
      v_updated_count := v_updated_count + 1;
      
      RAISE NOTICE '✅ Fixed PO %: % -> % (Total: % %, Paid: % TZS, Base: % TZS)',
        po_record.po_number,
        po_record.payment_status,
        v_new_status,
        po_record.total_amount,
        po_record.currency,
        v_total_paid,
        v_total_base;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed % purchase orders with incorrect payment status', v_updated_count;
END;
$$;

-- ============================================
-- VERIFY THE FIX
-- ============================================
SELECT 
  po.po_number,
  po.currency,
  po.total_amount as "Total (Original Currency)",
  po.total_amount_base_currency as "Total (TZS)",
  po.total_paid as "Paid (TZS)",
  po.exchange_rate,
  po.payment_status,
  CASE 
    WHEN po.total_paid >= COALESCE(po.total_amount_base_currency, po.total_amount) THEN 'paid'
    WHEN po.total_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END as "Expected Status",
  COALESCE(po.total_amount_base_currency, po.total_amount) - po.total_paid as "Remaining (TZS)"
FROM lats_purchase_orders po
WHERE po.payment_status != 'cancelled'
ORDER BY po.created_at DESC
LIMIT 20;

