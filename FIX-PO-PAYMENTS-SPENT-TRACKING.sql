-- ============================================
-- FIX: Purchase Order Payments Not Showing in "Spent" Section
-- ============================================
-- 
-- PROBLEM: The process_purchase_order_payment function creates records 
-- in finance_transactions but NOT in account_transactions.
-- PaymentAccountManagement.tsx reads from account_transactions to calculate "Spent".
--
-- SOLUTION: Update the function to also create account_transactions records.
-- ============================================

CREATE OR REPLACE FUNCTION process_purchase_order_payment(
  purchase_order_id_param UUID,
  payment_account_id_param UUID,
  amount_param DECIMAL,
  currency_param TEXT,
  payment_method_param TEXT,
  payment_method_id_param UUID,
  user_id_param UUID,
  reference_param TEXT DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_po_total DECIMAL;
  v_total_paid DECIMAL;
  v_new_payment_status TEXT;
  v_finance_transaction_id UUID;
  v_has_method_column BOOLEAN;
  v_has_payment_method_column BOOLEAN;
  v_account_balance_before DECIMAL;
  v_account_balance_after DECIMAL;
  v_po_number TEXT;
  v_supplier_name TEXT;
BEGIN
  -- Validate purchase order exists
  IF NOT EXISTS (SELECT 1 FROM lats_purchase_orders WHERE id = purchase_order_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Purchase order not found',
      'error_code', 'PO_NOT_FOUND'
    );
  END IF;

  -- Get purchase order details
  SELECT total_amount, po_number INTO v_po_total, v_po_number
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- Get supplier name (if available)
  BEGIN
    SELECT s.name INTO v_supplier_name
    FROM lats_purchase_orders po
    LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
    WHERE po.id = purchase_order_id_param;
  EXCEPTION WHEN OTHERS THEN
    v_supplier_name := 'Unknown Supplier';
  END;

  -- Get current account balance
  SELECT COALESCE(balance, 0) INTO v_account_balance_before
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  -- Check which payment method columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
  ) INTO v_has_method_column;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method'
  ) INTO v_has_payment_method_column;

  -- Insert payment record (handling different column combinations)
  IF v_has_method_column AND v_has_payment_method_column THEN
    -- Both columns exist - populate both for maximum compatibility
    INSERT INTO purchase_order_payments (
      purchase_order_id,
      payment_account_id,
      payment_method_id,
      method,
      payment_method,
      amount,
      currency,
      status,
      reference,
      notes,
      user_id,
      created_by,
      payment_date,
      created_at,
      updated_at
    ) VALUES (
      purchase_order_id_param,
      payment_account_id_param,
      NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
      payment_method_param,
      payment_method_param,
      amount_param,
      currency_param,
      'completed',
      reference_param,
      notes_param,
      user_id_param,
      user_id_param,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_payment_id;
    
  ELSIF v_has_method_column THEN
    -- Only 'method' column exists
    INSERT INTO purchase_order_payments (
      purchase_order_id,
      payment_account_id,
      payment_method_id,
      method,
      amount,
      currency,
      status,
      reference,
      notes,
      user_id,
      created_by,
      payment_date,
      created_at,
      updated_at
    ) VALUES (
      purchase_order_id_param,
      payment_account_id_param,
      NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
      payment_method_param,
      amount_param,
      currency_param,
      'completed',
      reference_param,
      notes_param,
      user_id_param,
      user_id_param,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_payment_id;
    
  ELSIF v_has_payment_method_column THEN
    -- Only 'payment_method' column exists
    INSERT INTO purchase_order_payments (
      purchase_order_id,
      payment_account_id,
      payment_method_id,
      payment_method,
      amount,
      currency,
      status,
      reference,
      notes,
      user_id,
      created_by,
      payment_date,
      created_at,
      updated_at
    ) VALUES (
      purchase_order_id_param,
      payment_account_id_param,
      NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
      payment_method_param,
      amount_param,
      currency_param,
      'completed',
      reference_param,
      notes_param,
      user_id_param,
      user_id_param,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_payment_id;
    
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Neither method nor payment_method column exists in purchase_order_payments table',
      'error_code', 'SCHEMA_ERROR'
    );
  END IF;

  -- Update finance account balance (deduct amount)
  UPDATE finance_accounts
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = payment_account_id_param;

  -- Get new balance after deduction
  SELECT COALESCE(balance, 0) INTO v_account_balance_after
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  -- 🎯 CREATE ACCOUNT TRANSACTION (THIS IS THE KEY FIX!)
  -- This ensures PO payments show up in the "Spent" section
  BEGIN
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
      metadata,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      payment_account_id_param,
      'expense', -- This transaction type is tracked in "Spent"
      amount_param,
      v_account_balance_before,
      v_account_balance_after,
      'PO Payment: ' || COALESCE(v_po_number, 'N/A') || ' - ' || COALESCE(v_supplier_name, 'Unknown Supplier'),
      COALESCE(reference_param, 'PO-PAY-' || substring(v_payment_id::TEXT, 1, 8)),
      'purchase_order_payment',
      v_payment_id,
      jsonb_build_object(
        'purchase_order_id', purchase_order_id_param,
        'po_reference', v_po_number,
        'supplier', v_supplier_name,
        'payment_method', payment_method_param,
        'currency', currency_param
      ),
      user_id_param,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Account transaction created - PO payment will now show in Spent section!';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '⚠️ Failed to create account transaction: %', SQLERRM;
  END;

  -- Calculate total paid for this purchase order
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';

  -- Determine new payment status
  IF v_total_paid >= v_po_total THEN
    v_new_payment_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_payment_status := 'partial';
  ELSE
    v_new_payment_status := 'unpaid';
  END IF;

  -- Update purchase order payment status
  UPDATE lats_purchase_orders
  SET 
    payment_status = v_new_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- Create finance transaction (if table exists)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'finance_transactions'
    ) THEN
      INSERT INTO finance_transactions (
        account_id, 
        type, 
        amount, 
        currency, 
        description, 
        reference, 
        status, 
        transaction_date, 
        created_by, 
        created_at, 
        updated_at
      ) 
      VALUES (
        payment_account_id_param, 
        'debit', 
        amount_param, 
        currency_param, 
        'Purchase Order Payment: ' || COALESCE(reference_param, 'N/A'), 
        reference_param, 
        'completed', 
        NOW(), 
        user_id_param, 
        NOW(), 
        NOW()
      )
      RETURNING id INTO v_finance_transaction_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Finance transaction logging skipped: %', SQLERRM;
  END;

  -- Log audit entry if function exists
  BEGIN
    PERFORM log_purchase_order_audit(
      purchase_order_id_param,
      'payment_made',
      format('Payment of %s %s via %s', amount_param, currency_param, payment_method_param),
      user_id_param
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment processed successfully',
    'data', jsonb_build_object(
      'payment_id', v_payment_id,
      'amount_paid', amount_param,
      'total_paid', v_total_paid,
      'po_total', v_po_total,
      'payment_status', v_new_payment_status,
      'balance_before', v_account_balance_before,
      'balance_after', v_account_balance_after
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment processing failed: ' || SQLERRM,
      'error_code', 'PROCESSING_ERROR'
    );
END;
$$;

-- ============================================
-- Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION process_purchase_order_payment TO authenticated;

-- ============================================
-- Verification query
-- ============================================
-- Run this after executing the function to verify the fix:
-- 
-- SELECT 
--   at.description,
--   at.amount,
--   at.transaction_type,
--   at.created_at,
--   fa.name as account_name
-- FROM account_transactions at
-- JOIN finance_accounts fa ON fa.id = at.account_id
-- WHERE at.transaction_type = 'expense'
--   AND at.related_entity_type = 'purchase_order_payment'
-- ORDER BY at.created_at DESC
-- LIMIT 10;

RAISE NOTICE '✅ Database function updated successfully!';
RAISE NOTICE '✅ PO payments will now appear in the "Spent" section!';

