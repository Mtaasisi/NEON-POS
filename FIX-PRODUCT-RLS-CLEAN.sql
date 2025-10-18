-- ============================================
-- CLEAN FIX FOR PRODUCT CREATION RLS
-- ============================================

-- 1. FIX LATS_PRODUCTS TABLE
-- ============================================

DROP POLICY IF EXISTS lats_products_select_policy ON lats_products;
DROP POLICY IF EXISTS lats_products_read_all ON lats_products;
DROP POLICY IF EXISTS lats_products_insert_policy ON lats_products;
DROP POLICY IF EXISTS lats_products_update_policy ON lats_products;
DROP POLICY IF EXISTS lats_products_delete_policy ON lats_products;
DROP POLICY IF EXISTS "Users can view products" ON lats_products;
DROP POLICY IF EXISTS "Users can create products" ON lats_products;
DROP POLICY IF EXISTS "Users can update products" ON lats_products;
DROP POLICY IF EXISTS "Users can delete products" ON lats_products;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON lats_products;
DROP POLICY IF EXISTS "products_select_all" ON lats_products;
DROP POLICY IF EXISTS "products_insert_all" ON lats_products;
DROP POLICY IF EXISTS "products_update_all" ON lats_products;
DROP POLICY IF EXISTS "products_delete_all" ON lats_products;

CREATE POLICY "products_select_all" 
  ON lats_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_insert_all" 
  ON lats_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "products_update_all" 
  ON lats_products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_delete_all" 
  ON lats_products
  FOR DELETE
  TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON lats_products TO authenticated;

-- 2. FIX PRODUCT_IMAGES TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON product_images;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_images;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON product_images;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON product_images;
DROP POLICY IF EXISTS "product_images_select_all" ON product_images;
DROP POLICY IF EXISTS "product_images_insert_all" ON product_images;
DROP POLICY IF EXISTS "product_images_update_all" ON product_images;
DROP POLICY IF EXISTS "product_images_delete_all" ON product_images;

CREATE POLICY "product_images_select_all" 
  ON product_images
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "product_images_insert_all" 
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "product_images_update_all" 
  ON product_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "product_images_delete_all" 
  ON product_images
  FOR DELETE
  TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON product_images TO authenticated;

-- 3. FIX LATS_PRODUCT_VARIANTS TABLE
-- ============================================

DROP POLICY IF EXISTS lats_product_variants_select_all ON lats_product_variants;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_product_variants;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_product_variants;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_product_variants;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON lats_product_variants;
DROP POLICY IF EXISTS "variants_select_all" ON lats_product_variants;
DROP POLICY IF EXISTS "variants_insert_all" ON lats_product_variants;
DROP POLICY IF EXISTS "variants_update_all" ON lats_product_variants;
DROP POLICY IF EXISTS "variants_delete_all" ON lats_product_variants;

CREATE POLICY "variants_select_all" 
  ON lats_product_variants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "variants_insert_all" 
  ON lats_product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "variants_update_all" 
  ON lats_product_variants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "variants_delete_all" 
  ON lats_product_variants
  FOR DELETE
  TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON lats_product_variants TO authenticated;

-- VERIFY
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('lats_products', 'product_images', 'lats_product_variants')
ORDER BY tablename, cmd;

