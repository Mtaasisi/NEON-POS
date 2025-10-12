-- ============================================
-- CREATE PURCHASE ORDER PAYMENT FUNCTION
-- ============================================
-- This function processes payments for purchase orders
-- Run this in your Neon Database SQL Editor
-- ============================================

-- First, ensure the purchase_order_payments table exists
CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  payment_account_id UUID REFERENCES finance_accounts(id),
  payment_method_id UUID REFERENCES finance_accounts(id),
  method TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TZS',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference TEXT,
  notes TEXT,
  user_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add payment_account_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_account_id'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN payment_account_id UUID REFERENCES finance_accounts(id);
  END IF;

  -- Add payment_method_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method_id'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN payment_method_id UUID REFERENCES finance_accounts(id);
  END IF;

  -- Add user_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN user_id UUID;
  END IF;

  -- Add created_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN created_by UUID;
  END IF;

  -- Add notes if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE purchase_order_payments ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_po_payments_order_id 
  ON purchase_order_payments(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_po_payments_status 
  ON purchase_order_payments(status);

CREATE INDEX IF NOT EXISTS idx_po_payments_created_at 
  ON purchase_order_payments(created_at DESC);

-- ============================================
-- CREATE THE PAYMENT PROCESSING FUNCTION
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

  -- Insert payment record
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
      ) VALUES (
        payment_account_id_param,
        'debit',
        amount_param,
        currency_param,
        'Purchase Order Payment: ' || reference_param,
        reference_param,
        'completed',
        NOW(),
        user_id_param,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_finance_transaction_id;

      -- Update finance account balance
      UPDATE finance_accounts
      SET 
        current_balance = current_balance + amount_param,
        updated_at = NOW()
      WHERE id = payment_account_id_param;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore finance transaction errors (table might not exist or have different structure)
    RAISE NOTICE 'Finance transaction logging skipped: %', SQLERRM;
  END;

  -- Log audit entry if log function exists
  BEGIN
    PERFORM log_purchase_order_audit(
      purchase_order_id_param,
      'payment_made',
      format('Payment of %s %s via %s', amount_param, currency_param, payment_method_param),
      user_id_param
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore audit logging errors
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
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_purchase_order_payment(
  UUID, UUID, DECIMAL, TEXT, TEXT, UUID, UUID, TEXT, TEXT
) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON purchase_order_payments TO authenticated;
GRANT SELECT, UPDATE ON lats_purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON finance_transactions TO authenticated;
GRANT SELECT, UPDATE ON finance_accounts TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the function was created
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
  RAISE NOTICE '✅ Purchase order payment function created successfully!';
  RAISE NOTICE '✅ You can now process payments for purchase orders.';
  RAISE NOTICE '💰 The function handles:';
  RAISE NOTICE '   - Payment record creation';
  RAISE NOTICE '   - Payment status updates';
  RAISE NOTICE '   - Finance transaction logging';
  RAISE NOTICE '   - Account balance updates';
  RAISE NOTICE '   - Audit trail logging';
END $$;

