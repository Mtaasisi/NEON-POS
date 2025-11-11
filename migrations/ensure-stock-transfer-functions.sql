-- ============================================================================
-- Stock Transfer System - Database Functions Migration
-- ============================================================================
-- This migration ensures all required functions exist for stock transfers
-- Run this if you're experiencing "function does not exist" errors
-- ============================================================================

-- Function 1: Reserve Stock
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Validate available stock before reserving
  IF (
    SELECT (quantity - COALESCE(reserved_quantity, 0))
    FROM lats_product_variants
    WHERE id = p_variant_id
  ) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available stock to reserve % units', p_quantity;
  END IF;

  -- Reserve the stock
  UPDATE lats_product_variants
  SET reserved_quantity = COALESCE(reserved_quantity, 0) + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Reserved % units for variant %', p_quantity, p_variant_id;
END;
$$;

-- Function 2: Release Reserved Stock
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Release the reserved stock (cannot go below 0)
  UPDATE lats_product_variants
  SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Released % units for variant %', p_quantity, p_variant_id;
END;
$$;

-- Function 3: Reduce Stock (for transfer completion)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reduce_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Reduce both quantity AND reserved_quantity
  -- This ensures the reservation is released during the transfer
  UPDATE lats_product_variants
  SET quantity = GREATEST(0, quantity - p_quantity),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Reduced % units from variant %', p_quantity, p_variant_id;
END;
$$;

-- Function 4: Increase Stock (at destination)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increase_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Add stock to destination variant
  UPDATE lats_product_variants
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Increased % units for variant %', p_quantity, p_variant_id;
END;
$$;

-- Function 5: Find or Create Variant at Branch
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_or_create_variant_at_branch(
  p_source_variant_id UUID,
  p_branch_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_source_variant RECORD;
  v_destination_variant_id UUID;
  v_branch_code TEXT;
  v_new_sku TEXT;
BEGIN
  -- Get source variant details
  SELECT * INTO v_source_variant
  FROM lats_product_variants
  WHERE id = p_source_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', p_source_variant_id;
  END IF;

  -- Check if variant already exists at destination branch
  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_source_variant.product_id
    AND branch_id = p_branch_id
    AND (
      variant_name = v_source_variant.variant_name
      OR (variant_name IS NULL AND v_source_variant.variant_name IS NULL)
    );

  IF FOUND THEN
    RAISE NOTICE 'Found existing variant at branch: %', v_destination_variant_id;
    RETURN v_destination_variant_id;
  END IF;

  -- Get branch code for SKU generation
  SELECT code INTO v_branch_code
  FROM store_locations
  WHERE id = p_branch_id;

  IF v_branch_code IS NULL THEN
    v_branch_code := 'BR';
  END IF;

  -- Generate new SKU with branch code
  v_new_sku := v_source_variant.sku || '-' || v_branch_code;

  -- Create new variant at destination branch
  -- Only using columns that actually exist in the table
  INSERT INTO lats_product_variants (
    product_id,
    branch_id,
    variant_name,
    sku,
    barcode,
    cost_price,
    selling_price,
    quantity,
    reserved_quantity,
    reorder_point,
    is_active,
    variant_attributes,
    created_at,
    updated_at
  ) VALUES (
    v_source_variant.product_id,
    p_branch_id,
    v_source_variant.variant_name,
    v_new_sku,
    v_source_variant.barcode,
    v_source_variant.cost_price,
    v_source_variant.selling_price,
    0, -- Start with 0 quantity
    0, -- No reserved quantity
    COALESCE(v_source_variant.reorder_point, 0), -- Use reorder_point, not reorder_level
    true,
    COALESCE(v_source_variant.variant_attributes, '{}'::jsonb), -- Copy variant attributes
    NOW(),
    NOW()
  )
  RETURNING id INTO v_destination_variant_id;

  RAISE NOTICE 'Created new variant at branch: %', v_destination_variant_id;
  RETURN v_destination_variant_id;
END;
$$;

-- Function 6: Check for Duplicate Transfers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_duplicate_transfer(
  p_from_branch_id UUID,
  p_to_branch_id UUID,
  p_entity_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM branch_transfers
  WHERE from_branch_id = p_from_branch_id
    AND to_branch_id = p_to_branch_id
    AND entity_id = p_entity_id
    AND status IN ('pending', 'approved', 'in_transit');

  RETURN v_count > 0;
END;
$$;

-- Function 7: Complete Stock Transfer Transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_stock_transfer_transaction(
  p_transfer_id UUID,
  p_completed_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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

  -- Validate transfer status - MUST be in_transit (shipped) before completion
  IF v_transfer.status != 'in_transit' THEN
    RAISE EXCEPTION 'Transfer must be marked as "in_transit" (shipped) before it can be completed. Current status: %. Please ask the sender to mark it as shipped first.', v_transfer.status;
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

  -- Make product shared across branches (so it appears in both branch inventories)
  UPDATE lats_products
  SET is_shared = true
  WHERE id = (SELECT product_id FROM lats_product_variants WHERE id = v_transfer.entity_id);

  RAISE NOTICE 'Product marked as shared for multi-branch visibility';

  -- Reduce stock from source (also releases reservation)
  PERFORM reduce_variant_stock(v_transfer.entity_id, v_transfer.quantity);

  -- Increase stock at destination
  PERFORM increase_variant_stock(v_destination_variant_id, v_transfer.quantity);

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

  RAISE NOTICE 'Transfer marked as completed';

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
    'completed_at', NOW()
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  v_function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN (
    'reserve_variant_stock',
    'release_variant_stock',
    'reduce_variant_stock',
    'increase_variant_stock',
    'find_or_create_variant_at_branch',
    'check_duplicate_transfer',
    'complete_stock_transfer_transaction'
  );

  RAISE NOTICE '✅ Stock Transfer Functions Installed: % of 7', v_function_count;

  IF v_function_count = 7 THEN
    RAISE NOTICE '🎉 All stock transfer functions are ready!';
  ELSE
    RAISE WARNING '⚠️  Missing % functions. Check for errors above.', 7 - v_function_count;
  END IF;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.reserve_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.reduce_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.increase_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_variant_at_branch TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_duplicate_transfer TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stock_transfer_transaction TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

