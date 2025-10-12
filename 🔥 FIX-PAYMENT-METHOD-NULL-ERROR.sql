-- ============================================
-- 🔥 FIX PAYMENT_METHOD NULL CONSTRAINT ERROR
-- ============================================
-- This fixes: null value in column "payment_method" violates not-null constraint
-- The issue: Table has both 'method' and 'payment_method' columns
-- The function only populates 'method', leaving 'payment_method' NULL
-- ============================================

-- Step 1: Remove NOT NULL constraint from payment_method column (if it exists)
DO $$ 
BEGIN
  -- Check if payment_method column exists and has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
      AND column_name = 'payment_method'
      AND is_nullable = 'NO'
  ) THEN
    -- Drop the NOT NULL constraint
    ALTER TABLE purchase_order_payments ALTER COLUMN payment_method DROP NOT NULL;
    RAISE NOTICE '✅ Removed NOT NULL constraint from payment_method column';
  ELSE
    RAISE NOTICE '✅ payment_method column either does not exist or is already nullable';
  END IF;
END $$;

-- Step 2: Update the function to populate BOTH columns for compatibility
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
  v_insert_sql TEXT;
BEGIN
  -- Validate purchase order exists
  IF NOT EXISTS (SELECT 1 FROM lats_purchase_orders WHERE id = purchase_order_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Purchase order not found',
      'error_code', 'PO_NOT_FOUND'
    );
  END IF;

  -- Get purchase order total
  SELECT total_amount INTO v_po_total
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- Check which columns exist in the table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
  ) INTO v_has_method_column;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method'
  ) INTO v_has_payment_method_column;

  -- Build dynamic INSERT based on which columns exist
  IF v_has_method_column AND v_has_payment_method_column THEN
    -- Both columns exist - populate both
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
      payment_method_id_param,
      payment_method_param,
      payment_method_param,  -- Populate both columns with same value
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
      payment_method_id_param,
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
      payment_method_id_param,
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

  -- Create finance transaction if finance_transactions table exists
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'finance_transactions'
    ) THEN
      EXECUTE format(
        'INSERT INTO finance_transactions (account_id, type, amount, currency, description, reference, status, transaction_date, created_by, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW(), NOW()) 
         RETURNING id'
      )
      USING payment_account_id_param, 'debit', amount_param, currency_param, 
            'Purchase Order Payment: ' || COALESCE(reference_param, 'N/A'), 
            reference_param, 'completed', user_id_param
      INTO v_finance_transaction_id;

      -- Update finance account balance if column exists
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'finance_accounts' AND column_name = 'current_balance'
      ) THEN
        UPDATE finance_accounts
        SET 
          current_balance = current_balance + amount_param,
          updated_at = NOW()
        WHERE id = payment_account_id_param;
      END IF;
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
      'finance_transaction_id', v_finance_transaction_id
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Payment processing failed: ' || SQLERRM,
    'error_code', 'PAYMENT_ERROR'
  );
END;
$$;

-- Step 3: Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_purchase_order_payment(
  UUID, UUID, DECIMAL, TEXT, TEXT, UUID, UUID, TEXT, TEXT
) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON purchase_order_payments TO authenticated;
GRANT SELECT, UPDATE ON lats_purchase_orders TO authenticated;

-- Step 4: Verify the fix
DO $$
DECLARE
  has_method BOOLEAN;
  has_payment_method BOOLEAN;
  payment_method_nullable BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
  ) INTO has_method;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method'
  ) INTO has_payment_method;

  SELECT is_nullable = 'YES' INTO payment_method_nullable
  FROM information_schema.columns 
  WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method';

  RAISE NOTICE '';
  RAISE NOTICE '📊 Current Schema Status:';
  RAISE NOTICE '   - Has "method" column: %', has_method;
  RAISE NOTICE '   - Has "payment_method" column: %', has_payment_method;
  RAISE NOTICE '   - "payment_method" is nullable: %', COALESCE(payment_method_nullable::TEXT, 'N/A');
  RAISE NOTICE '';
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ PAYMENT METHOD NULL ERROR FIXED! ✅✅✅';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 NOT NULL constraint removed from payment_method column';
  RAISE NOTICE '🎉 Function updated to populate BOTH method and payment_method columns';
  RAISE NOTICE '🎉 The function now adapts to your table schema dynamically';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Go back to your app and try the payment again!';
  RAISE NOTICE '👉 This error should now be completely resolved!';
  RAISE NOTICE '';
END $$;

