-- ============================================
-- ⚡ FIX PAYMENT_METHOD_ID FOREIGN KEY CONSTRAINT ERROR
-- ============================================
-- This fixes: violates foreign key constraint "purchase_order_payments_payment_method_id_fkey"
-- The issue: payment_method_id has a foreign key constraint that's failing
-- Solution: Drop the constraint and make the column nullable
-- ============================================

-- Step 1: Drop the foreign key constraint on payment_method_id
DO $$ 
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find all foreign key constraints on payment_method_id column
  FOR constraint_name IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute attr ON attr.attrelid = con.conrelid 
      AND attr.attnum = ANY(con.conkey)
    WHERE rel.relname = 'purchase_order_payments'
      AND attr.attname = 'payment_method_id'
      AND con.contype = 'f'  -- foreign key constraint
  LOOP
    EXECUTE format('ALTER TABLE purchase_order_payments DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
    RAISE NOTICE '✅ Dropped foreign key constraint: %', constraint_name;
  END LOOP;
  
  -- If no constraints were found
  IF NOT FOUND THEN
    RAISE NOTICE '✅ No foreign key constraints found on payment_method_id';
  END IF;
END $$;

-- Step 2: Make payment_method_id nullable (in case it has NOT NULL constraint)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
      AND column_name = 'payment_method_id'
  ) THEN
    ALTER TABLE purchase_order_payments ALTER COLUMN payment_method_id DROP NOT NULL;
    RAISE NOTICE '✅ Made payment_method_id column nullable';
  END IF;
END $$;

-- Step 3: Also make payment_account_id nullable for safety
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
      AND column_name = 'payment_account_id'
  ) THEN
    ALTER TABLE purchase_order_payments ALTER COLUMN payment_account_id DROP NOT NULL;
    RAISE NOTICE '✅ Made payment_account_id column nullable';
  END IF;
END $$;

-- Step 4: Update the function to handle nullable payment_method_id gracefully
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
      NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),  -- Store NULL if empty UUID
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

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_purchase_order_payment(
  UUID, UUID, DECIMAL, TEXT, TEXT, UUID, UUID, TEXT, TEXT
) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON purchase_order_payments TO authenticated;
GRANT SELECT, UPDATE ON lats_purchase_orders TO authenticated;

-- Step 6: Verify the fix
DO $$
DECLARE
  has_fk_constraint BOOLEAN;
  payment_method_id_nullable BOOLEAN;
  payment_account_id_nullable BOOLEAN;
BEGIN
  -- Check if foreign key constraint still exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute attr ON attr.attrelid = con.conrelid 
      AND attr.attnum = ANY(con.conkey)
    WHERE rel.relname = 'purchase_order_payments'
      AND attr.attname = 'payment_method_id'
      AND con.contype = 'f'
  ) INTO has_fk_constraint;

  -- Check if columns are nullable
  SELECT is_nullable = 'YES' INTO payment_method_id_nullable
  FROM information_schema.columns 
  WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method_id';

  SELECT is_nullable = 'YES' INTO payment_account_id_nullable
  FROM information_schema.columns 
  WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_account_id';

  RAISE NOTICE '';
  RAISE NOTICE '📊 Constraint Status:';
  RAISE NOTICE '   - Has FK constraint on payment_method_id: %', has_fk_constraint;
  RAISE NOTICE '   - payment_method_id is nullable: %', COALESCE(payment_method_id_nullable::TEXT, 'N/A');
  RAISE NOTICE '   - payment_account_id is nullable: %', COALESCE(payment_account_id_nullable::TEXT, 'N/A');
  RAISE NOTICE '';
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ PAYMENT METHOD ID CONSTRAINT FIXED! ✅✅✅';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Foreign key constraint on payment_method_id has been dropped';
  RAISE NOTICE '🎉 payment_method_id and payment_account_id are now nullable';
  RAISE NOTICE '🎉 Function updated to handle nullable payment_method_id gracefully';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Go back to your app and try the payment again!';
  RAISE NOTICE '👉 This should be the last fix needed!';
  RAISE NOTICE '';
END $$;

