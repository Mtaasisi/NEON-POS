-- ============================================
-- 🔧 CREATE MISSING PURCHASE ORDER FUNCTIONS
-- ============================================
-- This script creates the missing RPC functions:
-- 1. check_purchase_order_completion_status
-- 2. complete_purchase_order
-- ============================================

-- Clear any previous transaction errors
ROLLBACK;

-- Start fresh transaction
BEGIN;

-- ============================================
-- 1. DROP EXISTING FUNCTIONS (to avoid conflicts)
-- ============================================
DROP FUNCTION IF EXISTS check_purchase_order_completion_status(UUID);
DROP FUNCTION IF EXISTS complete_purchase_order(UUID, UUID, TEXT);

-- ============================================
-- 2. CREATE FUNCTION: check_purchase_order_completion_status
-- Check if a purchase order is ready to be completed
-- ============================================
CREATE OR REPLACE FUNCTION check_purchase_order_completion_status(
  purchase_order_id_param UUID
)
RETURNS JSON AS $$
DECLARE
  v_total_items INTEGER := 0;
  v_completed_items INTEGER := 0;
  v_can_complete BOOLEAN := false;
  v_completion_percentage NUMERIC := 0;
  v_po_status TEXT;
  v_payment_status TEXT;
  v_total_amount DECIMAL;
  v_paid_amount DECIMAL;
BEGIN
  -- Check if purchase order exists
  SELECT status, payment_status, total_amount 
  INTO v_po_status, v_payment_status, v_total_amount
  FROM lats_purchase_orders 
  WHERE id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found'
    );
  END IF;
  
  -- Get total items count
  SELECT COUNT(*)::INTEGER INTO v_total_items
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param;
  
  -- Count completed items (where quantity_received >= quantity_ordered)
  SELECT COUNT(*)::INTEGER INTO v_completed_items
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param
    AND COALESCE(quantity_received, 0) >= quantity_ordered;
  
  -- Calculate completion percentage
  IF v_total_items > 0 THEN
    v_completion_percentage := ROUND((v_completed_items::NUMERIC / v_total_items::NUMERIC) * 100, 2);
  END IF;
  
  -- Get total paid amount
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';
  
  -- Determine if can complete:
  -- 1. All items must be received (or at least status is 'received')
  -- 2. Payment must be complete OR status is already 'paid'
  v_can_complete := (
    (v_po_status = 'received' OR v_completed_items = v_total_items) 
    AND (v_payment_status = 'paid' OR v_paid_amount >= v_total_amount)
  );
  
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'total_items', v_total_items,
      'completed_items', v_completed_items,
      'can_complete', v_can_complete,
      'completion_percentage', v_completion_percentage,
      'po_status', v_po_status,
      'payment_status', v_payment_status,
      'total_amount', v_total_amount,
      'paid_amount', v_paid_amount
    ),
    'message', 'Completion status retrieved successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error checking completion status: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. CREATE FUNCTION: complete_purchase_order
