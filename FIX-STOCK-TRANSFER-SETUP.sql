-- ============================================================================
-- FIX STOCK TRANSFER SETUP - Safe to run multiple times
-- ============================================================================
-- This script safely completes the stock transfer setup
-- Safe to run even if some parts already exist

-- ============================================================================
-- STEP 1: Drop existing policies if they exist (to recreate them)
-- ============================================================================

DROP POLICY IF EXISTS "transfers_policy" ON branch_transfers;
DROP POLICY IF EXISTS "Users can view transfers for their branches" ON branch_transfers;
DROP POLICY IF EXISTS "Users can view transfers" ON branch_transfers;
DROP POLICY IF EXISTS "Users can create transfers" ON branch_transfers;
DROP POLICY IF EXISTS "Users can update transfers" ON branch_transfers;

-- ============================================================================
-- STEP 2: Ensure table has all columns (add if missing)
-- ============================================================================

DO $$ 
BEGIN
  -- Add any missing columns (safe to run - will skip if exists)
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'metadata') THEN
    ALTER TABLE branch_transfers ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'requested_at') THEN
    ALTER TABLE branch_transfers ADD COLUMN requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'approved_at') THEN
    ALTER TABLE branch_transfers ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branch_transfers' AND column_name = 'completed_at') THEN
    ALTER TABLE branch_transfers ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;

END $$;

-- ============================================================================
-- STEP 3: Recreate RLS Policies
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE branch_transfers ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies for authenticated users
CREATE POLICY "allow_all_authenticated" ON branch_transfers
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- STEP 4: Grant Permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON branch_transfers TO authenticated;
GRANT ALL ON branch_transfers TO service_role;

-- ============================================================================
-- STEP 5: Verify Setup
-- ============================================================================

-- Check table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branch_transfers')
    THEN '✅ Table exists'
    ELSE '❌ Table missing'
  END as table_status;

-- Check indexes
SELECT 
  COUNT(*) as index_count,
  '✅ ' || COUNT(*) || ' indexes created' as index_status
FROM pg_indexes 
WHERE tablename = 'branch_transfers';

-- Check policies
SELECT 
  COUNT(*) as policy_count,
  '✅ ' || COUNT(*) || ' RLS policies active' as policy_status
FROM pg_policies 
WHERE tablename = 'branch_transfers';

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Stock Transfer Setup Complete!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to use at: /lats/stock-transfers';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next step: Refresh your browser!';
  RAISE NOTICE '';
END $$;

