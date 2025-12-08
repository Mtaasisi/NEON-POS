-- ============================================================================
-- CREATE: process_purchase_order_payment function
-- ============================================================================
-- This function atomically processes a purchase order payment
-- including creating the payment record and updating the PO status

-- Step 1: Drop ALL versions using dynamic SQL to avoid conflicts
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT oid::regprocedure 
    FROM pg_proc 
    WHERE proname = 'process_purchase_order_payment'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    RAISE NOTICE 'Dropped function: %', r.oid::regprocedure;
  END LOOP;
END $$;

-- Step 2: Create function with correct parameter types
-- Note: amount_param accepts INTEGER (from code) which PostgreSQL will cast to NUMERIC
CREATE OR REPLACE FUNCTION public.process_purchase_order_payment(
  purchase_order_id_param UUID,
  payment_account_id_param UUID,
  amount_param NUMERIC,  -- Accepts INTEGER from code (auto-cast)
  currency_param VARCHAR DEFAULT 'TZS',
  payment_method_param VARCHAR DEFAULT 'Cash',
  payment_method_id_param UUID DEFAULT NULL,
  user_id_param UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  reference_param TEXT DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_po_total NUMERIC;
  v_po_paid NUMERIC;
  v_new_paid NUMERIC;
  v_payment_status VARCHAR;
  v_result JSON;
  v_branch_id UUID;
BEGIN
  -- Parameter validation
  IF purchase_order_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Purchase order ID is required');
  END IF;
  
  IF payment_account_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Payment account ID is required');
  END IF;
  
  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Payment amount must be greater than 0');
  END IF;

  -- Get current purchase order details and branch_id
  SELECT total_amount, COALESCE(total_paid, 0), branch_id
  INTO v_po_total, v_po_paid, v_branch_id
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

  -- Create payment record (with branch_id from purchase order)
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
    branch_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
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
    v_branch_id,
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
      'remaining', GREATEST(0, v_po_total - v_new_paid)
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_purchase_order_payment(uuid, uuid, numeric, varchar, varchar, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_purchase_order_payment(uuid, uuid, numeric, varchar, varchar, uuid, uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.process_purchase_order_payment(uuid, uuid, numeric, varchar, varchar, uuid, uuid, text, text) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.process_purchase_order_payment(uuid, uuid, numeric, varchar, varchar, uuid, uuid, text, text) IS 
'Processes purchase order payment with atomic transaction handling. Creates payment record, updates PO status, and updates account balance. Includes branch_id from purchase order.';
