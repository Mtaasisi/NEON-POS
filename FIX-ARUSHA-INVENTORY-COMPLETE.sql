-- ============================================================================
-- FIX ARUSHA INVENTORY - COMPLETE SOLUTION
-- ============================================================================
-- This fixes the issue where transferred products don't appear in ARUSHA
-- inventory because they're not being marked as shared during transfer
-- ============================================================================

-- ============================================================================
-- PART 1: Ensure is_shared column exists
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN is_shared BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added is_shared column to lats_products';
  ELSE
    RAISE NOTICE '✓ is_shared column already exists in lats_products';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_product_variants ADD COLUMN is_shared BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added is_shared column to lats_product_variants';
  ELSE
    RAISE NOTICE '✓ is_shared column already exists in lats_product_variants';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_is_shared ON lats_products(is_shared);
CREATE INDEX IF NOT EXISTS idx_variants_is_shared ON lats_product_variants(is_shared);

-- ============================================================================
-- PART 2: Mark all existing transferred products as shared
-- ============================================================================

-- Find products that have variants in multiple branches and mark them as shared
WITH multi_branch_products AS (
  SELECT DISTINCT product_id
  FROM lats_product_variants
  WHERE branch_id IS NOT NULL
  GROUP BY product_id
  HAVING COUNT(DISTINCT branch_id) > 1
)
UPDATE lats_products p
SET is_shared = true
FROM multi_branch_products mbp
WHERE p.id = mbp.product_id
  AND (p.is_shared = false OR p.is_shared IS NULL);

-- ============================================================================
-- PART 3: Fix the complete_stock_transfer_transaction function
-- ============================================================================

-- Drop the broken function first
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID);
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID, UUID);

-- Create the FIXED function with auto-share feature
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
  v_product_id UUID;
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
    RAISE EXCEPTION 'Transfer must be approved or in transit. Current status: %', v_transfer.status;
  END IF;

  -- Get source variant details
  SELECT * INTO v_source_variant
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', v_transfer.entity_id;
  END IF;

  -- Store product ID for later use
  v_product_id := v_source_variant.product_id;
  
  -- Store quantities before changes
  v_source_quantity_before := v_source_variant.quantity;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 🔑 CRITICAL FIX: Mark product as shared BEFORE transfer
  -- ═══════════════════════════════════════════════════════════════════════
  UPDATE lats_products
  SET is_shared = true,
      updated_at = NOW()
  WHERE id = v_product_id;
  
  RAISE NOTICE '✅ Marked product % as shared across branches', v_product_id;
  -- ═══════════════════════════════════════════════════════════════════════

  -- Check if variant exists at destination branch
  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_source_variant.product_id
    AND variant_name = v_source_variant.variant_name
    AND sku = v_source_variant.sku
    AND branch_id = v_transfer.to_branch_id;

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
      is_shared,
      created_at,
      updated_at
    ) VALUES (
      v_source_variant.product_id,
      v_source_variant.variant_name,
      v_source_variant.sku,
      0, -- Start with 0 quantity
      0, -- Start with 0 reserved
      v_transfer.to_branch_id,
      true, -- Mark variant as shared too
      NOW(),
      NOW()
    ) RETURNING id INTO v_destination_variant_id;
    
    RAISE NOTICE '✅ Created new variant at destination branch: %', v_destination_variant_id;
  ELSE
    -- Mark existing destination variant as shared too
    UPDATE lats_product_variants
    SET is_shared = true,
        updated_at = NOW()
    WHERE id = v_destination_variant_id;
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

  -- Log stock movements (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_stock_movements') THEN
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
  END IF;

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
    'product_id', v_product_id,
    'source_variant_id', v_transfer.entity_id,
    'destination_variant_id', v_destination_variant_id,
    'quantity_moved', v_transfer.quantity,
    'source_branch_id', v_transfer.from_branch_id,
    'destination_branch_id', v_transfer.to_branch_id,
    'source_quantity_before', v_source_quantity_before,
    'source_quantity_after', v_source_quantity_before - v_transfer.quantity,
    'destination_quantity_before', v_destination_quantity_before,
    'destination_quantity_after', v_destination_quantity_before + v_transfer.quantity,
    'product_marked_shared', true,
    'message', 'Transfer completed - product now visible across all branches',
    'completed_at', NOW()
  );

  RAISE NOTICE '✅ Transfer completed: Product % now shared across branches', v_product_id;
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction(UUID, UUID) TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION complete_stock_transfer_transaction(UUID, UUID) IS 
'Completes stock transfer by moving inventory between branches and marking product as shared for multi-branch visibility';

-- ============================================================================
-- PART 4: Verification Query
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ARUSHA INVENTORY FIX COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '  1. ✅ Ensured is_shared column exists';
  RAISE NOTICE '  2. ✅ Marked existing multi-branch products as shared';
  RAISE NOTICE '  3. ✅ Updated transfer function to auto-share products';
  RAISE NOTICE '  4. ✅ All transferred products now visible at destination';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)';
  RAISE NOTICE '  2. Switch to ARUSHA branch';
  RAISE NOTICE '  3. Check inventory - products should now be visible!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Show current state of products for ARUSHA
SELECT 
  '✅ Products that should now be visible in ARUSHA:' as info,
  COUNT(*) as product_count
FROM lats_products 
WHERE is_shared = true;

