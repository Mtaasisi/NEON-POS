-- ============================================
-- FIX RLS POLICIES FOR SESSION & CLOSURE TABLES
-- ============================================
-- This migration fixes the RLS policies that were using incorrect column names
-- - daily_opening_sessions uses 'opened_by_user_id' not 'user_id'
-- - daily_sales_closures uses 'closed_by_user_id' not 'user_id'
-- These are system-wide tables, so we allow all authenticated users to access them
-- ============================================

-- Drop any existing incorrect RLS policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON daily_opening_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON daily_opening_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON daily_opening_sessions;

-- Disable RLS temporarily to ensure clean slate
ALTER TABLE daily_opening_sessions DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE daily_opening_sessions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that allow all authenticated users to access sessions
-- This is appropriate since daily opening sessions are system-wide, not user-specific

-- Allow all authenticated users to view all sessions
CREATE POLICY "Authenticated users can view all sessions" 
ON daily_opening_sessions
FOR SELECT 
TO authenticated
USING (true);

-- Allow all authenticated users to insert sessions
CREATE POLICY "Authenticated users can create sessions" 
ON daily_opening_sessions
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update sessions
CREATE POLICY "Authenticated users can update sessions" 
ON daily_opening_sessions
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow all authenticated users to delete sessions (if needed for cleanup)
CREATE POLICY "Authenticated users can delete sessions" 
ON daily_opening_sessions
FOR DELETE 
TO authenticated
USING (true);

-- Add comment explaining the policy approach
COMMENT ON TABLE daily_opening_sessions IS 
  'Tracks daily opening sessions for the POS system. ' ||
  'RLS policies allow all authenticated users to access since sessions are system-wide, not user-specific. ' ||
  'The opened_by_user_id column tracks who created each session for audit purposes.';

-- ============================================
-- FIX DAILY_SALES_CLOSURES TABLE
-- ============================================

-- Drop any existing incorrect RLS policies
DROP POLICY IF EXISTS "Users can view their own closures" ON daily_sales_closures;
DROP POLICY IF EXISTS "Users can insert their own closures" ON daily_sales_closures;
DROP POLICY IF EXISTS "Users can update their own closures" ON daily_sales_closures;

-- Disable RLS temporarily
ALTER TABLE daily_sales_closures DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE daily_sales_closures ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all authenticated users

-- Allow all authenticated users to view all closures
CREATE POLICY "Authenticated users can view all closures" 
ON daily_sales_closures
FOR SELECT 
TO authenticated
USING (true);

-- Allow all authenticated users to insert closures
CREATE POLICY "Authenticated users can create closures" 
ON daily_sales_closures
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update closures
CREATE POLICY "Authenticated users can update closures" 
ON daily_sales_closures
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow all authenticated users to delete closures (if needed)
CREATE POLICY "Authenticated users can delete closures" 
ON daily_sales_closures
FOR DELETE 
TO authenticated
USING (true);

-- Add comment
COMMENT ON TABLE daily_sales_closures IS 
  'Tracks daily sales closures for the POS system. ' ||
  'RLS policies allow all authenticated users to access since closures are system-wide. ' ||
  'The closed_by_user_id column tracks who closed each day for audit purposes.';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify policies for daily_opening_sessions
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'daily_opening_sessions'
ORDER BY policyname;

-- Verify policies for daily_sales_closures
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'daily_sales_closures'
ORDER BY policyname;

-- Test access
SELECT COUNT(*) as session_count FROM daily_opening_sessions;
SELECT COUNT(*) as closure_count FROM daily_sales_closures;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed for daily_opening_sessions and daily_sales_closures tables';
  RAISE NOTICE '✅ All authenticated users can now access these system-wide tables';
END $$;

