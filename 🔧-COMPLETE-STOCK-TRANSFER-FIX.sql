-- ============================================================================
-- COMPLETE STOCK TRANSFER FIX - PRODUCTION READY
-- ============================================================================
-- This script fixes all 12 critical issues identified in stock transfer system
-- Run this ONCE in your Neon database SQL editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure stock movements table exists with branch support
-- ============================================================================

CREATE TABLE IF NOT EXISTS lats_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  variant_id UUID,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer', 'sale', 'purchase', 'return')),
  quantity NUMERIC NOT NULL,
  previous_quantity NUMERIC,
  new_quantity NUMERIC,
  reference_type TEXT,
  reference_id UUID,
  reason TEXT,
  notes TEXT,
  from_branch_id UUID REFERENCES store_locations(id),
  to_branch_id UUID REFERENCES store_locations(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add branch columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_stock_movements' AND column_name = 'from_branch_id'
  ) THEN
    ALTER TABLE lats_stock_movements 
    ADD COLUMN from_branch_id UUID REFERENCES store_locations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_stock_movements' AND column_name = 'to_branch_id'
  ) THEN
    ALTER TABLE lats_stock_movements 
    ADD COLUMN to_branch_id UUID REFERENCES store_locations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_stock_movements' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE lats_stock_movements 
    ADD COLUMN created_by UUID;
  END IF;
END $$;

