-- ============================================================================
-- CHECK AND FIX RLS POLICIES FOR DEVICES TABLE
-- This ensures users can insert/update devices
-- ============================================================================

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'devices';

-- Show existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'devices';

-- ============================================================================
-- FIX: Enable RLS and create proper policies
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON devices;
DROP POLICY IF EXISTS "Users can insert devices" ON devices;
DROP POLICY IF EXISTS "Users can view devices" ON devices;
DROP POLICY IF EXISTS "Users can update devices" ON devices;
DROP POLICY IF EXISTS "Users can delete devices" ON devices;

-- Create a simple policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" 
ON devices 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- If you need to allow anonymous access (for testing), uncomment:
-- CREATE POLICY "Allow all operations for anon users" 
-- ON devices 
-- FOR ALL 
-- TO anon 
-- USING (true) 
-- WITH CHECK (true);

-- ============================================================================
-- VERIFY THE FIX
-- ============================================================================
SELECT 'RLS policies fixed!' AS status;

-- Show the new policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'devices';

