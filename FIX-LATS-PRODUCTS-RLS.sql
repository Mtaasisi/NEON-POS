-- ============================================
-- FIX LATS_PRODUCTS RLS POLICIES
-- Ensures proper INSERT and SELECT access
-- Date: October 14, 2025
-- ============================================

-- Check current RLS status
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'lats_products';

-- Check existing policies
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
WHERE tablename = 'lats_products'
ORDER BY cmd;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS lats_products_select_policy ON lats_products;
DROP POLICY IF EXISTS lats_products_read_all ON lats_products;
DROP POLICY IF EXISTS lats_products_insert_policy ON lats_products;
DROP POLICY IF EXISTS lats_products_update_policy ON lats_products;
DROP POLICY IF EXISTS lats_products_delete_policy ON lats_products;
DROP POLICY IF EXISTS "Users can view products" ON lats_products;
DROP POLICY IF EXISTS "Users can create products" ON lats_products;
DROP POLICY IF EXISTS "Users can update products" ON lats_products;
DROP POLICY IF EXISTS "Users can delete products" ON lats_products;

-- Create new permissive policies for authenticated users
CREATE POLICY "Enable read for authenticated users" 
  ON lats_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" 
  ON lats_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
  ON lats_products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" 
  ON lats_products
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lats_products TO authenticated;

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'lats_products'
ORDER BY cmd;

-- Test INSERT and SELECT
DO $$
DECLARE
  test_product_id UUID;
  test_product_name TEXT;
BEGIN
  -- Try to insert a test product
  INSERT INTO lats_products (name, sku, is_active)
  VALUES ('Test Product RLS Fix', 'TEST-RLS-' || EXTRACT(EPOCH FROM NOW())::TEXT, true)
  RETURNING id, name INTO test_product_id, test_product_name;
  
  RAISE NOTICE '✅ INSERT successful: Product ID = %, Name = %', test_product_id, test_product_name;
  
  -- Try to select it back
  SELECT name INTO test_product_name 
  FROM lats_products 
  WHERE id = test_product_id;
  
  IF FOUND THEN
    RAISE NOTICE '✅ SELECT successful: Found product "%"', test_product_name;
  ELSE
    RAISE WARNING '❌ SELECT failed: Could not find inserted product';
  END IF;
  
  -- Clean up test data
  DELETE FROM lats_products WHERE id = test_product_id;
  RAISE NOTICE '🧹 Test product deleted';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Test failed: %', SQLERRM;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ LATS_PRODUCTS RLS FIX APPLIED!';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was done:';
  RAISE NOTICE '  1. Dropped old conflicting policies';
  RAISE NOTICE '  2. Created SELECT policy for authenticated users';
  RAISE NOTICE '  3. Created INSERT policy for authenticated users';
  RAISE NOTICE '  4. Created UPDATE policy for authenticated users';
  RAISE NOTICE '  5. Created DELETE policy for authenticated users';
  RAISE NOTICE '  6. Granted necessary permissions';
  RAISE NOTICE '  7. Tested INSERT and SELECT operations';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Next: Try creating a product in the app';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