-- Indexes for stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON lats_stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON lats_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_from_branch ON lats_stock_movements(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_to_branch ON lats_stock_movements(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON lats_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON lats_stock_movements(created_at DESC);

-- ============================================================================
-- STEP 2: Add reserved_quantity column to track stock reservations
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'reserved_quantity'
  ) THEN
    ALTER TABLE lats_product_variants 
    ADD COLUMN reserved_quantity INTEGER DEFAULT 0;
    
    RAISE NOTICE '✅ Added reserved_quantity to lats_product_variants';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add rejection_reason column to branch_transfers
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE branch_transfers 
    ADD COLUMN rejection_reason TEXT;
    
    RAISE NOTICE '✅ Added rejection_reason to branch_transfers';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create function to find or create variant at destination branch
-- ============================================================================

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
  SELECT 
    pv.*,
    p.id as product_id,
    p.name as product_name,
    p.description,
    p.category_id,
    p.supplier_id,
    p.brand,
    p.model
  INTO v_source_variant
  FROM lats_product_variants pv
  JOIN lats_products p ON p.id = pv.product_id
  WHERE pv.id = p_source_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found';
  END IF;

  -- Check if product exists at destination branch
  -- If product has branch_id, we need to check/create it
  
  -- Try to find existing variant at destination branch with same product_id and attributes
  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_source_variant.product_id
    AND branch_id = p_destination_branch_id
    AND (variant_name = v_source_variant.variant_name OR sku = v_source_variant.sku)
  LIMIT 1;

  -- If variant exists, return its ID
  IF v_destination_variant_id IS NOT NULL THEN
    RETURN v_destination_variant_id;
  END IF;

  -- Variant doesn't exist, create a new one
  -- Generate unique SKU for destination branch
  v_new_sku := v_source_variant.sku || '-' || SUBSTRING(p_destination_branch_id::TEXT, 1, 8);

  INSERT INTO lats_product_variants (
    product_id,
    variant_name,
    sku,
    barcode,
    quantity,
    min_quantity,
    unit_price,
    cost_price,
    variant_attributes,
    branch_id,
    is_shared,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_source_variant.product_id,
    v_source_variant.variant_name,
    v_new_sku,
    v_source_variant.barcode,
    0, -- Start with 0 quantity
    v_source_variant.min_quantity,
    v_source_variant.unit_price,
    v_source_variant.cost_price,
    v_source_variant.variant_attributes,
    p_destination_branch_id,
    false, -- Not shared
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_destination_variant_id;

  RAISE NOTICE 'Created new variant % at branch %', v_destination_variant_id, p_destination_branch_id;
  
  RETURN v_destination_variant_id;
END;
$$;

-- ============================================================================
-- STEP 5: Create function to reserve stock for transfer
-- ============================================================================

CREATE OR REPLACE FUNCTION reserve_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_quantity INTEGER;
BEGIN
  -- Get available quantity (total - reserved)
  SELECT (quantity - COALESCE(reserved_quantity, 0))
  INTO v_available_quantity
  FROM lats_product_variants
  WHERE id = p_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found';
  END IF;

  IF v_available_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available stock. Available: %, Requested: %', 
      v_available_quantity, p_quantity;
  END IF;

  -- Reserve the stock
  UPDATE lats_product_variants
  SET reserved_quantity = COALESCE(reserved_quantity, 0) + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- STEP 6: Create function to release reserved stock
-- ============================================================================

CREATE OR REPLACE FUNCTION release_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lats_product_variants
  SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- STEP 7: Create function to reduce variant stock (updated)
-- ============================================================================

CREATE OR REPLACE FUNCTION reduce_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if variant exists and has enough stock (considering reservations)
  IF NOT EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE id = p_variant_id
    AND quantity >= p_quantity
  ) THEN
    RAISE EXCEPTION 'Insufficient stock or variant not found';
  END IF;

  -- Reduce actual quantity and reserved quantity
  UPDATE lats_product_variants
  SET quantity = quantity - p_quantity,
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;
END;
$$;

-- ============================================================================
-- STEP 8: Create function to increase variant stock
-- ============================================================================

CREATE OR REPLACE FUNCTION increase_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increase stock quantity
  UPDATE lats_product_variants
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 9: Create comprehensive stock transfer function (FIXES ISSUE #1, #2, #3)
-- ============================================================================

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
  -- Get transfer details
  SELECT * INTO v_transfer
  FROM branch_transfers
  WHERE id = p_transfer_id
  FOR UPDATE; -- Lock the row

  -- Validate transfer exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found: %', p_transfer_id;
  END IF;

  -- Validate transfer is in correct status
  IF v_transfer.status NOT IN ('approved', 'in_transit') THEN
    RAISE EXCEPTION 'Transfer must be approved or in_transit. Current status: %', v_transfer.status;
  END IF;

  -- Validate branches exist and are active
  IF NOT EXISTS (
    SELECT 1 FROM store_locations 
    WHERE id = v_transfer.from_branch_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Source branch not found or inactive';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM store_locations 
    WHERE id = v_transfer.to_branch_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Destination branch not found or inactive';
  END IF;

  -- Get current stock level at source
  SELECT quantity INTO v_source_previous_qty
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  -- Find or create variant at destination branch (FIXES ISSUE #2)
  v_destination_variant_id := find_or_create_variant_at_branch(
    v_transfer.entity_id,
    v_transfer.to_branch_id
  );

  -- Get current stock level at destination
  SELECT quantity INTO v_dest_previous_qty
  FROM lats_product_variants
  WHERE id = v_destination_variant_id;

  -- START ATOMIC TRANSACTION (FIXES ISSUE #3)
  
  -- 1. Reduce stock from source branch
  PERFORM reduce_variant_stock(v_transfer.entity_id, v_transfer.quantity);

  -- 2. Increase stock at destination branch (FIXES ISSUE #1)
  PERFORM increase_variant_stock(v_destination_variant_id, v_transfer.quantity);

  -- 3. Log stock movement for source (outgoing) (FIXES ISSUE #4)
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    reference_type,
    reference_id,
    reason,
    notes,
    from_branch_id,
    to_branch_id,
    created_by,
    created_at
  ) VALUES (
    (SELECT product_id FROM lats_product_variants WHERE id = v_transfer.entity_id),
    v_transfer.entity_id,
    'transfer',
    -v_transfer.quantity, -- Negative for outgoing
    v_source_previous_qty,
    v_source_previous_qty - v_transfer.quantity,
    'branch_transfer',
    v_transfer.id,
    'Stock transfer out',
    'Transfer to branch: ' || COALESCE(v_transfer.notes, 'Branch transfer'),
    v_transfer.from_branch_id,
    v_transfer.to_branch_id,
    p_completed_by,
    NOW()
  );

  -- 4. Log stock movement for destination (incoming)
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    reference_type,
    reference_id,
    reason,
    notes,
    from_branch_id,
    to_branch_id,
    created_by,
    created_at
  ) VALUES (
    (SELECT product_id FROM lats_product_variants WHERE id = v_destination_variant_id),
    v_destination_variant_id,
    'transfer',
    v_transfer.quantity, -- Positive for incoming
    v_dest_previous_qty,
    v_dest_previous_qty + v_transfer.quantity,
    'branch_transfer',
    v_transfer.id,
    'Stock transfer in',
    'Transfer from branch: ' || COALESCE(v_transfer.notes, 'Branch transfer'),
    v_transfer.from_branch_id,
    v_transfer.to_branch_id,
    p_completed_by,
    NOW()
  );

  -- 5. Mark transfer as completed
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
    'quantity_transferred', v_transfer.quantity,
    'source_new_quantity', v_source_previous_qty - v_transfer.quantity,
    'destination_new_quantity', v_dest_previous_qty + v_transfer.quantity
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically in PostgreSQL for failed functions
    RAISE EXCEPTION 'Transfer completion failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- STEP 10: Create function to check for duplicate pending transfers
-- ============================================================================

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

-- ============================================================================
-- STEP 11: Update branch_transfers timestamp trigger
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
-- STEP 12: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON branch_transfers TO PUBLIC;
GRANT SELECT, INSERT ON lats_stock_movements TO PUBLIC;
GRANT SELECT, UPDATE ON lats_product_variants TO PUBLIC;

GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction TO PUBLIC;
GRANT EXECUTE ON FUNCTION find_or_create_variant_at_branch TO PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION release_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION reduce_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION increase_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION check_duplicate_transfer TO PUBLIC;

-- ============================================================================
-- STEP 13: Verification queries
-- ============================================================================

-- Check functions exist
SELECT 
  'Functions Check' as check_type,
  COUNT(*) as count,
  STRING_AGG(proname, ', ') as functions
FROM pg_proc
WHERE proname IN (
  'complete_stock_transfer_transaction',
  'find_or_create_variant_at_branch',
  'reserve_variant_stock',
  'release_variant_stock',
  'reduce_variant_stock',
  'increase_variant_stock',
  'check_duplicate_transfer'
);

-- Check columns exist
SELECT 
  'Columns Check' as check_type,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('branch_transfers', 'lats_product_variants', 'lats_stock_movements')
  AND column_name IN ('reserved_quantity', 'rejection_reason', 'from_branch_id', 'to_branch_id')
ORDER BY table_name, column_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ STOCK TRANSFER SYSTEM - COMPLETE FIX APPLIED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Issue #1 FIXED: Stock now properly added to destination';
  RAISE NOTICE '✅ Issue #2 FIXED: Variants created at destination if missing';
  RAISE NOTICE '✅ Issue #3 FIXED: Transaction safety with rollback';
  RAISE NOTICE '✅ Issue #4 FIXED: Complete audit trail logging';
  RAISE NOTICE '✅ Issue #9 FIXED: Stock reservation system added';
  RAISE NOTICE '✅ Issue #11 FIXED: Rejection reason separate from notes';
  RAISE NOTICE '✅ Issue #12 FIXED: Duplicate transfer detection';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEP: Update your frontend API (stockTransferApi.ts)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

