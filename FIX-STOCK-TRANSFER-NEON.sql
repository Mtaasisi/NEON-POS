-- ============================================================================
-- STOCK TRANSFER SETUP FOR NEON DATABASE
-- ============================================================================
-- This version works with Neon (no Supabase auth functions)

-- Drop any existing policies that might cause issues
DROP POLICY IF EXISTS "transfers_policy" ON branch_transfers;
DROP POLICY IF EXISTS "allow_all_authenticated" ON branch_transfers;
DROP POLICY IF EXISTS "Users can view transfers" ON branch_transfers;
DROP POLICY IF EXISTS "Users can create transfers" ON branch_transfers;
DROP POLICY IF EXISTS "Users can update transfers" ON branch_transfers;

-- Disable RLS for now (simpler for Neon)
ALTER TABLE branch_transfers DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to public role (since you're using application-level auth)
GRANT SELECT, INSERT, UPDATE, DELETE ON branch_transfers TO PUBLIC;

-- Verify table structure
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'branch_transfers'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Stock Transfer table configured for Neon!' as status;
SELECT '🚀 Refresh your browser and try again' as next_step;