-- Complete a purchase order after receiving and payment
-- ============================================
CREATE OR REPLACE FUNCTION complete_purchase_order(
  purchase_order_id_param UUID,
  user_id_param UUID,
  completion_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_po_record RECORD;
  v_total_items INTEGER := 0;
  v_completed_items INTEGER := 0;
  v_can_complete BOOLEAN := false;
  v_total_amount DECIMAL;
  v_paid_amount DECIMAL;
  v_reason TEXT := '';
BEGIN
  -- Get purchase order details
  SELECT * INTO v_po_record 
  FROM lats_purchase_orders 
  WHERE id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found',
      'error_code', 'NOT_FOUND'
    );
  END IF;
  
  -- Check if already completed
  IF v_po_record.status = 'completed' THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Purchase order is already completed',
      'data', json_build_object(
        'purchase_order_id', purchase_order_id_param,
        'status', 'completed'
      )
    );
  END IF;
  
  -- Get total items count
  SELECT COUNT(*)::INTEGER INTO v_total_items
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param;
  
  -- Count completed items (where quantity_received >= quantity_ordered)
  SELECT COUNT(*)::INTEGER INTO v_completed_items
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param
    AND COALESCE(quantity_received, 0) >= quantity_ordered;
  
  -- Get payment amounts
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';
  
  v_total_amount := COALESCE(v_po_record.total_amount, 0);
  
  -- More flexible completion logic:
  -- Option 1: Payment is marked as paid (most common)
  -- Option 2: All items received AND payment complete
  -- Option 3: Status is already 'received' and payment is done
  
  IF v_po_record.payment_status = 'paid' THEN
    -- If payment status is 'paid', we can complete regardless
    v_can_complete := true;
    v_reason := 'Payment status is paid';
  ELSIF v_paid_amount >= v_total_amount THEN
    -- If paid amount covers total, we can complete
    v_can_complete := true;
    v_reason := 'Full payment received';
  ELSIF v_po_record.status = 'received' AND v_total_amount = 0 THEN
    -- Free items or zero-cost order that's been received
    v_can_complete := true;
    v_reason := 'Received with no payment required';
  ELSIF v_completed_items = v_total_items AND v_completed_items > 0 THEN
    -- All items received - allow completion (payment might be on credit)
    v_can_complete := true;
    v_reason := 'All items received';
  ELSE
    v_can_complete := false;
    v_reason := 'Insufficient completion criteria';
  END IF;
  
  -- If not all conditions met, return detailed error
  IF NOT v_can_complete THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cannot complete purchase order. ' || v_reason,
      'error_code', 'INCOMPLETE',
      'data', json_build_object(
        'total_items', v_total_items,
        'completed_items', v_completed_items,
        'total_amount', v_total_amount,
        'paid_amount', v_paid_amount,
        'status', v_po_record.status,
        'payment_status', v_po_record.payment_status,
        'reason', v_reason
      )
    );
  END IF;
  
  -- Update purchase order to completed status
  -- Note: Not all PO tables have completed_at column, so we only update status and updated_at
  UPDATE lats_purchase_orders
  SET 
    status = 'completed',
    updated_at = NOW(),
    notes = CASE 
      WHEN completion_notes IS NOT NULL THEN 
        COALESCE(notes || E'\n\n', '') || 'Completed: ' || completion_notes
      ELSE notes
    END
  WHERE id = purchase_order_id_param;
  
  -- Create audit log entry if audit table exists
  -- Note: Audit table may not exist or may have different schema
  -- We catch all exceptions to prevent audit logging from blocking completion
  BEGIN
    INSERT INTO purchase_order_audit (
      purchase_order_id,
      action,
      user_id,
      details,
      timestamp
    ) VALUES (
      purchase_order_id_param,
      'completed',
      user_id_param,
      completion_notes,
      NOW()
    );
  EXCEPTION 
    WHEN undefined_table THEN
      -- Audit table doesn't exist, skip audit logging
      NULL;
    WHEN undefined_column THEN
      -- Audit table has different schema, skip audit logging
      NULL;
    WHEN OTHERS THEN
      -- Any other audit error, skip audit logging
      NULL;
  END;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Purchase order completed successfully',
    'data', json_build_object(
      'purchase_order_id', purchase_order_id_param,
      'status', 'completed',
      'updated_at', NOW(),
      'items_completed', v_completed_items,
      'total_items', v_total_items,
      'completion_reason', v_reason
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error completing purchase order: ' || SQLERRM,
    'error_code', 'DATABASE_ERROR'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION check_purchase_order_completion_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_purchase_order(UUID, UUID, TEXT) TO authenticated;

-- ============================================
-- 5. SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Missing purchase order functions created successfully!';
  RAISE NOTICE '📦 Functions created:';
  RAISE NOTICE '   1. check_purchase_order_completion_status(purchase_order_id)';
  RAISE NOTICE '   2. complete_purchase_order(purchase_order_id, user_id, completion_notes)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 These functions are now available for your application!';
  RAISE NOTICE '   - check_purchase_order_completion_status: Check if PO can be completed';
  RAISE NOTICE '   - complete_purchase_order: Mark PO as completed after receiving & payment';
END $$;

-- Commit the transaction
COMMIT;

