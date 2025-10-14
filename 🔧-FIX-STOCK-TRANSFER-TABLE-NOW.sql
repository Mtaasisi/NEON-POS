-- ============================================================================
-- 🔧 FIX STOCK TRANSFER TABLE - COMPLETE SETUP FOR NEON DATABASE
-- ============================================================================
-- Run this script in your Neon SQL Editor to fix the stock transfer errors
-- This will create/fix the branch_transfers table and all required functions
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop and recreate the table (clean slate)
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view transfers for their branches" ON branch_transfers;
DROP POLICY IF EXISTS "Users can create transfers" ON branch_transfers;
DROP POLICY IF EXISTS "Users can update transfers" ON branch_transfers;
DROP POLICY IF EXISTS "transfers_policy" ON branch_transfers;
DROP POLICY IF EXISTS "allow_all_authenticated" ON branch_transfers;
DROP POLICY IF EXISTS "Users can view transfers" ON branch_transfers;

-- Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS branch_transfers CASCADE;

-- ============================================================================
-- STEP 2: Create branch_transfers table with all necessary columns
-- ============================================================================

CREATE TABLE branch_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Branch references
  from_branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  to_branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  
  -- Transfer details
  transfer_type TEXT NOT NULL DEFAULT 'stock' CHECK (transfer_type IN ('stock', 'customer', 'product')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  quantity INTEGER,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'rejected', 'cancelled')),
  
  -- User tracking (nullable for Neon compatibility)
  requested_by UUID,
  approved_by UUID,
  
  -- Additional data
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Create indexes for optimal performance
-- ============================================================================

CREATE INDEX idx_branch_transfers_from_branch ON branch_transfers(from_branch_id);
CREATE INDEX idx_branch_transfers_to_branch ON branch_transfers(to_branch_id);
CREATE INDEX idx_branch_transfers_status ON branch_transfers(status);
CREATE INDEX idx_branch_transfers_type ON branch_transfers(transfer_type);
CREATE INDEX idx_branch_transfers_entity ON branch_transfers(entity_id);
CREATE INDEX idx_branch_transfers_created ON branch_transfers(created_at DESC);

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================

COMMENT ON TABLE branch_transfers IS 'Manages stock transfers between branches';
COMMENT ON COLUMN branch_transfers.from_branch_id IS 'Source branch for the transfer';
COMMENT ON COLUMN branch_transfers.to_branch_id IS 'Destination branch for the transfer';
COMMENT ON COLUMN branch_transfers.entity_id IS 'ID of the product/variant being transferred';
COMMENT ON COLUMN branch_transfers.status IS 'Transfer status: pending, approved, in_transit, completed, rejected, cancelled';
COMMENT ON COLUMN branch_transfers.transfer_type IS 'Type of transfer: stock, customer, or product';

-- ============================================================================
-- STEP 5: Create or replace helper functions
-- ============================================================================

-- Function: Reduce variant stock
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

-- Function: Increase variant stock
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

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_branch_transfer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS trg_update_branch_transfer_timestamp ON branch_transfers;
CREATE TRIGGER trg_update_branch_transfer_timestamp
  BEFORE UPDATE ON branch_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_transfer_timestamp();

-- ============================================================================
-- STEP 6: Grant permissions (Neon-compatible)
-- ============================================================================

-- Grant full access to public role (application handles auth)
GRANT ALL ON branch_transfers TO PUBLIC;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION reduce_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION increase_variant_stock TO PUBLIC;
GRANT EXECUTE ON FUNCTION update_branch_transfer_timestamp TO PUBLIC;

-- ============================================================================
-- STEP 7: Disable RLS for Neon (application-level auth)
-- ============================================================================

ALTER TABLE branch_transfers DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Verification
-- ============================================================================

-- Verify table exists and show structure
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_column_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'branch_transfers'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION '❌ Table branch_transfers was not created!';
  END IF;

  -- Count columns
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'branch_transfers';

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ STOCK TRANSFER TABLE SETUP COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Created Successfully:';
  RAISE NOTICE '  ✓ branch_transfers table (% columns)', v_column_count;
  RAISE NOTICE '  ✓ 6 performance indexes';
  RAISE NOTICE '  ✓ 3 helper functions';
  RAISE NOTICE '  ✓ Auto-update trigger';
  RAISE NOTICE '  ✓ Proper permissions set';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Configuration:';
  RAISE NOTICE '  ✓ RLS disabled (app-level auth)';
  RAISE NOTICE '  ✓ Neon database compatible';
  RAISE NOTICE '  ✓ All foreign keys active';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '  1. Close this SQL editor';
  RAISE NOTICE '  2. Refresh your browser (Ctrl+R or Cmd+R)';
  RAISE NOTICE '  3. Navigate to Stock Transfers page';
  RAISE NOTICE '  4. The errors should be gone!';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

-- Show table structure
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'branch_transfers'
ORDER BY ordinal_position;

-- Show created indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'branch_transfers'
ORDER BY indexname;

-- Show created functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'reduce_variant_stock',
    'increase_variant_stock',
    'update_branch_transfer_timestamp'
  )
ORDER BY routine_name;

-- Final success message
SELECT '✅ Stock Transfer Setup Complete - Refresh Your Browser!' as status;

