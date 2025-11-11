-- =====================================================================
-- FIX: Add Stock Movement Tracking to Branch Transfers
-- =====================================================================
-- This script improves the transfer system by adding audit trail
-- in the lats_stock_movements table
-- =====================================================================

-- =====================================================================
-- 1. Improved reduce_variant_stock with movement logging
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reduce_variant_stock(
  p_variant_id UUID, 
  p_quantity INTEGER,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_variant RECORD;
  v_previous_qty INTEGER;
  v_new_qty INTEGER;
BEGIN
  -- Get current variant info
  SELECT 
    product_id,
    branch_id,
    quantity,
    reserved_quantity
  INTO v_variant
  FROM lats_product_variants
  WHERE id = p_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;

  v_previous_qty := v_variant.quantity;

  -- Reduce both quantity AND reserved_quantity
  UPDATE lats_product_variants
  SET quantity = GREATEST(0, quantity - p_quantity),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id
  RETURNING quantity INTO v_new_qty;

  -- Log stock movement if reference info provided
  IF p_reference_type IS NOT NULL THEN
    INSERT INTO lats_stock_movements (
      id,
      product_id,
      variant_id,
      branch_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      reference_type,
      reference_id,
      notes,
      created_by,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_variant.product_id,
      p_variant_id,
      v_variant.branch_id,
      'transfer_out',
      -p_quantity,  -- Negative for outgoing
      v_previous_qty,
      v_new_qty,
      p_reference_type,
      p_reference_id,
      COALESCE(p_notes, 'Stock reduced via transfer'),
      p_user_id,
      NOW()
    );
  END IF;

  RAISE NOTICE 'Reduced % units from variant % (Previous: %, New: %)', 
    p_quantity, p_variant_id, v_previous_qty, v_new_qty;
END;
$function$;

-- =====================================================================
-- 2. Improved increase_variant_stock with movement logging
-- =====================================================================
CREATE OR REPLACE FUNCTION public.increase_variant_stock(
  p_variant_id UUID, 
  p_quantity INTEGER,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_variant RECORD;
  v_previous_qty INTEGER;
  v_new_qty INTEGER;
BEGIN
  -- Get current variant info
  SELECT 
    product_id,
    branch_id,
    quantity
  INTO v_variant
  FROM lats_product_variants
  WHERE id = p_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;

  v_previous_qty := v_variant.quantity;

  -- Add stock to destination variant
  UPDATE lats_product_variants
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id
  RETURNING quantity INTO v_new_qty;

  -- Log stock movement if reference info provided
  IF p_reference_type IS NOT NULL THEN
    INSERT INTO lats_stock_movements (
      id,
      product_id,
      variant_id,
      branch_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      reference_type,
      reference_id,
      notes,
      created_by,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_variant.product_id,
      p_variant_id,
      v_variant.branch_id,
      'transfer_in',
      p_quantity,  -- Positive for incoming
      v_previous_qty,
      v_new_qty,
      p_reference_type,
      p_reference_id,
      COALESCE(p_notes, 'Stock increased via transfer'),
      p_user_id,
      NOW()
    );
  END IF;

  RAISE NOTICE 'Increased % units for variant % (Previous: %, New: %)', 
    p_quantity, p_variant_id, v_previous_qty, v_new_qty;
END;
$function$;

-- =====================================================================
-- 3. Improved complete_stock_transfer_transaction with movement logging
-- =====================================================================
CREATE OR REPLACE FUNCTION public.complete_stock_transfer_transaction(
  p_transfer_id UUID, 
  p_completed_by UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_transfer RECORD;
  v_destination_variant_id UUID;
  v_source_previous_qty INTEGER;
  v_source_previous_reserved INTEGER;
  v_dest_previous_qty INTEGER;
  v_source_new_qty INTEGER;
  v_dest_new_qty INTEGER;
  v_result JSONB;
BEGIN
  -- Get and lock transfer
  SELECT * INTO v_transfer
  FROM branch_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found: %', p_transfer_id;
  END IF;

  -- Validate transfer status
  IF v_transfer.status NOT IN ('approved', 'in_transit') THEN
    RAISE EXCEPTION 'Transfer must be approved or in_transit to complete. Current status: %', v_transfer.status;
  END IF;

  -- Get source variant quantities BEFORE transfer
  SELECT quantity, reserved_quantity
  INTO v_source_previous_qty, v_source_previous_reserved
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  RAISE NOTICE 'Source variant before: qty=%, reserved=%', v_source_previous_qty, v_source_previous_reserved;

  -- Find or create destination variant
  v_destination_variant_id := find_or_create_variant_at_branch(
    v_transfer.entity_id,
    v_transfer.to_branch_id
  );

  -- Get destination variant quantity BEFORE transfer
  SELECT quantity INTO v_dest_previous_qty
  FROM lats_product_variants
  WHERE id = v_destination_variant_id;

  RAISE NOTICE 'Destination variant before: qty=%', v_dest_previous_qty;

  -- Reduce stock from source WITH movement logging
  PERFORM reduce_variant_stock(
    v_transfer.entity_id, 
    v_transfer.quantity,
    'branch_transfer',
    p_transfer_id,
    'Transfer to branch: ' || v_transfer.to_branch_id::text,
    p_completed_by
  );

  -- Increase stock at destination WITH movement logging
  PERFORM increase_variant_stock(
    v_destination_variant_id, 
    v_transfer.quantity,
    'branch_transfer',
    p_transfer_id,
    'Transfer from branch: ' || v_transfer.from_branch_id::text,
    p_completed_by
  );

  -- Get new quantities AFTER transfer
  SELECT quantity INTO v_source_new_qty
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  SELECT quantity INTO v_dest_new_qty
  FROM lats_product_variants
  WHERE id = v_destination_variant_id;

  RAISE NOTICE 'Source variant after: qty=%', v_source_new_qty;
  RAISE NOTICE 'Destination variant after: qty=%', v_dest_new_qty;

  -- Mark transfer as completed
  UPDATE branch_transfers
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_transfer_id;

  RAISE NOTICE 'Transfer marked as completed with stock movements logged';

  -- Build and return result
  v_result := jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'source_variant_id', v_transfer.entity_id,
    'destination_variant_id', v_destination_variant_id,
    'quantity_transferred', v_transfer.quantity,
    'source_before', jsonb_build_object('quantity', v_source_previous_qty, 'reserved', v_source_previous_reserved),
    'source_after', jsonb_build_object('quantity', v_source_new_qty),
    'destination_before', jsonb_build_object('quantity', v_dest_previous_qty),
    'destination_after', jsonb_build_object('quantity', v_dest_new_qty),
    'completed_at', NOW(),
    'stock_movements_logged', true
  );

  RETURN v_result;
END;
$function$;

-- =====================================================================
-- 4. Create a view for transfer audit trail
-- =====================================================================
CREATE OR REPLACE VIEW v_transfer_audit_trail AS
SELECT 
  bt.id as transfer_id,
  bt.status as transfer_status,
  bt.created_at as transfer_created,
  bt.completed_at as transfer_completed,
  bt.quantity as transfer_quantity,
  fb.name as from_branch,
  tb.name as to_branch,
  p.name as product_name,
  -- Source stock movement
  sm_out.id as movement_out_id,
  sm_out.movement_type as movement_out_type,
  sm_out.quantity as movement_out_qty,
  sm_out.previous_quantity as source_previous_qty,
  sm_out.new_quantity as source_new_qty,
  sm_out.created_at as movement_out_time,
  -- Destination stock movement
  sm_in.id as movement_in_id,
  sm_in.movement_type as movement_in_type,
  sm_in.quantity as movement_in_qty,
  sm_in.previous_quantity as dest_previous_qty,
  sm_in.new_quantity as dest_new_qty,
  sm_in.created_at as movement_in_time
FROM branch_transfers bt
JOIN lats_branches fb ON bt.from_branch_id = fb.id
JOIN lats_branches tb ON bt.to_branch_id = tb.id
LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
LEFT JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN lats_stock_movements sm_out ON (
  sm_out.reference_type = 'branch_transfer' 
  AND sm_out.reference_id = bt.id 
  AND sm_out.movement_type = 'transfer_out'
)
LEFT JOIN lats_stock_movements sm_in ON (
  sm_in.reference_type = 'branch_transfer' 
  AND sm_in.reference_id = bt.id 
  AND sm_in.movement_type = 'transfer_in'
)
ORDER BY bt.created_at DESC;

-- =====================================================================
-- 5. Verification Queries
-- =====================================================================

-- Query to check if stock movements are being created
COMMENT ON VIEW v_transfer_audit_trail IS 
'View showing all branch transfers with their associated stock movements for audit trail';

-- Grant permissions
GRANT SELECT ON v_transfer_audit_trail TO public;

-- =====================================================================
-- 6. Test the improvements (Optional - run manually)
-- =====================================================================

-- Check existing transfer and its stock movements
-- SELECT * FROM v_transfer_audit_trail 
-- WHERE transfer_id = 'c18cca76-4af2-4ae6-86ba-b300ff49e4a3';

-- Check all stock movements for branch transfers
-- SELECT 
--   sm.id,
--   sm.movement_type,
--   sm.quantity,
--   sm.previous_quantity,
--   sm.new_quantity,
--   sm.reference_type,
--   sm.reference_id,
--   sm.created_at,
--   p.name as product_name,
--   b.name as branch_name
-- FROM lats_stock_movements sm
-- LEFT JOIN lats_product_variants pv ON sm.variant_id = pv.id
-- LEFT JOIN lats_products p ON sm.product_id = p.id
-- LEFT JOIN lats_branches b ON sm.branch_id = b.id
-- WHERE sm.reference_type = 'branch_transfer'
-- ORDER BY sm.created_at DESC;

-- =====================================================================
-- NOTES:
-- =====================================================================
-- 1. These functions are backward compatible - they still work with old code
--    that doesn't pass the extra parameters
-- 2. Stock movements will only be logged for NEW transfers after this update
-- 3. Old transfers won't have stock movements retroactively created
-- 4. The audit trail view will show NULL for stock movements on old transfers
-- =====================================================================

RAISE NOTICE 'Transfer functions updated with stock movement tracking!';
RAISE NOTICE 'New view created: v_transfer_audit_trail';
RAISE NOTICE 'All future transfers will now log stock movements for audit trail';

