-- ============================================
-- FIX ALL PRODUCT-RELATED TABLES RLS POLICIES
-- Ensures proper access to product_images and lats_product_variants
-- Date: October 14, 2025
-- ============================================

-- ============================================
-- PRODUCT_IMAGES TABLE
-- ============================================

-- Check current RLS status
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'product_images';

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON product_images;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_images;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON product_images;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON product_images;

-- Create new permissive policies
CREATE POLICY "Enable read for authenticated users" 
  ON product_images
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" 
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
  ON product_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" 
  ON product_images
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON product_images TO authenticated;

RAISE NOTICE '✅ product_images RLS policies updated';

-- ============================================
-- LATS_PRODUCT_VARIANTS TABLE
-- ============================================

-- Check current RLS status
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'lats_product_variants';

-- Drop existing policies
DROP POLICY IF EXISTS lats_product_variants_select_all ON lats_product_variants;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_product_variants;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_product_variants;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_product_variants;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON lats_product_variants;

-- Create new permissive policies
CREATE POLICY "Enable read for authenticated users" 
  ON lats_product_variants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" 
  ON lats_product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
  ON lats_product_variants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" 
  ON lats_product_variants
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lats_product_variants TO authenticated;

RAISE NOTICE '✅ lats_product_variants RLS policies updated';

-- ============================================
-- VERIFICATION
-- ============================================

-- Show all policies for these tables
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('product_images', 'lats_product_variants')
ORDER BY tablename, cmd;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ PRODUCT-RELATED TABLES RLS FIXED!';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables updated:';
  RAISE NOTICE '  1. product_images';
  RAISE NOTICE '  2. lats_product_variants';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 All tables now have permissive policies';
  RAISE NOTICE '   for authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

