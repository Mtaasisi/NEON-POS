-- ================================================
-- FIX: Create Missing Database Functions for Purchase Orders
-- ================================================
-- Functions missing from Supabase database:
-- 1. check_purchase_order_completion_status(uuid)
-- 2. complete_purchase_order(uuid, uuid, text)
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- FUNCTION 1: check_purchase_order_completion_status
-- ================================================

CREATE OR REPLACE FUNCTION public.check_purchase_order_completion_status(purchase_order_id_param uuid) 
RETURNS json
LANGUAGE plpgsql
AS $$
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
$$;

-- ================================================
-- FUNCTION 2: complete_purchase_order
-- ================================================

CREATE OR REPLACE FUNCTION public.complete_purchase_order(
  purchase_order_id_param uuid, 
  user_id_param uuid, 
  completion_notes text DEFAULT NULL::text
) 
RETURNS json
LANGUAGE plpgsql
AS $$
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
  ELSIF v_completed_items = v_total_items AND v_paid_amount >= v_total_amount THEN
    -- All items received and payment complete
    v_can_complete := true;
    v_reason := 'All items received and payment complete';
  ELSIF v_po_record.status = 'received' AND v_paid_amount >= v_total_amount THEN
    -- Status is received and payment is done
    v_can_complete := true;
    v_reason := 'Status is received and payment complete';
  ELSE
    -- Cannot complete
    RETURN json_build_object(
      'success', false,
      'message', 'Cannot complete purchase order. Requirements not met.',
      'error_code', 'CANNOT_COMPLETE',
      'data', json_build_object(
        'items_received', v_completed_items,
        'total_items', v_total_items,
        'paid_amount', v_paid_amount,
        'total_amount', v_total_amount
      )
    );
  END IF;
  
  -- Update purchase order status to completed
  UPDATE lats_purchase_orders
  SET 
    status = 'completed',
    updated_at = NOW(),
    completed_at = NOW(),
    completed_by = user_id_param
  WHERE id = purchase_order_id_param;
  
  -- Try to log audit entry (table may not exist, that's ok)
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
$$;

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- Both functions have been created:
-- 1. check_purchase_order_completion_status(uuid)
-- 2. complete_purchase_order(uuid, uuid, text)
-- ================================================
