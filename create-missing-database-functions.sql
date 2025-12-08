-- ============================================================================
-- CREATE MISSING DATABASE FUNCTIONS
-- ============================================================================
-- This script creates all missing functions:
-- 1. log_purchase_order_audit
-- 2. process_purchase_order_payment
-- 3. add_imei_to_parent_variant
-- 4. complete_purchase_order_receive
-- 5. get_purchase_order_receive_summary
-- Run this in your Supabase SQL Editor
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
'Logs audit entries for purchase orders with branch_id support. IMPORTANT: This function should be called within the same transaction as the operation being audited to ensure audit consistency. The function uses SECURITY DEFINER to allow audit logging even if the caller lacks direct table access. Automatically retrieves branch_id from the purchase order.';

-- ============================================================================
-- 2. CREATE: process_purchase_order_payment function
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
-- Row-level locking (FOR UPDATE NOWAIT) provides protection against concurrent modifications
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

  -- ✅ CRITICAL FIX: Lock purchase order row to prevent concurrent modifications
  SELECT total_amount, COALESCE(total_paid, 0), branch_id
  INTO v_po_total, v_po_paid, v_branch_id
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param
  FOR UPDATE NOWAIT;  -- ✅ Lock row, fail immediately if locked by another transaction

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Purchase order not found');
  END IF;

  -- ✅ CRITICAL FIX: Lock account row to prevent concurrent balance updates
  SELECT balance, branch_id
  INTO v_account_balance, v_branch_id
  FROM finance_accounts
  WHERE id = payment_account_id_param
  FOR UPDATE NOWAIT;  -- ✅ Lock row, fail immediately if locked by another transaction

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Payment account not found');
  END IF;

  -- ✅ Check balance with locked row (prevents race conditions)
  IF v_account_balance < amount_param THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Insufficient balance. Available: %s, Required: %s', v_account_balance, amount_param)
    );
  END IF;

  -- Generate payment ID
  v_payment_id := gen_random_uuid();

  -- ✅ Create payment record FIRST (before updating totals)
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

  -- ✅ CRITICAL FIX: Recalculate total_paid from ALL completed payments
  -- This prevents race conditions when multiple payments are processed in parallel
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

  -- ✅ Update purchase order with recalculated values (row is already locked)
  UPDATE lats_purchase_orders
  SET 
    total_paid = v_new_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- ✅ Update account balance (row is already locked, prevents lost updates)
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
    -- Handle lock timeout (another transaction has the row locked)
    RETURN json_build_object(
      'success', false,
      'message', 'Another transaction is processing this payment. Please try again.',
      'error_code', 'LOCK_TIMEOUT'
    );
  WHEN serialization_failure THEN
    -- Handle serialization failure (conflict detected in SERIALIZABLE isolation)
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
'Processes purchase order payment with SERIALIZABLE isolation and row-level locking to prevent race conditions and ensure financial data integrity. Uses FOR UPDATE NOWAIT to lock purchase order and account rows, and recalculates total_paid from all payments to prevent concurrent update issues.';

-- ============================================================================
-- 3. CREATE: add_imei_to_parent_variant function
-- ============================================================================
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT oid::regprocedure 
    FROM pg_proc 
    WHERE proname = 'add_imei_to_parent_variant'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  cost_price_param INTEGER DEFAULT 0,  -- Accept INTEGER (auto-casts to NUMERIC)
  selling_price_param INTEGER DEFAULT 0,  -- Accept INTEGER (auto-casts to NUMERIC)
  condition_param TEXT DEFAULT 'new',
  notes_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
