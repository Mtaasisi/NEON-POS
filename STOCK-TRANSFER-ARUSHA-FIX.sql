-- ============================================================================
-- STOCK TRANSFER ARUSHA BRANCH FIX
-- ============================================================================
-- This file contains all necessary fixes for stock transfer functionality
-- Specifically for receiving transfers at the Arusha branch
-- ============================================================================

-- PART 1: Ensure Arusha Branch Exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM store_locations WHERE LOWER(name) LIKE '%arusha%' OR LOWER(city) LIKE '%arusha%') THEN
    INSERT INTO store_locations (
      name, code, city, address, is_main, is_active,
      share_products, share_customers, share_inventory, share_employees, share_suppliers
    ) VALUES (
      'Arusha Branch', 'ARUSHA', 'Arusha', 'Arusha, Tanzania', false, true,
      false, false, false, false, false
    );
    RAISE NOTICE 'Created Arusha branch';
  ELSE
    RAISE NOTICE 'Arusha branch already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Helper Functions for Stock Management
-- ============================================================================

-- Function to reserve stock for transfers
CREATE OR REPLACE FUNCTION reserve_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_qty INTEGER;
  v_reserved_qty INTEGER;
BEGIN
  -- Get current quantities
  SELECT quantity, reserved_quantity INTO v_current_qty, v_reserved_qty
  FROM lats_product_variants
  WHERE id = p_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;

  -- Check if enough stock available
  IF (v_current_qty - v_reserved_qty) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available stock. Available: %, Requested: %', 
      (v_current_qty - v_reserved_qty), p_quantity;
  END IF;

  -- Reserve the stock
  UPDATE lats_product_variants
  SET reserved_quantity = reserved_quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Reserved % units for variant %', p_quantity, p_variant_id;
END;
$$;

-- Function to release reserved stock
CREATE OR REPLACE FUNCTION release_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE lats_product_variants
  SET reserved_quantity = GREATEST(0, reserved_quantity - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Released % units for variant %', p_quantity, p_variant_id;
END;
$$;

-- Function to reduce stock (used when transfer is completed - reduces from source)
CREATE OR REPLACE FUNCTION reduce_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserved_qty INTEGER;
BEGIN
  -- Get current reserved quantity
  SELECT reserved_quantity INTO v_reserved_qty
  FROM lats_product_variants
  WHERE id = p_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;

  -- Reduce both quantity and reserved_quantity
  UPDATE lats_product_variants
  SET quantity = GREATEST(0, quantity - p_quantity),
      reserved_quantity = GREATEST(0, reserved_quantity - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Reduced % units from variant % (also released reservation)', p_quantity, p_variant_id;
END;
$$;

-- Function to increase stock (used when transfer is completed - increases at destination)
CREATE OR REPLACE FUNCTION increase_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE lats_product_variants
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Increased % units for variant %', p_quantity, p_variant_id;
END;
$$;

-- ============================================================================
-- PART 3: Find or Create Variant at Destination Branch
-- ============================================================================

CREATE OR REPLACE FUNCTION find_or_create_variant_at_branch(
  p_source_variant_id UUID,
  p_branch_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id UUID;
  v_destination_variant_id UUID;
  v_variant RECORD;
  v_branch_code TEXT;
BEGIN
  -- Get source variant details
  SELECT * INTO v_variant
  FROM lats_product_variants
  WHERE id = p_source_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', p_source_variant_id;
  END IF;

  v_product_id := v_variant.product_id;

  -- Get branch code for SKU generation
  SELECT code INTO v_branch_code
  FROM store_locations
  WHERE id = p_branch_id;

  -- Try to find existing variant at destination
  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_product_id
    AND branch_id = p_branch_id
  LIMIT 1;

  -- If not found, create it
  IF v_destination_variant_id IS NULL THEN
    INSERT INTO lats_product_variants (
      product_id, branch_id, variant_name, sku, quantity,
      reserved_quantity, unit_price, cost_price, is_active, created_at, updated_at
    ) VALUES (
      v_product_id, 
      p_branch_id, 
      v_variant.variant_name,
      v_variant.sku || '-' || COALESCE(v_branch_code, 'BR'),
      0, -- Start with 0 quantity
      0, -- No reservations
      v_variant.unit_price, 
      v_variant.cost_price, 
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO v_destination_variant_id;

    RAISE NOTICE 'Created new variant at destination branch: %', v_destination_variant_id;
  ELSE
    RAISE NOTICE 'Using existing variant at destination branch: %', v_destination_variant_id;
  END IF;

  RETURN v_destination_variant_id;
END;
$$;

-- ============================================================================
-- PART 4: Complete Stock Transfer Transaction (THE MAIN FIX)
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

  -- Validate branches exist and are active
  IF NOT EXISTS (SELECT 1 FROM store_locations WHERE id = v_transfer.from_branch_id AND is_active = true) THEN
    RAISE EXCEPTION 'Source branch not found or inactive';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM store_locations WHERE id = v_transfer.to_branch_id AND is_active = true) THEN
    RAISE EXCEPTION 'Destination branch not found or inactive';
  END IF;

  -- Get source variant quantities BEFORE transfer
  SELECT quantity, reserved_quantity 
  INTO v_source_previous_qty, v_source_previous_reserved
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', v_transfer.entity_id;
  END IF;

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

  -- ATOMIC TRANSACTION: Reduce stock from source (also releases reservation)
  PERFORM reduce_variant_stock(v_transfer.entity_id, v_transfer.quantity);

  -- ATOMIC TRANSACTION: Increase stock at destination
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
      completed_by = p_completed_by,
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
-- PART 5: Update Trigger for branch_transfers
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
-- PART 6: Grant Necessary Permissions
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION reserve_variant_stock(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION release_variant_stock(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION reduce_variant_stock(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION increase_variant_stock(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION find_or_create_variant_at_branch(UUID, UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction(UUID, UUID) TO PUBLIC;

-- ============================================================================
-- PART 7: Verification Queries
-- ============================================================================

-- Check if all functions exist
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN (
  'reserve_variant_stock',
  'release_variant_stock',
  'reduce_variant_stock',
  'increase_variant_stock',
  'find_or_create_variant_at_branch',
  'complete_stock_transfer_transaction'
)
ORDER BY proname;

-- Check branches
SELECT id, name, code, city, is_active
FROM store_locations
ORDER BY is_main DESC, name;

-- Check pending transfers to Arusha
SELECT 
  bt.id,
  bt.status,
  bt.quantity,
  from_br.name as from_branch,
  to_br.name as to_branch,
  pv.variant_name,
  pv.sku
FROM branch_transfers bt
JOIN store_locations from_br ON bt.from_branch_id = from_br.id
JOIN store_locations to_br ON bt.to_branch_id = to_br.id
LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
WHERE LOWER(to_br.name) LIKE '%arusha%'
  AND bt.status IN ('pending', 'approved', 'in_transit')
ORDER BY bt.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ STOCK TRANSFER FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All functions have been created/updated:';
  RAISE NOTICE '  ✓ reserve_variant_stock';
  RAISE NOTICE '  ✓ release_variant_stock';
  RAISE NOTICE '  ✓ reduce_variant_stock';
  RAISE NOTICE '  ✓ increase_variant_stock';
  RAISE NOTICE '  ✓ find_or_create_variant_at_branch';
  RAISE NOTICE '  ✓ complete_stock_transfer_transaction';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now test stock transfer to Arusha branch!';
  RAISE NOTICE '';
END $$;

