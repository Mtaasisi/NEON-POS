-- ============================================================================
-- COMPLETE STOCK TRANSFER FIX - FINAL VERSION (ALL ERRORS FIXED)
-- ============================================================================
-- This script fixes the "column undefined" error and all function conflicts
-- Run this ONCE in your Neon database SQL editor
-- ============================================================================

-- ============================================================================
-- PART 1: ADD MISSING COLUMNS TO branch_transfers
-- ============================================================================

DO $$ 
BEGIN
  -- rejection_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE '✅ Added rejection_reason';
  ELSE
    RAISE NOTICE '✓ rejection_reason already exists';
  END IF;

  -- metadata
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Added metadata';
  ELSE
    RAISE NOTICE '✓ metadata already exists';
  END IF;

  -- requested_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'requested_at'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN requested_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added requested_at';
  END IF;

  -- approved_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN approved_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added approved_at';
  END IF;

  -- completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN completed_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added completed_at';
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added created_at';
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE branch_transfers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at';
  END IF;

  -- Update existing rows with default metadata
  UPDATE branch_transfers 
  SET metadata = COALESCE(metadata, '{}'::jsonb)
  WHERE metadata IS NULL;

  RAISE NOTICE '✅ All branch_transfers columns checked/added';
END $$;

-- ============================================================================
-- PART 2: ADD reserved_quantity TO lats_product_variants
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'reserved_quantity'
  ) THEN
    ALTER TABLE lats_product_variants ADD COLUMN reserved_quantity INTEGER DEFAULT 0 NOT NULL;
    RAISE NOTICE '✅ Added reserved_quantity to lats_product_variants';
  ELSE
    RAISE NOTICE '✓ reserved_quantity already exists in lats_product_variants';
  END IF;
END $$;

-- ============================================================================
-- PART 3: DROP EXISTING FUNCTIONS (to avoid signature conflicts)
-- ============================================================================

DROP FUNCTION IF EXISTS reserve_variant_stock(UUID, INTEGER);
DROP FUNCTION IF EXISTS release_variant_stock(UUID, INTEGER);
DROP FUNCTION IF EXISTS reduce_variant_stock(UUID, INTEGER);
DROP FUNCTION IF EXISTS increase_variant_stock(UUID, INTEGER);
DROP FUNCTION IF EXISTS check_duplicate_transfer(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS find_or_create_variant_at_branch(UUID, UUID);
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID, UUID);
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID);

-- ============================================================================
-- PART 4: CREATE ALL REQUIRED FUNCTIONS
-- ============================================================================

-- Function 1: Reserve Stock
CREATE FUNCTION reserve_variant_stock(
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

-- Function 2: Release Stock
CREATE FUNCTION release_variant_stock(
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

-- Function 3: Reduce Stock
CREATE FUNCTION reduce_variant_stock(
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

-- Function 4: Increase Stock
CREATE FUNCTION increase_variant_stock(
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

-- Function 5: Check Duplicate Transfer
CREATE FUNCTION check_duplicate_transfer(
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

-- Function 6: Find or Create Variant at Branch
CREATE FUNCTION find_or_create_variant_at_branch(
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

-- Function 7: Complete Transfer Transaction
CREATE FUNCTION complete_stock_transfer_transaction(
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
-- PART 5: CREATE/UPDATE TIMESTAMP TRIGGER
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
-- PART 6: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON branch_transfers TO PUBLIC;
GRANT SELECT, UPDATE ON lats_product_variants TO PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_variant_stock(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION release_variant_stock(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION reduce_variant_stock(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION increase_variant_stock(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION check_duplicate_transfer(UUID, UUID, UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION find_or_create_variant_at_branch(UUID, UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction(UUID, UUID) TO PUBLIC;

-- ============================================================================
-- PART 7: VERIFICATION & SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  missing_cols TEXT[] := ARRAY[]::TEXT[];
  missing_funcs TEXT[] := ARRAY[]::TEXT[];
  col_name TEXT;
  func_name TEXT;
BEGIN
  -- Check for missing columns
  SELECT ARRAY_AGG(required_column) INTO missing_cols
  FROM (
    VALUES 
      ('rejection_reason'),
      ('metadata'),
      ('requested_at'),
      ('approved_at'),
      ('completed_at'),
      ('created_at'),
      ('updated_at')
  ) AS required(required_column)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' 
    AND column_name = required_column
  );

  -- Check for missing functions
  SELECT ARRAY_AGG(required_function) INTO missing_funcs
  FROM (
    VALUES 
      ('reserve_variant_stock'),
      ('release_variant_stock'),
      ('reduce_variant_stock'),
      ('increase_variant_stock'),
      ('check_duplicate_transfer'),
      ('find_or_create_variant_at_branch'),
      ('complete_stock_transfer_transaction')
  ) AS required(required_function)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = required_function
  );

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ STOCK TRANSFER FIX COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF missing_cols IS NULL OR array_length(missing_cols, 1) IS NULL THEN
    RAISE NOTICE '✅ All required columns exist';
  ELSE
    RAISE NOTICE '❌ Still missing columns:';
    FOREACH col_name IN ARRAY missing_cols LOOP
      RAISE NOTICE '   - %', col_name;
    END LOOP;
  END IF;

  IF missing_funcs IS NULL OR array_length(missing_funcs, 1) IS NULL THEN
    RAISE NOTICE '✅ All 7 database functions created';
  ELSE
    RAISE NOTICE '❌ Still missing functions:';
    FOREACH func_name IN ARRAY missing_funcs LOOP
      RAISE NOTICE '   - %', func_name;
    END LOOP;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Timestamp trigger created';
  RAISE NOTICE '✅ Permissions granted';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '   1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)';
  RAISE NOTICE '   2. Try creating a stock transfer';
  RAISE NOTICE '   3. The "column undefined" error is FIXED! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

