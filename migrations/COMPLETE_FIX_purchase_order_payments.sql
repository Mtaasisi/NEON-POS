-- ============================================
-- COMPLETE FIX FOR PURCHASE ORDER PAYMENTS
-- ============================================
-- This migration completely rebuilds the purchase_order_payments table
-- and function to fix the UUID parameter mismatch issue

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS process_purchase_order_payment CASCADE;

-- Step 2: Drop and recreate the purchase_order_payments table
DROP TABLE IF EXISTS purchase_order_payments CASCADE;

CREATE TABLE purchase_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  payment_account_id UUID REFERENCES finance_accounts(id),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TZS',
  payment_method VARCHAR(50),
  payment_method_id UUID,
  reference TEXT,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_po_payments_purchase_order_id ON purchase_order_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_payment_account_id ON purchase_order_payments(payment_account_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_payment_date ON purchase_order_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_po_payments_status ON purchase_order_payments(status);

-- Step 4: Add table comments
COMMENT ON TABLE purchase_order_payments IS 'Stores payment records for purchase orders with full payment method and account tracking';
COMMENT ON COLUMN purchase_order_payments.payment_account_id IS 'Reference to the finance account used for payment';
COMMENT ON COLUMN purchase_order_payments.payment_method_id IS 'Reference to the payment method configuration';
COMMENT ON COLUMN purchase_order_payments.payment_method IS 'Name of the payment method (Cash, Bank Transfer, etc.)';
COMMENT ON COLUMN purchase_order_payments.currency IS 'Currency code for the payment (TZS, USD, EUR, etc.)';

-- Step 5: Recreate the process_purchase_order_payment function
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
  -- Log the input parameters for debugging
  RAISE NOTICE 'Processing payment: PO=%, Account=%, Amount=%, Currency=%, Method=%', 
    purchase_order_id_param, payment_account_id_param, amount_param, currency_param, payment_method_param;

  -- Validate that currency is not a UUID
  IF currency_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid currency parameter: appears to be a UUID instead of currency code'
    );
  END IF;

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

  -- Create payment record with explicit column order
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
    currency_param::VARCHAR,  -- Explicit cast to VARCHAR
    payment_method_param::VARCHAR,  -- Explicit cast to VARCHAR
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
    RAISE WARNING 'Payment processing error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Add function comment
COMMENT ON FUNCTION process_purchase_order_payment IS 'Atomically processes a purchase order payment, updates PO status, and adjusts account balance. Fixed version with explicit type casting.';

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'purchase_order_payments'
ORDER BY ordinal_position;

