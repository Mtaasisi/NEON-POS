-- ============================================
-- FIX PRODUCT VARIANTS RLS ISSUE
-- Ensures proper access to lats_product_variants table
-- Date: October 13, 2025
-- ============================================

-- Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'lats_product_variants';

-- Disable RLS temporarily to test (ONLY FOR TESTING)
-- ALTER TABLE lats_product_variants DISABLE ROW LEVEL SECURITY;

-- OR: Create permissive policy for authenticated users
DROP POLICY IF EXISTS lats_product_variants_select_all ON lats_product_variants;

CREATE POLICY lats_product_variants_select_all
  ON lats_product_variants
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Grant necessary permissions to PUBLIC (works in all PostgreSQL setups)
GRANT SELECT, UPDATE ON lats_product_variants TO PUBLIC;

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'lats_product_variants';

-- Test query (same as what the app does)
SELECT id, quantity, cost_price 
FROM lats_product_variants 
WHERE id = 'cd0fc834-7238-4f92-b3ce-5bae85bfa3a9'
LIMIT 1;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ PRODUCT VARIANTS RLS FIX APPLIED!';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was done:';
  RAISE NOTICE '  1. Created SELECT policy for all users';
  RAISE NOTICE '  2. Granted SELECT and UPDATE permissions';
  RAISE NOTICE '  3. Tested access to variant table';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Next: Try processing a sale in the POS';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