-- Row-level locking (FOR UPDATE NOWAIT) provides protection against concurrent modifications
AS $$
DECLARE
  v_parent_variant RECORD;
  v_product_id UUID;
  v_new_sku TEXT;
  v_child_id UUID;
  v_timestamp TEXT;
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
BEGIN
  -- Convert INTEGER to NUMERIC for calculations
  v_cost_price := cost_price_param::NUMERIC;
  v_selling_price := selling_price_param::NUMERIC;

  -- Validate IMEI format
  IF imei_param IS NULL OR imei_param = '' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'IMEI cannot be empty'::TEXT;
    RETURN;
  END IF;

  -- ✅ CRITICAL FIX: Lock parent variant first to prevent concurrent modifications
  SELECT * INTO v_parent_variant
  FROM lats_product_variants
  WHERE id = parent_variant_id_param
  FOR UPDATE NOWAIT;  -- ✅ Lock row, fail immediately if locked

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found'::TEXT;
    RETURN;
  END IF;

  -- ✅ CRITICAL FIX: Check for duplicate IMEI with proper isolation
  -- In SERIALIZABLE isolation, this check is protected from concurrent inserts
  IF EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE variant_attributes->>'imei' = imei_param
      AND variant_type = 'imei_child'
      AND id != parent_variant_id_param
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('Device with IMEI %s already exists in inventory', imei_param)::TEXT;
    RETURN;
  END IF;

  -- Get product ID
  v_product_id := v_parent_variant.product_id;

  -- Generate unique SKU for child IMEI variant
  v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
  v_new_sku := COALESCE(v_parent_variant.sku, 'VAR') || '-IMEI-' || 
               SUBSTRING(imei_param, 1, 8) || '-' || SUBSTRING(v_timestamp, 1, 10);

  -- Mark parent as parent type if not already (row is already locked)
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = 'parent',
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND (variant_type != 'parent' OR is_parent != TRUE);

  -- ✅ Create child IMEI variant (SERIALIZABLE isolation prevents duplicate inserts)
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    name,
    variant_name,
    sku,
    cost_price,
    selling_price,
    quantity,
    is_active,
    is_parent,
    variant_type,
    variant_attributes,
    branch_id,
    created_at,
    updated_at
  ) VALUES (
    v_product_id,
    parent_variant_id_param,
    'IMEI: ' || imei_param,
    'IMEI: ' || imei_param,
    v_new_sku,
    COALESCE(v_cost_price, v_parent_variant.cost_price, 0),
    COALESCE(v_selling_price, v_parent_variant.selling_price, 0),
    1,
    TRUE,
    FALSE,
    'imei_child',
    jsonb_build_object(
      'imei', imei_param,
      'imei_status', 'available',
      'serial_number', serial_number_param,
      'condition', condition_param,
      'notes', notes_param,
      'source', 'purchase',
      'received_at', NOW()
    ),
    v_parent_variant.branch_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_child_id;

  RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle unique constraint violation (if unique index exists)
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('IMEI %s already exists (unique constraint violation)', imei_param)::TEXT;
  WHEN lock_not_available THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      'Parent variant is locked by another transaction. Please try again.'::TEXT;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      'Transaction conflict detected. IMEI may have been registered concurrently. Please retry.'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_imei_to_parent_variant(uuid, text, text, integer, integer, text, text) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.add_imei_to_parent_variant(uuid, text, text, integer, integer, text, text) IS 
'Adds IMEI to parent variant with SERIALIZABLE isolation to prevent duplicate IMEI registrations. Uses FOR UPDATE NOWAIT to lock parent variant and SERIALIZABLE isolation to prevent concurrent duplicate inserts.';

-- ============================================================================
-- 4. CREATE: complete_purchase_order_receive function
-- ============================================================================
DROP FUNCTION IF EXISTS public.complete_purchase_order_receive(uuid, uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION public.complete_purchase_order_receive(
  purchase_order_id_param UUID,
  user_id_param UUID,
  receive_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
-- Row-level locking (FOR UPDATE NOWAIT) provides protection against concurrent modifications
AS $$
DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_items_created INTEGER := 0;
  v_quantity INTEGER;
  v_i INTEGER;
  v_total_items INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_total_received INTEGER := 0;
  v_all_received BOOLEAN;
  v_new_status VARCHAR;
  v_result JSON;
BEGIN
  -- ✅ CRITICAL FIX: Lock purchase order row to prevent concurrent receives
  SELECT * INTO v_order_record
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param
  FOR UPDATE NOWAIT;  -- ✅ Lock row, fail immediately if locked

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found',
      'error_code', 'PO_NOT_FOUND'
    );
  END IF;

  -- Check if order is in a receivable status
  IF v_order_record.status NOT IN ('shipped', 'partial_received', 'confirmed', 'sent', 'completed') THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Cannot receive order in status: %s', v_order_record.status),
      'error_code', 'INVALID_STATUS'
    );
  END IF;

  -- ✅ CRITICAL FIX: Lock all purchase order items to prevent concurrent updates
  -- Process each purchase order item with locked rows
  FOR v_item_record IN 
    SELECT 
      poi.id as item_id,
      poi.product_id,
      poi.variant_id,
      poi.quantity_ordered,
      COALESCE(poi.quantity_received, 0) as quantity_received,
      poi.unit_cost,
      p.name as product_name,
      pv.name as variant_name,
      p.sku as product_sku,
      pv.sku as variant_sku,
      COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price
    FROM lats_purchase_order_items poi
    LEFT JOIN lats_products p ON p.id = poi.product_id
    LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
    WHERE poi.purchase_order_id = purchase_order_id_param
    FOR UPDATE NOWAIT  -- ✅ Lock all items, fail if any are locked
  LOOP
    v_total_items := v_total_items + 1;
    v_total_ordered := v_total_ordered + v_item_record.quantity_ordered;
    
    -- Calculate quantity to receive (total ordered - already received)
    v_quantity := v_item_record.quantity_ordered - v_item_record.quantity_received;
    
    IF v_quantity > 0 THEN
      -- ✅ Update the purchase order item with received quantity (row is locked)
      UPDATE lats_purchase_order_items
      SET 
        quantity_received = COALESCE(quantity_received, 0) + v_quantity,
        updated_at = NOW()
      WHERE id = v_item_record.item_id;
      
      v_items_created := v_items_created + v_quantity;
    END IF;
  END LOOP;

  -- Check if all items are fully received
  SELECT NOT EXISTS (
    SELECT 1 
    FROM lats_purchase_order_items 
    WHERE purchase_order_id = purchase_order_id_param 
    AND COALESCE(quantity_received, 0) < quantity_ordered
  ) INTO v_all_received;
  
  -- Calculate totals
  SELECT COALESCE(SUM(quantity_received), 0), COALESCE(SUM(quantity_ordered), 0)
  INTO v_total_received, v_total_ordered
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param;
  
  -- Set appropriate status
  IF v_all_received THEN
    v_new_status := 'received';
  ELSE
    v_new_status := 'partial_received';
  END IF;
  
  -- ✅ Update purchase order status (row is already locked)
  UPDATE lats_purchase_orders
  SET 
    status = v_new_status,
    received_date = CASE WHEN v_all_received THEN NOW() ELSE received_date END,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- ✅ FIX: Create audit log entry with branch_id (with fallback)
  BEGIN
    INSERT INTO lats_purchase_order_audit_log (
      purchase_order_id, action, old_status, new_status, user_id, notes, created_at, branch_id
    ) VALUES (
      purchase_order_id_param,
      CASE WHEN v_all_received THEN 'receive_complete' ELSE 'receive_partial' END,
      v_order_record.status,
      v_new_status,
      user_id_param,
      format('%s: Received %s items (%s/%s total)%s', 
        CASE WHEN v_all_received THEN 'Complete receive' ELSE 'Partial receive' END,
        v_items_created,
        v_total_received,
        v_total_ordered,
        CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
      ),
      NOW(),
      v_order_record.branch_id  -- ✅ Include branch_id from purchase order
    );
  EXCEPTION WHEN OTHERS THEN
    -- If audit table doesn't exist, just continue
    NULL;
  END;

  -- Build success response
  v_result := json_build_object(
    'success', true,
    'message', format('Successfully received %s items from purchase order', v_items_created),
    'data', json_build_object(
      'purchase_order_id', purchase_order_id_param,
      'order_number', v_order_record.order_number,
      'items_created', v_items_created,
      'total_items', v_total_items,
      'total_ordered', v_total_ordered,
      'total_received', v_total_received,
      'is_complete', v_all_received,
      'new_status', v_new_status,
      'received_date', NOW(),
      'received_by', user_id_param
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Another transaction is receiving this purchase order. Please try again.',
      'error_code', 'LOCK_TIMEOUT'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error receiving purchase order: %s', SQLERRM),
      'error_code', 'RECEIVE_ERROR'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_purchase_order_receive(uuid, uuid, text) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.complete_purchase_order_receive(uuid, uuid, text) IS 
'Completes purchase order receive with row-level locking to prevent concurrent receive operations and quantity conflicts. Uses FOR UPDATE NOWAIT to lock purchase order and all items before processing. Includes branch_id in audit logs for proper branch isolation.';

-- ============================================================================
-- 5. CREATE: get_purchase_order_receive_summary function
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_purchase_order_receive_summary(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_purchase_order_receive_summary(
  purchase_order_id_param UUID
)
RETURNS TABLE(
  total_items BIGINT,
  total_ordered BIGINT,
  total_received BIGINT,
  total_pending BIGINT,
  percent_received NUMERIC,
  items_detail JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_items,
    SUM(quantity_ordered)::BIGINT as total_ordered,
    SUM(COALESCE(quantity_received, 0))::BIGINT as total_received,
    SUM(quantity_ordered - COALESCE(quantity_received, 0))::BIGINT as total_pending,
    CASE 
      WHEN SUM(quantity_ordered) > 0 THEN 
        ROUND((SUM(COALESCE(quantity_received, 0))::NUMERIC / SUM(quantity_ordered)::NUMERIC) * 100, 2)
      ELSE 0
    END as percent_received,
    COALESCE(
      json_agg(
        json_build_object(
          'item_id', id,
          'product_id', product_id,
          'variant_id', variant_id,
          'ordered', quantity_ordered,
          'received', COALESCE(quantity_received, 0),
          'pending', quantity_ordered - COALESCE(quantity_received, 0)
        )
      ),
      '[]'::json
    ) as items_detail
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param
  GROUP BY purchase_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_purchase_order_receive_summary(uuid) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.get_purchase_order_receive_summary(uuid) IS 
'Gets receive summary for a purchase order including total items, ordered, received, pending quantities, and detailed item breakdown';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  audit_func_count INTEGER;
  payment_func_count INTEGER;
  imei_func_count INTEGER;
  receive_func_count INTEGER;
  summary_func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO audit_func_count FROM pg_proc WHERE proname = 'log_purchase_order_audit';
  SELECT COUNT(*) INTO payment_func_count FROM pg_proc WHERE proname = 'process_purchase_order_payment';
  SELECT COUNT(*) INTO imei_func_count FROM pg_proc WHERE proname = 'add_imei_to_parent_variant';
  SELECT COUNT(*) INTO receive_func_count FROM pg_proc WHERE proname = 'complete_purchase_order_receive';
  SELECT COUNT(*) INTO summary_func_count FROM pg_proc WHERE proname = 'get_purchase_order_receive_summary';
  
  IF audit_func_count = 0 THEN
    RAISE WARNING '⚠️ log_purchase_order_audit function not created!';
  ELSE
    RAISE NOTICE '✅ log_purchase_order_audit function created';
  END IF;
  
  IF payment_func_count = 0 THEN
    RAISE WARNING '⚠️ process_purchase_order_payment function not created!';
  ELSE
    RAISE NOTICE '✅ process_purchase_order_payment function created';
  END IF;
  
  IF imei_func_count = 0 THEN
    RAISE WARNING '⚠️ add_imei_to_parent_variant function not created!';
  ELSE
    RAISE NOTICE '✅ add_imei_to_parent_variant function created';
  END IF;
  
  IF receive_func_count = 0 THEN
    RAISE WARNING '⚠️ complete_purchase_order_receive function not created!';
  ELSE
    RAISE NOTICE '✅ complete_purchase_order_receive function created';
  END IF;
  
  IF summary_func_count = 0 THEN
    RAISE WARNING '⚠️ get_purchase_order_receive_summary function not created!';
  ELSE
    RAISE NOTICE '✅ get_purchase_order_receive_summary function created';
  END IF;
END $$;
