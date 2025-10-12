-- ============================================
-- CREATE PURCHASE ORDER PAYMENT PROCESSING FUNCTION
-- ============================================
-- This function atomically processes purchase order payments
-- Run this in your Neon Database SQL Editor
-- ============================================

-- First, ensure all required tables exist
CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  payment_account_id UUID NOT NULL REFERENCES finance_accounts(id),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TZS',
  payment_method VARCHAR(50) NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id),
  reference TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_payments_order_id 
  ON purchase_order_payments(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_payments_account_id 
  ON purchase_order_payments(payment_account_id);

-- ============================================
-- CREATE THE PAYMENT PROCESSING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION process_purchase_order_payment(
  purchase_order_id_param UUID,
  payment_account_id_param UUID,
  amount_param DECIMAL,
  currency_param VARCHAR,
  payment_method_param VARCHAR,
  payment_method_id_param UUID,
  user_id_param UUID,
  reference_param TEXT DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_account_balance DECIMAL;
  v_total_paid DECIMAL;
  v_total_amount DECIMAL;
  v_payment_status VARCHAR;
  v_result JSON;
BEGIN
  -- Start transaction
  -- Get current account balance
  SELECT balance INTO v_account_balance
  FROM finance_accounts
  WHERE id = payment_account_id_param
  FOR UPDATE;

  IF v_account_balance IS NULL THEN
    RAISE EXCEPTION 'Payment account not found';
  END IF;

  -- Insert payment record
  INSERT INTO purchase_order_payments (
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

  -- Update finance account balance (deduct payment amount)
  UPDATE finance_accounts
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = payment_account_id_param;

  -- Calculate total paid for this purchase order
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';

  -- Get purchase order total amount
  SELECT total_amount INTO v_total_amount
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- Determine payment status
  IF v_total_paid >= v_total_amount THEN
    v_payment_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Update purchase order payment status
  UPDATE lats_purchase_orders
  SET 
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- Log audit entry
  INSERT INTO purchase_order_audit (
    purchase_order_id,
    action,
    user_id,
    created_by,
    details,
    timestamp,
    created_at
  ) VALUES (
    purchase_order_id_param,
    'payment_added',
    user_id_param,
    user_id_param,
    format('Payment of %s %s via %s. Reference: %s', 
           amount_param, currency_param, payment_method_param, 
           COALESCE(reference_param, 'N/A')),
    NOW(),
    NOW()
  );

  -- Build result
  v_result := json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'total_paid', v_total_paid,
    'payment_status', v_payment_status,
    'account_balance', v_account_balance - amount_param
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_purchase_order_payment(
  UUID, UUID, DECIMAL, VARCHAR, VARCHAR, UUID, UUID, TEXT, TEXT
) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON purchase_order_payments TO authenticated;
GRANT SELECT, UPDATE ON finance_accounts TO authenticated;
GRANT SELECT, UPDATE ON lats_purchase_orders TO authenticated;
GRANT SELECT, INSERT ON purchase_order_audit TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the function was created
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'process_purchase_order_payment'
  AND n.nspname = 'public';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Purchase order payment processing function created successfully!';
  RAISE NOTICE '✅ You can now process payments without errors.';
  RAISE NOTICE '✅ The function handles payment recording, balance updates, and audit logging atomically.';
END $$;

