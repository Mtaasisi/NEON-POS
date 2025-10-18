-- ============================================================================
-- FIX: Complete Stock Transfer Function - ACTUAL INVENTORY MOVEMENT
-- ============================================================================
-- This fixes the critical bug where stock was only reduced from source
-- but never added to destination branch

-- Drop the broken function
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID);

-- Create the FIXED function with proper inventory movement
CREATE OR REPLACE FUNCTION complete_stock_transfer_transaction(
  p_transfer_id UUID,
  p_completed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer RECORD;
  v_source_variant RECORD;
  v_destination_variant_id UUID;
  v_destination_variant RECORD;
  v_result JSONB;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer
  FROM branch_transfers
  WHERE id = p_transfer_id;

  -- Validate transfer exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found: %', p_transfer_id;
  END IF;

  -- Validate transfer is in correct status
  IF v_transfer.status NOT IN ('approved', 'in_transit') THEN
    RAISE EXCEPTION 'Transfer must be approved or in transit before completion. Current status: %', v_transfer.status;
  END IF;

  -- Get source variant details
  SELECT * INTO v_source_variant
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', v_transfer.entity_id;
  END IF;

  -- Check if variant exists at destination branch
  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_source_variant.product_id
    AND variant_name = v_source_variant.variant_name
    AND sku = v_source_variant.sku
    AND branch_id = v_transfer.to_branch_id;

  -- If variant doesn't exist at destination, create it
  IF v_destination_variant_id IS NULL THEN
    INSERT INTO lats_product_variants (
      product_id,
      variant_name,
      sku,
      quantity,
      reserved_quantity,
      branch_id,
      created_at,
      updated_at
    ) VALUES (
      v_source_variant.product_id,
      v_source_variant.variant_name,
      v_source_variant.sku,
      0, -- Start with 0 quantity
      0, -- Start with 0 reserved
      v_transfer.to_branch_id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_destination_variant_id;
  END IF;

  -- Reduce stock from source branch (including releasing reservation)
  UPDATE lats_product_variants
  SET quantity = quantity - v_transfer.quantity,
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_transfer.quantity),
      updated_at = NOW()
  WHERE id = v_transfer.entity_id;

  -- Add stock to destination branch
  UPDATE lats_product_variants
  SET quantity = quantity + v_transfer.quantity,
      updated_at = NOW()
  WHERE id = v_destination_variant_id;

  -- Log outgoing movement (source branch)
  INSERT INTO lats_stock_movements (
    product_variant_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    from_branch_id,
    to_branch_id,
    reference_id,
    notes,
    created_by,
    created_at
  ) VALUES (
    v_transfer.entity_id,
    'transfer_out',
    -v_transfer.quantity,
    v_source_variant.quantity,
    v_source_variant.quantity - v_transfer.quantity,
    v_transfer.from_branch_id,
    v_transfer.to_branch_id,
    v_transfer.id,
    'Stock transfer out: ' || COALESCE(v_transfer.notes, 'Branch transfer'),
    p_completed_by,
    NOW()
  );

  -- Log incoming movement (destination branch)
  INSERT INTO lats_stock_movements (
    product_variant_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    from_branch_id,
    to_branch_id,
    reference_id,
    notes,
    created_by,
    created_at
  ) VALUES (
    v_destination_variant_id,
    'transfer_in',
    v_transfer.quantity,
    (SELECT quantity FROM lats_product_variants WHERE id = v_destination_variant_id) - v_transfer.quantity,
    (SELECT quantity FROM lats_product_variants WHERE id = v_destination_variant_id),
    v_transfer.from_branch_id,
    v_transfer.to_branch_id,
    v_transfer.id,
    'Stock transfer in: ' || COALESCE(v_transfer.notes, 'Branch transfer'),
    p_completed_by,
    NOW()
  );

  -- Mark transfer as completed
  UPDATE branch_transfers
  SET status = 'completed',
      completed_at = NOW(),
      completed_by = p_completed_by,
      updated_at = NOW()
  WHERE id = p_transfer_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'source_variant_id', v_transfer.entity_id,
    'destination_variant_id', v_destination_variant_id,
    'quantity_moved', v_transfer.quantity,
    'message', 'Transfer completed successfully'
  );

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction(UUID, UUID) TO authenticated;

-- Test the function (optional - remove in production)
-- SELECT complete_stock_transfer_transaction('your-transfer-id-here', 'your-user-id-here');
