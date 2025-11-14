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

-- Create batch payment processing function for better performance
CREATE OR REPLACE FUNCTION process_purchase_order_payments_batch(
  payment_data JSON[]
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  payment_record JSON;
  v_payment_id UUID;
  v_po_id UUID;
  v_account_id UUID;
  v_amount DECIMAL;
  v_currency VARCHAR;
  v_payment_method VARCHAR;
  v_payment_method_id UUID;
  v_user_id UUID;
  v_reference TEXT;
  v_notes TEXT;
  v_po_total DECIMAL;
  v_po_paid DECIMAL;
  v_new_paid DECIMAL;
  v_payment_status VARCHAR;
  v_result JSON[];
  v_single_result JSON;
BEGIN
  v_result := ARRAY[]::JSON[];

  -- Process each payment in the batch
  FOREACH payment_record IN ARRAY payment_data LOOP
    -- Extract payment data from JSON
    v_po_id := (payment_record->>'purchase_order_id')::UUID;
    v_account_id := (payment_record->>'payment_account_id')::UUID;
    v_amount := (payment_record->>'amount')::DECIMAL;
    v_currency := COALESCE(payment_record->>'currency', 'TZS');
    v_payment_method := payment_record->>'payment_method';
    v_payment_method_id := (payment_record->>'payment_method_id')::UUID;
    v_user_id := COALESCE((payment_record->>'user_id')::UUID, '00000000-0000-0000-0000-000000000001'::UUID);
    v_reference := payment_record->>'reference';
    v_notes := payment_record->>'notes';

    -- Validate currency is not a UUID
    IF v_currency ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_single_result := json_build_object(
        'success', false,
        'message', 'Invalid currency parameter: appears to be a UUID instead of currency code',
        'payment_data', payment_record
      );
      v_result := array_append(v_result, v_single_result);
      CONTINUE;
    END IF;

    -- Get current purchase order details
    SELECT total_amount, COALESCE(total_paid, 0)
    INTO v_po_total, v_po_paid
    FROM lats_purchase_orders
    WHERE id = v_po_id;

    -- Check if purchase order exists
    IF NOT FOUND THEN
      v_single_result := json_build_object(
        'success', false,
        'message', 'Purchase order not found',
        'payment_data', payment_record
      );
      v_result := array_append(v_result, v_single_result);
      CONTINUE;
    END IF;

    -- Check if this payment would exceed the total amount
    v_new_paid := v_po_paid + v_amount;

    IF v_new_paid > v_po_total + 1 THEN  -- Allow 1 unit tolerance for rounding
      v_single_result := json_build_object(
        'success', false,
        'message', format('Payment amount (%s) exceeds remaining balance', v_amount),
        'payment_data', payment_record
      );
      v_result := array_append(v_result, v_single_result);
      CONTINUE;
    END IF;

    -- Determine payment status
    IF v_new_paid >= v_po_total THEN
      v_payment_status := 'paid';
    ELSIF v_new_paid > 0 THEN
      v_payment_status := 'partial';
    ELSE
      v_payment_status := 'unpaid';
    END IF;

    -- Create payment record
    INSERT INTO purchase_order_payments (
      id, purchase_order_id, payment_account_id, amount, currency,
      payment_method, payment_method_id, reference, notes,
      status, payment_date, created_by, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_po_id, v_account_id, v_amount, v_currency::VARCHAR,
      v_payment_method::VARCHAR, v_payment_method_id, v_reference, v_notes,
      'completed', NOW(), v_user_id, NOW(), NOW()
    )
    RETURNING id INTO v_payment_id;

    -- Update purchase order payment status and total paid
    UPDATE lats_purchase_orders
    SET
      total_paid = v_new_paid,
      payment_status = v_payment_status,
      updated_at = NOW()
    WHERE id = v_po_id;

    -- Update finance account balance (deduct payment)
    UPDATE finance_accounts
    SET
      balance = balance - v_amount,
      updated_at = NOW()
    WHERE id = v_account_id;

    -- Add successful result
    v_single_result := json_build_object(
      'success', true,
      'message', 'Payment processed successfully',
      'data', json_build_object(
        'payment_id', v_payment_id,
        'amount_paid', v_amount,
        'total_paid', v_new_paid,
        'payment_status', v_payment_status,
        'remaining', v_po_total - v_new_paid
      ),
      'payment_data', payment_record
    );
    v_result := array_append(v_result, v_single_result);
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'message', 'Batch payment processing completed',
    'results', v_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Batch payment processing error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Add comment for batch function
COMMENT ON FUNCTION process_purchase_order_payments_batch IS 'Processes multiple purchase order payments in a single transaction for improved performance';

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'purchase_order_payments'
ORDER BY ordinal_position;

