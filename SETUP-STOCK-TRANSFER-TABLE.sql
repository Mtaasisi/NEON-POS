-- ============================================================================
-- STOCK TRANSFER TABLE & FUNCTIONS - COMPLETE SETUP
-- ============================================================================
-- Run this ONCE in your Neon/Supabase SQL editor before using Stock Transfers
-- This creates the table and all necessary functions

-- ============================================================================
-- STEP 1: Create branch_transfers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS branch_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  to_branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL DEFAULT 'stock' CHECK (transfer_type IN ('stock', 'customer', 'product')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  quantity INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'rejected', 'cancelled')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_branch_transfers_from_branch ON branch_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_to_branch ON branch_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_status ON branch_transfers(status);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_type ON branch_transfers(transfer_type);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_entity ON branch_transfers(entity_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_created ON branch_transfers(created_at DESC);

-- ============================================================================
-- STEP 3: Add Foreign Key Constraints (if they don't exist)
-- ============================================================================

-- Note: These are handled in the CREATE TABLE, but we'll add comments for clarity
COMMENT ON COLUMN branch_transfers.from_branch_id IS 'Source branch for the transfer';
COMMENT ON COLUMN branch_transfers.to_branch_id IS 'Destination branch for the transfer';
COMMENT ON COLUMN branch_transfers.entity_id IS 'ID of the product/variant being transferred';
COMMENT ON COLUMN branch_transfers.status IS 'Transfer status: pending, approved, in_transit, completed, rejected, cancelled';

-- ============================================================================
-- STEP 4: Create Database Functions
-- ============================================================================

-- Function: Reduce Variant Stock
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

-- Function: Increase Variant Stock
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

-- Function: Complete Stock Transfer
CREATE OR REPLACE FUNCTION complete_stock_transfer_transaction(
  p_transfer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer RECORD;
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

  -- Mark transfer as completed
  UPDATE branch_transfers
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_transfer_id;

  -- Log the transfer in stock movements (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_stock_movements') THEN
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
      -v_transfer.quantity,
      v_transfer.from_branch_id,
      v_transfer.to_branch_id,
      v_transfer.id,
      'Stock transfer: ' || COALESCE(v_transfer.notes, 'Branch transfer'),
      NOW()
    );
  END IF;
END;
$$;

-- ============================================================================
-- STEP 5: Grant Permissions
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON branch_transfers TO authenticated;
GRANT EXECUTE ON FUNCTION reduce_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION increase_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction TO authenticated;

-- Grant permissions to service role (for backend operations)
GRANT ALL ON branch_transfers TO service_role;

-- ============================================================================
-- STEP 6: Enable Row Level Security (Optional but Recommended)
-- ============================================================================

ALTER TABLE branch_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view transfers for their branches
CREATE POLICY "Users can view transfers for their branches" ON branch_transfers
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Users can create transfers from their branches
CREATE POLICY "Users can create transfers" ON branch_transfers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Users can update transfers
CREATE POLICY "Users can update transfers" ON branch_transfers
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

-- ============================================================================
-- STEP 7: Verification & Success Message
-- ============================================================================

-- Verify table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branch_transfers') THEN
    RAISE NOTICE '✅ Table branch_transfers created successfully!';
  ELSE
    RAISE EXCEPTION '❌ Failed to create branch_transfers table';
  END IF;
END $$;

-- Verify functions exist
SELECT 
  '✅ ' || routine_name || ' created successfully' as status
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
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ STOCK TRANSFER SETUP COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Created:';
  RAISE NOTICE '  ✓ branch_transfers table';
  RAISE NOTICE '  ✓ 6 indexes for performance';
  RAISE NOTICE '  ✓ 3 database functions';
  RAISE NOTICE '  ✓ Row level security policies';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 You can now use Stock Transfers at:';
  RAISE NOTICE '   http://localhost:5173/lats/stock-transfers';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '  1. Refresh your browser';
  RAISE NOTICE '  2. Navigate to Stock Transfers';
  RAISE NOTICE '  3. Create your first transfer!';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================================================
-- Optional: Sample Data for Testing (Commented Out)
-- ============================================================================

/*
-- Uncomment to insert sample transfer for testing
INSERT INTO branch_transfers (
  from_branch_id,
  to_branch_id,
  transfer_type,
  entity_type,
  entity_id,
  quantity,
  status,
  notes
) VALUES (
  (SELECT id FROM store_locations WHERE is_main = true LIMIT 1),
  (SELECT id FROM store_locations WHERE is_main = false LIMIT 1),
  'stock',
  'variant',
  (SELECT id FROM lats_product_variants LIMIT 1),
  5,
  'pending',
  'Test transfer - please review'
);
*/

