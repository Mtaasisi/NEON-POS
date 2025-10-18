-- ============================================================================
-- FIX: Duplicate SKU Error on Stock Transfer Completion
-- ============================================================================
-- This fixes the "duplicate key value violates unique constraint lats_product_variants_sku_key" error
-- that occurs when completing stock transfers.
--
-- The problem: When transferring the same product to the same branch multiple times,
-- the function tries to create a variant with a SKU that already exists.
--
-- The solution: Improve the find_or_create_variant_at_branch function to handle duplicates
-- ============================================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS find_or_create_variant_at_branch(UUID, UUID);

-- Create improved version with better duplicate handling
CREATE OR REPLACE FUNCTION find_or_create_variant_at_branch(
  p_source_variant_id UUID,
  p_destination_branch_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_variant RECORD;
  v_destination_variant_id UUID;
  v_new_sku TEXT;
  v_sku_suffix TEXT;
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 10;
BEGIN
  -- Get source variant details
  SELECT * INTO v_source_variant
  FROM lats_product_variants
  WHERE id = p_source_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', p_source_variant_id;
  END IF;

  -- Check if variant already exists at destination (by product_id, branch_id, and variant_name)
  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_source_variant.product_id
    AND branch_id = p_destination_branch_id
    AND variant_name = v_source_variant.variant_name
  LIMIT 1;

  -- If exists, return it
  IF FOUND THEN
    RAISE NOTICE 'Found existing variant at destination: %', v_destination_variant_id;
    RETURN v_destination_variant_id;
  END IF;

  -- Generate a unique SKU for destination
  -- Strategy: Try different suffixes until we find one that doesn't exist
  v_sku_suffix := LEFT(p_destination_branch_id::text, 8);
  
  WHILE v_attempt < v_max_attempts LOOP
    IF v_attempt = 0 THEN
      -- First attempt: original SKU + branch ID
      v_new_sku := v_source_variant.sku || '-' || v_sku_suffix;
    ELSE
      -- Subsequent attempts: add a counter
      v_new_sku := v_source_variant.sku || '-' || v_sku_suffix || '-' || v_attempt::text;
    END IF;
    
    -- Check if this SKU exists
    IF NOT EXISTS (SELECT 1 FROM lats_product_variants WHERE sku = v_new_sku) THEN
      -- SKU is unique, we can use it
      EXIT;
    END IF;
    
    v_attempt := v_attempt + 1;
  END LOOP;
  
  IF v_attempt >= v_max_attempts THEN
    RAISE EXCEPTION 'Could not generate unique SKU after % attempts', v_max_attempts;
  END IF;

  RAISE NOTICE 'Creating new variant with SKU: %', v_new_sku;

  -- Create new variant at destination with unique SKU
  BEGIN
    INSERT INTO lats_product_variants (
      product_id,
      branch_id,
      variant_name,
      sku,
      price,
      cost_price,
      quantity,
      reserved_quantity,
      low_stock_threshold,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      v_source_variant.product_id,
      p_destination_branch_id,
      v_source_variant.variant_name,
      v_new_sku,
      v_source_variant.price,
      v_source_variant.cost_price,
      0, -- Start with 0 quantity
      0, -- Start with 0 reserved
      v_source_variant.low_stock_threshold,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_destination_variant_id;
    
    RAISE NOTICE 'Successfully created variant: %', v_destination_variant_id;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- If we still get a unique violation, try to find the existing variant
      RAISE NOTICE 'Caught unique violation, searching for existing variant...';
      
      SELECT id INTO v_destination_variant_id
      FROM lats_product_variants
      WHERE product_id = v_source_variant.product_id
        AND branch_id = p_destination_branch_id
        AND variant_name = v_source_variant.variant_name
      LIMIT 1;
      
      IF NOT FOUND THEN
        -- Still not found? Try by SKU
        SELECT id INTO v_destination_variant_id
        FROM lats_product_variants
        WHERE sku = v_new_sku;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Unique violation but variant not found. SKU: %', v_new_sku;
        END IF;
      END IF;
      
      RAISE NOTICE 'Using existing variant after unique violation: %', v_destination_variant_id;
  END;

  RETURN v_destination_variant_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_or_create_variant_at_branch TO PUBLIC;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify the function was created:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'find_or_create_variant_at_branch';

COMMENT ON FUNCTION find_or_create_variant_at_branch IS 
'Finds an existing variant at the destination branch or creates a new one with a unique SKU. 
Handles duplicate SKU conflicts gracefully.';

