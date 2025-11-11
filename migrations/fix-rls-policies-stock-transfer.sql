-- ============================================================================
-- Stock Transfer System - RLS Policies Fix
-- ============================================================================
-- This migration fixes Row Level Security policies that may be blocking
-- stock transfer queries. Run this if transfers aren't showing up.
-- ============================================================================

-- Enable RLS on branch_transfers table
ALTER TABLE branch_transfers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "branch_transfers_select_policy" ON branch_transfers;
DROP POLICY IF EXISTS "branch_transfers_insert_policy" ON branch_transfers;
DROP POLICY IF EXISTS "branch_transfers_update_policy" ON branch_transfers;
DROP POLICY IF EXISTS "branch_transfers_delete_policy" ON branch_transfers;

-- ============================================================================
-- SELECT Policy - Users can view all transfers
-- ============================================================================
CREATE POLICY "branch_transfers_select_policy"
ON branch_transfers
FOR SELECT
USING (
  -- Allow viewing all transfers (can be restricted based on your needs)
  true
  
  -- Alternative: Restrict to transfers involving user's branches
  -- auth.uid() IN (
  --   SELECT user_id FROM store_locations 
  --   WHERE id = branch_transfers.from_branch_id 
  --      OR id = branch_transfers.to_branch_id
  -- )
);

-- ============================================================================
-- INSERT Policy - Users can create transfers
-- ============================================================================
CREATE POLICY "branch_transfers_insert_policy"
ON branch_transfers
FOR INSERT
WITH CHECK (
  -- Allow creating transfers (add your own validation if needed)
  true
  
  -- Alternative: Only allow if user has access to from_branch
  -- auth.uid() IN (
  --   SELECT user_id FROM store_locations WHERE id = from_branch_id
  -- )
);

-- ============================================================================
-- UPDATE Policy - Users can update transfers
-- ============================================================================
CREATE POLICY "branch_transfers_update_policy"
ON branch_transfers
FOR UPDATE
USING (
  -- Allow updating any transfer (add restrictions as needed)
  true
  
  -- Alternative: Only allow updating if user has access to either branch
  -- auth.uid() IN (
  --   SELECT user_id FROM store_locations 
  --   WHERE id = branch_transfers.from_branch_id 
  --      OR id = branch_transfers.to_branch_id
  -- )
)
WITH CHECK (
  -- Same restrictions for the updated values
  true
);

-- ============================================================================
-- DELETE Policy - Users can delete/cancel transfers
-- ============================================================================
CREATE POLICY "branch_transfers_delete_policy"
ON branch_transfers
FOR DELETE
USING (
  -- Allow deleting transfers (typically only pending ones)
  status IN ('pending', 'rejected', 'cancelled')
  
  -- Alternative: Add user restrictions
  -- AND auth.uid() IN (
  --   SELECT user_id FROM store_locations WHERE id = from_branch_id
  -- )
);

-- ============================================================================
-- Verify Policies
-- ============================================================================
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'branch_transfers';

  RAISE NOTICE '✅ RLS Policies Installed: %', v_policy_count;

  IF v_policy_count >= 4 THEN
    RAISE NOTICE '🎉 All RLS policies are configured!';
  ELSE
    RAISE WARNING '⚠️  Expected at least 4 policies, found %. Check for errors above.', v_policy_count;
  END IF;
END;
$$;

-- ============================================================================
-- Optional: Grant table permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON branch_transfers TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

