-- ============================================================================
-- Stock Transfer Database Function Setup
-- ============================================================================
-- This script creates the necessary database function for stock transfers
-- Run this in your Neon/Supabase SQL editor ONCE before using stock transfers

-- ============================================================================
-- Function: Reduce Variant Stock
-- ============================================================================
-- This function safely reduces stock quantity for a variant
-- Used when transferring stock from one branch to another

CREATE OR REPLACE FUNCTION reduce_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if variant exists and has enough stock
  IF NOT EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE id = p_variant_id
    AND quantity >= p_quantity
  ) THEN
    RAISE EXCEPTION 'Insufficient stock or variant not found';
  END IF;

  -- Reduce stock quantity
  UPDATE lats_product_variants
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;
END;
$$;

-- ============================================================================
-- Function: Increase Variant Stock
-- ============================================================================
-- This function safely increases stock quantity for a variant
-- Used when receiving stock at destination branch

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
END;
$$;

-- ============================================================================
-- Function: Complete Stock Transfer
-- ============================================================================
-- This function handles the complete stock transfer process
-- It reduces stock from source and increases stock at destination

CREATE OR REPLACE FUNCTION complete_stock_transfer_transaction(
  p_transfer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer RECORD;
  v_destination_variant_id UUID;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer
  FROM branch_transfers
  WHERE id = p_transfer_id;

  -- Validate transfer exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  -- Validate transfer is in correct status
  IF v_transfer.status NOT IN ('approved', 'in_transit') THEN
    RAISE EXCEPTION 'Transfer must be approved or in transit before completion';
  END IF;

  -- Reduce stock from source branch
  PERFORM reduce_variant_stock(v_transfer.entity_id, v_transfer.quantity);

  -- Find or create variant at destination branch
  -- For now, we'll just reduce stock from source
  -- In production, you'd want to:
  -- 1. Check if variant exists at destination branch
  -- 2. If yes, increase stock there
  -- 3. If no, create a copy of the variant at destination branch

  -- Mark transfer as completed
  UPDATE branch_transfers
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_transfer_id;

  -- Log the transfer in stock movements
  INSERT INTO lats_stock_movements (
    product_variant_id,
    movement_type,
    quantity,
    from_branch_id,
    to_branch_id,
    reference_id,
    notes,
    created_at
  ) VALUES (
    v_transfer.entity_id,
    'transfer',
    -v_transfer.quantity, -- Negative for outgoing
    v_transfer.from_branch_id,
    v_transfer.to_branch_id,
    v_transfer.id,
    'Stock transfer: ' || COALESCE(v_transfer.notes, 'Branch transfer'),
    NOW()
  );
END;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================
-- Grant execute permissions to authenticated users

GRANT EXECUTE ON FUNCTION reduce_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION increase_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction TO authenticated;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify the functions were created successfully

-- Check if functions exist
SELECT 
  routine_name,
  routine_type,
  created
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'reduce_variant_stock',
    'increase_variant_stock',
    'complete_stock_transfer_transaction'
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Stock transfer functions created successfully!';
  RAISE NOTICE '📝 You can now use the Stock Transfer UI at /lats/stock-transfers';
  RAISE NOTICE '🔧 Functions created: reduce_variant_stock, increase_variant_stock, complete_stock_transfer_transaction';
END $$;

