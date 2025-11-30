-- ============================================================================
-- Fix Stock Transfer - Remove Non-Existent Column References
-- ============================================================================
-- This fixes the "column reorder_level does not exist" error
-- by updating the find_or_create_variant_at_branch function
-- to only use columns that actually exist in lats_product_variants
-- ============================================================================

-- Updated Function: Find or Create Variant at Branch (Fixed)
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.find_or_create_variant_at_branch TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed find_or_create_variant_at_branch function';
  RAISE NOTICE '   - Removed references to non-existent columns';
  RAISE NOTICE '   - Using reorder_point instead of reorder_level';
  RAISE NOTICE '   - Removed reorder_quantity (column does not exist)';
  RAISE NOTICE '   - Removed unit_of_measure (column does not exist)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Stock transfers should now work correctly!';
END;
$$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

