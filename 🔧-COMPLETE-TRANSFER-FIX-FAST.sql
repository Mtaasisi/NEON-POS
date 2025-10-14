-- ============================================================================
-- COMPLETE STOCK TRANSFER FIX - FAST VERSION
-- ============================================================================
-- This is a streamlined version that fixes the "column undefined" error
-- Run this ONCE in your Neon database SQL editor
-- ============================================================================

-- ============================================================================
-- PART 1: FIX MISSING COLUMNS
-- ============================================================================

-- Add rejection_reason column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE '✅ Added rejection_reason';
  END IF;
END $$;

-- Add metadata column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    UPDATE branch_transfers SET metadata = '{}'::jsonb WHERE metadata IS NULL;
    RAISE NOTICE '✅ Added metadata';
  END IF;
END $$;

-- Add timestamp columns if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_transfers' AND column_name = 'requested_at') THEN
    ALTER TABLE branch_transfers ADD COLUMN requested_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_transfers' AND column_name = 'approved_at') THEN
    ALTER TABLE branch_transfers ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_transfers' AND column_name = 'completed_at') THEN
    ALTER TABLE branch_transfers ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_transfers' AND column_name = 'created_at') THEN
    ALTER TABLE branch_transfers ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_transfers' AND column_name = 'updated_at') THEN
    ALTER TABLE branch_transfers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  RAISE NOTICE '✅ Ensured all timestamp columns exist';
END $$;

-- Add reserved_quantity to variants
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'reserved_quantity'
  ) THEN
    ALTER TABLE lats_product_variants ADD COLUMN reserved_quantity INTEGER DEFAULT 0 NOT NULL;
    RAISE NOTICE '✅ Added reserved_quantity to variants';
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE ESSENTIAL FUNCTIONS
-- ============================================================================

-- Function: Reserve Stock
CREATE OR REPLACE FUNCTION reserve_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lats_product_variants
  SET reserved_quantity = COALESCE(reserved_quantity, 0) + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;
END;
$$;

-- Function: Release Stock
CREATE OR REPLACE FUNCTION release_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lats_product_variants
  SET reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - p_quantity, 0),
      updated_at = NOW()
  WHERE id = p_variant_id;
END;
$$;

-- Function: Reduce Stock
CREATE OR REPLACE FUNCTION reduce_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lats_product_variants
  SET quantity = quantity - p_quantity,
      reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - p_quantity, 0),
      updated_at = NOW()
  WHERE id = p_variant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;
END;
$$;

-- Function: Increase Stock
CREATE OR REPLACE FUNCTION increase_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lats_product_variants
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;
END;
$$;

-- Function: Check Duplicate Transfer
CREATE OR REPLACE FUNCTION check_duplicate_transfer(
  p_from_branch_id UUID,
  p_to_branch_id UUID,
  p_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM branch_transfers
    WHERE from_branch_id = p_from_branch_id
      AND to_branch_id = p_to_branch_id
      AND entity_id = p_entity_id
      AND status IN ('pending', 'approved', 'in_transit')
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Function: Find or Create Variant at Branch
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
BEGIN
  -- Get source variant details
  SELECT * INTO v_source_variant
  FROM lats_product_variants
  WHERE id = p_source_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', p_source_variant_id;
  END IF;

  -- Check if variant already exists at destination
  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_source_variant.product_id
    AND branch_id = p_destination_branch_id
    AND variant_name = v_source_variant.variant_name
  LIMIT 1;

  -- If exists, return it
  IF FOUND THEN
    RETURN v_destination_variant_id;
  END IF;

  -- Generate new SKU for destination
  v_new_sku := v_source_variant.sku || '-' || LEFT(p_destination_branch_id::text, 8);

  -- Create new variant at destination
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

  RETURN v_destination_variant_id;
END;
$$;

-- Function: Complete Transfer Transaction
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
  v_destination_variant_id UUID;
  v_source_previous_qty INTEGER;
  v_dest_previous_qty INTEGER;
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

  IF v_transfer.status NOT IN ('approved', 'in_transit') THEN
    RAISE EXCEPTION 'Transfer must be approved or in_transit. Current: %', v_transfer.status;
  END IF;

  -- Get source variant quantity
  SELECT quantity INTO v_source_previous_qty
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  -- Find or create destination variant
  v_destination_variant_id := find_or_create_variant_at_branch(
    v_transfer.entity_id,
    v_transfer.to_branch_id
  );

  -- Get destination variant quantity
  SELECT quantity INTO v_dest_previous_qty
  FROM lats_product_variants
  WHERE id = v_destination_variant_id;

  -- Reduce stock from source (also releases reservation)
  PERFORM reduce_variant_stock(v_transfer.entity_id, v_transfer.quantity);

  -- Increase stock at destination
  PERFORM increase_variant_stock(v_destination_variant_id, v_transfer.quantity);

  -- Mark transfer as completed
  UPDATE branch_transfers
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_transfer_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'source_variant_id', v_transfer.entity_id,
    'destination_variant_id', v_destination_variant_id,
    'quantity_transferred', v_transfer.quantity
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- PART 3: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON branch_transfers TO PUBLIC;
GRANT SELECT, UPDATE ON lats_product_variants TO PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION release_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION reduce_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION increase_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION check_duplicate_transfer TO PUBLIC;
GRANT EXECUTE ON FUNCTION find_or_create_variant_at_branch TO PUBLIC;
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction TO PUBLIC;

-- ============================================================================
-- PART 4: CREATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_branch_transfer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_branch_transfer_timestamp ON branch_transfers;

CREATE TRIGGER trg_update_branch_transfer_timestamp
  BEFORE UPDATE ON branch_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_transfer_timestamp();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ STOCK TRANSFER FIX COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Added missing columns:';
  RAISE NOTICE '   - rejection_reason';
  RAISE NOTICE '   - metadata';
  RAISE NOTICE '   - reserved_quantity (in variants)';
  RAISE NOTICE '   - All timestamp columns';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Created 7 database functions';
  RAISE NOTICE '✅ Set up permissions';
  RAISE NOTICE '✅ Created timestamp trigger';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '   1. Refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)';
  RAISE NOTICE '   2. Try creating a stock transfer again';
  RAISE NOTICE '   3. The "column undefined" error should be FIXED!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

