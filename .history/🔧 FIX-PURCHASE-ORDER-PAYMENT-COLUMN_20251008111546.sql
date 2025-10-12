-- ============================================
-- FIX PURCHASE ORDER PAYMENT COLUMN MISMATCH
-- ============================================
-- This fixes the "method" column error
-- Run this in your Neon Database SQL Editor NOW
-- ============================================

-- Step 1: Check current column structure
DO $$ 
DECLARE
  has_method BOOLEAN;
  has_payment_method BOOLEAN;
BEGIN
  -- Check if 'method' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
  ) INTO has_method;

  -- Check if 'payment_method' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method'
  ) INTO has_payment_method;

  RAISE NOTICE '📊 Current state:';
  RAISE NOTICE '   - Has "method" column: %', has_method;
  RAISE NOTICE '   - Has "payment_method" column: %', has_payment_method;

  -- Fix the column name to match what the function expects
  IF has_payment_method AND NOT has_method THEN
    RAISE NOTICE '🔧 Renaming "payment_method" to "method"...';
    ALTER TABLE purchase_order_payments RENAME COLUMN payment_method TO method;
    RAISE NOTICE '✅ Column renamed successfully!';
  ELSIF NOT has_method AND NOT has_payment_method THEN
    RAISE NOTICE '🔧 Adding "method" column...';
    ALTER TABLE purchase_order_payments ADD COLUMN method TEXT;
    RAISE NOTICE '✅ Column added successfully!';
  ELSE
    RAISE NOTICE '✅ Column "method" already exists!';
  END IF;
END $$;

-- Step 2: Ensure all required columns exist
DO $$ 
BEGIN
  -- Add payment_account_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_account_id'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN payment_account_id UUID REFERENCES finance_accounts(id);
    RAISE NOTICE '✅ Added payment_account_id column';
  END IF;

  -- Add payment_method_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method_id'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN payment_method_id UUID REFERENCES finance_accounts(id);
    RAISE NOTICE '✅ Added payment_method_id column';
  END IF;

  -- Add payment_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN payment_date TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added payment_date column';
  END IF;
END $$;

-- Step 3: Recreate the function with correct column name
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

  -- Insert payment record (using 'method' column)
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

      -- Update finance account balance
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
    -- Ignore finance transaction errors
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION process_purchase_order_payment(
  UUID, UUID, DECIMAL, TEXT, TEXT, UUID, UUID, TEXT, TEXT
) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON purchase_order_payments TO authenticated;
GRANT SELECT, UPDATE ON lats_purchase_orders TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show the current table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'purchase_order_payments'
ORDER BY ordinal_position;

-- Show the function details
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'process_purchase_order_payment'
  AND n.nspname = 'public';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅✅✅ PURCHASE ORDER PAYMENT COLUMN FIX COMPLETE! ✅✅✅';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 The "method" column issue has been fixed!';
  RAISE NOTICE '🎉 The payment processing function has been updated!';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Next step: Go back to your app and try making a payment again!';
  RAISE NOTICE '👉 The error should be gone now!';
END $$;

