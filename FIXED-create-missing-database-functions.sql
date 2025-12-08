-- ============================================================================
-- CREATE MISSING DATABASE FUNCTIONS (FIXED - NO ISOLATION SET STATEMENTS)
-- ============================================================================
-- This script creates all missing functions with proper row-level locking
-- NOTE: All SET TRANSACTION ISOLATION LEVEL statements have been removed
-- Row-level locking (FOR UPDATE NOWAIT) provides protection regardless of isolation level
--
-- FIXES APPLIED:
-- - Row-level locking (FOR UPDATE NOWAIT) for all critical operations
-- - Branch ID support in all functions
-- - No SET TRANSACTION statements (PostgreSQL doesn't allow in functions)
-- ============================================================================

-- ============================================================================
-- STEP 0: ADD branch_id TO AUDIT TABLES (if missing)
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to purchase_order_audit if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_audit' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE purchase_order_audit ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_branch_id ON purchase_order_audit(branch_id);
    RAISE NOTICE '✅ Added branch_id column to purchase_order_audit table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in purchase_order_audit';
  END IF;

  -- Add branch_id to lats_purchase_order_audit_log if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_purchase_order_audit_log' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_purchase_order_audit_log ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_lats_po_audit_log_branch_id ON lats_purchase_order_audit_log(branch_id);
    RAISE NOTICE '✅ Added branch_id column to lats_purchase_order_audit_log table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in lats_purchase_order_audit_log';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add branch_id columns: %', SQLERRM;
END $$;

-- ============================================================================
-- 1. CREATE: log_purchase_order_audit function
-- ============================================================================
DROP FUNCTION IF EXISTS public.log_purchase_order_audit(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.log_purchase_order_audit(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.log_purchase_order_audit(
  p_purchase_order_id UUID,
  p_action TEXT,
  p_details TEXT,
  p_user_id UUID
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
  v_branch_id UUID;
BEGIN
  v_audit_id := gen_random_uuid();
  
  -- ✅ FIX: Get branch_id from purchase order
  SELECT branch_id INTO v_branch_id
  FROM lats_purchase_orders
  WHERE id = p_purchase_order_id;
  
  -- If purchase order not found, branch_id will be NULL (still log the audit)
  
  BEGIN
    INSERT INTO purchase_order_audit (
      id, purchase_order_id, action, user_id, created_by, details, timestamp, created_at, branch_id
    ) VALUES (
      v_audit_id, p_purchase_order_id, p_action, p_user_id, p_user_id, p_details, NOW(), NOW(), v_branch_id
    );
  EXCEPTION WHEN undefined_table OR OTHERS THEN
    BEGIN
      INSERT INTO lats_purchase_order_audit_log (
        id, purchase_order_id, action, user_id, notes, created_at, branch_id
      ) VALUES (
        v_audit_id, p_purchase_order_id, p_action, p_user_id, p_details, NOW(), v_branch_id
      );
    EXCEPTION WHEN undefined_table OR OTHERS THEN
      RAISE WARNING 'Audit table not found. Purchase order audit logging disabled.';
      RETURN NULL;
    END;
  END;

  RETURN v_audit_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error logging audit entry: %', SQLERRM;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_purchase_order_audit(uuid, text, text, uuid) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.log_purchase_order_audit(uuid, text, text, uuid) IS 
'Logs audit entries for purchase orders with branch_id support. IMPORTANT: This function should be called within the same transaction as the operation being audited to ensure audit consistency. Automatically retrieves branch_id from the purchase order.';

-- ============================================================================
-- 2. CREATE: process_purchase_order_payment function (WITH ROW-LEVEL LOCKING)
-- ============================================================================
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
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.process_purchase_order_payment(
  purchase_order_id_param UUID,
  payment_account_id_param UUID,
  amount_param NUMERIC,
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
  v_account_balance NUMERIC;
BEGIN
  IF purchase_order_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Purchase order ID is required');
  END IF;
  
  IF payment_account_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Payment account ID is required');
  END IF;
  
  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Payment amount must be greater than 0');
  END IF;

  -- Lock purchase order row to prevent concurrent modifications
  SELECT total_amount, COALESCE(total_paid, 0), branch_id
  INTO v_po_total, v_po_paid, v_branch_id
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Purchase order not found');
  END IF;

  -- Lock account row to prevent concurrent balance updates
  SELECT balance, branch_id
  INTO v_account_balance, v_branch_id
  FROM finance_accounts
  WHERE id = payment_account_id_param
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Payment account not found');
  END IF;

  -- Check balance with locked row (prevents race conditions)
  IF v_account_balance < amount_param THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Insufficient balance. Available: %s, Required: %s', v_account_balance, amount_param)
    );
  END IF;

  -- Generate payment ID
  v_payment_id := gen_random_uuid();

  -- Create payment record FIRST (before updating totals)
  INSERT INTO purchase_order_payments (
    id, purchase_order_id, payment_account_id, amount, currency, payment_method,
    payment_method_id, reference, notes, status, payment_date, created_by,
    branch_id, created_at, updated_at
  ) VALUES (
    v_payment_id, purchase_order_id_param, payment_account_id_param,
    amount_param, currency_param, payment_method_param, payment_method_id_param,
    reference_param, notes_param, 'completed', NOW(), user_id_param,
    v_branch_id, NOW(), NOW()
  );

  -- Recalculate total_paid from ALL completed payments (prevents race conditions)
  SELECT COALESCE(SUM(amount), 0) INTO v_new_paid
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';

  -- Determine payment status based on recalculated total
  IF v_new_paid >= v_po_total THEN
    v_payment_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Update purchase order with recalculated values (row is already locked)
  UPDATE lats_purchase_orders
  SET 
    total_paid = v_new_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- Update account balance (row is already locked, prevents lost updates)
  UPDATE finance_accounts
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = payment_account_id_param;

  v_result := json_build_object(
    'success', true,
    'message', 'Payment processed successfully',
    'data', json_build_object(
      'payment_id', v_payment_id,
      'amount_paid', amount_param,
      'total_paid', v_new_paid,
      'payment_status', v_payment_status,
      'remaining', GREATEST(0, v_po_total - v_new_paid),
      'branch_id', v_branch_id
    )
  );

  RETURN v_result;

EXCEPTION 
  WHEN lock_not_available THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Another transaction is processing this payment. Please try again.',
      'error_code', 'LOCK_TIMEOUT'
    );
  WHEN serialization_failure THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction conflict detected. Please retry the payment.',
      'error_code', 'SERIALIZATION_FAILURE'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_purchase_order_payment(uuid, uuid, numeric, varchar, varchar, uuid, uuid, text, text) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.process_purchase_order_payment(uuid, uuid, numeric, varchar, varchar, uuid, uuid, text, text) IS 
'Processes purchase order payment with row-level locking to prevent race conditions and ensure financial data integrity. Uses FOR UPDATE NOWAIT to lock purchase order and account rows, and recalculates total_paid from all payments to prevent concurrent update issues.';
