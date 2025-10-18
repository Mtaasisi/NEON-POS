-- ============================================================================
-- CRITICAL FIX: Complete Stock Transfer Function - ACTUAL INVENTORY MOVEMENT
-- ============================================================================
-- This fixes the critical bug where stock was only reduced from source
-- but never added to destination branch

-- Drop the broken function first
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID);
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID, UUID);

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
  v_source_quantity_before INTEGER;
  v_destination_quantity_before INTEGER;
BEGIN
  -- Get transfer details with validation
  SELECT * INTO v_transfer
  FROM branch_transfers
  WHERE id = p_transfer_id;

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

  -- Store quantities before changes for audit trail
  v_source_quantity_before := v_source_variant.quantity;
  
  -- Get destination quantity before changes
  IF v_destination_variant_id IS NOT NULL THEN
    SELECT quantity INTO v_destination_quantity_before
    FROM lats_product_variants
    WHERE id = v_destination_variant_id;
  ELSE
    v_destination_quantity_before := 0;
  END IF;

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
    
    RAISE NOTICE 'Created new variant at destination branch: %', v_destination_variant_id;
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
    v_source_quantity_before,
    v_source_quantity_before - v_transfer.quantity,
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
    v_destination_quantity_before,
    v_destination_quantity_before + v_transfer.quantity,
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

  -- Build detailed result
  v_result := jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'source_variant_id', v_transfer.entity_id,
    'destination_variant_id', v_destination_variant_id,
    'quantity_moved', v_transfer.quantity,
    'source_branch_id', v_transfer.from_branch_id,
    'destination_branch_id', v_transfer.to_branch_id,
    'source_quantity_before', v_source_quantity_before,
    'source_quantity_after', v_source_quantity_before - v_transfer.quantity,
    'destination_quantity_before', v_destination_quantity_before,
    'destination_quantity_after', v_destination_quantity_before + v_transfer.quantity,
    'message', 'Transfer completed successfully - inventory moved between branches',
    'completed_at', NOW(),
    'completed_by', p_completed_by
  );

  RAISE NOTICE 'Transfer completed: %', v_result;
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction(UUID, UUID) TO authenticated;

-- Test the function (uncomment and replace with actual IDs for testing)
-- SELECT complete_stock_transfer_transaction('your-transfer-id-here', 'your-user-id-here');

COMMENT ON FUNCTION complete_stock_transfer_transaction(UUID, UUID) IS 'FIXED: Completes stock transfer by moving inventory from source to destination branch with full audit trail';
