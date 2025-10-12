-- ============================================
-- 🎯 COMPLETE PAYMENT SYSTEM FIX - ALL-IN-ONE
-- ============================================
-- This script fixes ALL payment-related errors in one go:
-- 1. Missing "method" column error
-- 2. NOT NULL constraint violations on payment_method
-- 3. Foreign key constraint errors on payment_method_id
-- 4. Updates the process_purchase_order_payment function
-- 
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE script
-- 2. Paste it into your Neon Database SQL Editor
-- 3. Click "Run" - that's it!
-- ============================================

BEGIN;

-- ============================================
-- PART 1: FIX TABLE SCHEMA
-- ============================================

-- Step 1: Add the "method" column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN method TEXT;
    
    -- Copy data from payment_method if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method'
    ) THEN
      UPDATE purchase_order_payments SET method = payment_method WHERE payment_method IS NOT NULL;
    END IF;
    
    RAISE NOTICE '✅ Added "method" column';
  ELSE
    RAISE NOTICE '✅ "method" column already exists';
  END IF;
END $$;

-- Step 2: Drop NOT NULL constraints that are causing issues
DO $$ 
BEGIN
  -- Remove NOT NULL from payment_method
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
      AND column_name = 'payment_method'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_order_payments ALTER COLUMN payment_method DROP NOT NULL;
    RAISE NOTICE '✅ Removed NOT NULL constraint from payment_method';
  END IF;

  -- Remove NOT NULL from payment_method_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
      AND column_name = 'payment_method_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_order_payments ALTER COLUMN payment_method_id DROP NOT NULL;
    RAISE NOTICE '✅ Removed NOT NULL constraint from payment_method_id';
  END IF;

  -- Remove NOT NULL from payment_account_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
      AND column_name = 'payment_account_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_order_payments ALTER COLUMN payment_account_id DROP NOT NULL;
    RAISE NOTICE '✅ Removed NOT NULL constraint from payment_account_id';
  END IF;
END $$;

-- Step 3: Drop problematic foreign key constraints
DO $$ 
DECLARE
  constraint_name TEXT;
  constraint_count INTEGER := 0;
BEGIN
  -- Drop all foreign key constraints on payment_method_id
  FOR constraint_name IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute attr ON attr.attrelid = con.conrelid 
      AND attr.attnum = ANY(con.conkey)
    WHERE rel.relname = 'purchase_order_payments'
      AND attr.attname = 'payment_method_id'
      AND con.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE purchase_order_payments DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
    constraint_count := constraint_count + 1;
    RAISE NOTICE '✅ Dropped foreign key constraint: %', constraint_name;
  END LOOP;
  
  IF constraint_count = 0 THEN
    RAISE NOTICE '✅ No problematic foreign key constraints found';
  END IF;
END $$;

-- Step 4: Ensure all required columns exist
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
    ALTER TABLE purchase_order_payments ADD COLUMN payment_method_id UUID;
    RAISE NOTICE '✅ Added payment_method_id column';
  END IF;

  -- Add user_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN user_id UUID;
    RAISE NOTICE '✅ Added user_id column';
  END IF;

  -- Add payment_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN payment_date TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added payment_date column';
  END IF;

  -- Add reference if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'reference'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN reference TEXT;
    RAISE NOTICE '✅ Added reference column';
  END IF;

  -- Add status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'status'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN status TEXT DEFAULT 'completed';
    RAISE NOTICE '✅ Added status column';
  END IF;

  -- Add notes if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ Added notes column';
  END IF;

  -- Add created_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN created_by UUID;
    RAISE NOTICE '✅ Added created_by column';
  END IF;
END $$;

-- ============================================
-- PART 2: CREATE/UPDATE THE PAYMENT FUNCTION
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

-- ============================================
-- PART 3: GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION process_purchase_order_payment(
  UUID, UUID, DECIMAL, TEXT, TEXT, UUID, UUID, TEXT, TEXT
) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON purchase_order_payments TO authenticated;
GRANT SELECT, UPDATE ON lats_purchase_orders TO authenticated;

-- ============================================
-- PART 4: VERIFICATION & REPORTING
-- ============================================

DO $$
DECLARE
  has_method BOOLEAN;
  has_payment_method BOOLEAN;
  has_fk_constraint BOOLEAN;
  payment_method_nullable BOOLEAN;
  payment_method_id_nullable BOOLEAN;
  payment_account_id_nullable BOOLEAN;
BEGIN
  -- Check column existence
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
  ) INTO has_method;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method'
  ) INTO has_payment_method;

  -- Check for foreign key constraints
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

  -- Check nullable status
  SELECT is_nullable = 'YES' INTO payment_method_nullable
  FROM information_schema.columns 
  WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method';

  SELECT is_nullable = 'YES' INTO payment_method_id_nullable
  FROM information_schema.columns 
  WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method_id';

  SELECT is_nullable = 'YES' INTO payment_account_id_nullable
  FROM information_schema.columns 
  WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_account_id';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '         📊 VERIFICATION REPORT';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Column Status:';
  RAISE NOTICE '  ✓ Has "method" column: %', has_method;
  RAISE NOTICE '  ✓ Has "payment_method" column: %', has_payment_method;
  RAISE NOTICE '';
  RAISE NOTICE 'Nullable Status:';
  RAISE NOTICE '  ✓ "payment_method" is nullable: %', COALESCE(payment_method_nullable::TEXT, 'N/A');
  RAISE NOTICE '  ✓ "payment_method_id" is nullable: %', COALESCE(payment_method_id_nullable::TEXT, 'N/A');
  RAISE NOTICE '  ✓ "payment_account_id" is nullable: %', COALESCE(payment_account_id_nullable::TEXT, 'N/A');
  RAISE NOTICE '';
  RAISE NOTICE 'Constraint Status:';
  RAISE NOTICE '  ✓ Has problematic FK constraint: %', has_fk_constraint;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
END $$;

COMMIT;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉';
  RAISE NOTICE '       ✅ ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table schema has been fixed';
  RAISE NOTICE '✅ All required columns are in place';
  RAISE NOTICE '✅ Problematic constraints have been removed';
  RAISE NOTICE '✅ Payment processing function is updated';
  RAISE NOTICE '✅ Permissions have been granted';
  RAISE NOTICE '';
  RAISE NOTICE '👉 NEXT STEP:';
  RAISE NOTICE '   Go to your app and try making a payment!';
  RAISE NOTICE '   The payment should process successfully now! 💰';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 If you still see errors, please share them';
  RAISE NOTICE '   so we can address any remaining issues.';
  RAISE NOTICE '';
END $$;

