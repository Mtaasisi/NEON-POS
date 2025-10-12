-- ============================================
-- COMPLETE FIX FOR PRODUCT PAGES
-- Ensures all database schema is properly configured
-- for Add Product and Edit Product pages
-- ============================================
-- 
-- IMPORTANT: If you get "transaction is aborted" error:
-- Run this first: ROLLBACK;
-- Then run this script again.
-- ============================================
-- 
-- DEBUG MODE: This script includes detailed debugging info
-- to help you understand exactly what's happening at each step
-- ============================================

-- First, ensure we're not in a failed transaction state
ROLLBACK;

SELECT '╔══════════════════════════════════════════════════════════════════════════╗' as banner;
SELECT '║              PRODUCT PAGES FIX - DETAILED DEBUG MODE                     ║' as banner;
SELECT '╚══════════════════════════════════════════════════════════════════════════╝' as banner;
SELECT '' as empty;

-- Show database information
SELECT '📊 DATABASE INFORMATION:' as info;
SELECT current_database() as "Current Database";
SELECT current_user as "Current User/Role";
SELECT version() as "PostgreSQL Version";
SELECT NOW() as "Migration Start Time";
SELECT '' as empty;

-- Now start fresh transaction
BEGIN;

SELECT '🔄 Transaction started...' as status;
SELECT '' as empty;

SELECT '========== STEP 1: ENSURE PRODUCTS TABLE HAS ALL REQUIRED COLUMNS ==========' as status;
SELECT '📝 Checking and adding missing columns to lats_products table...' as info;

-- Create or update lats_products table with all required columns
DO $$
DECLARE
  column_count INTEGER;
  error_detail TEXT;
BEGIN
  -- First, verify the table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_products') THEN
    RAISE EXCEPTION '❌ ERROR: lats_products table does not exist! Please create it first.';
  END IF;

  RAISE NOTICE '📊 DEBUG: Starting column checks for lats_products table...';
  
  -- Count existing columns
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'lats_products';
  
  RAISE NOTICE '📊 DEBUG: lats_products currently has % columns', column_count;
  
  -- Core product information columns
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'specification') THEN
      RAISE NOTICE '🔧 DEBUG: Adding specification column...';
      ALTER TABLE lats_products ADD COLUMN specification TEXT;
      RAISE NOTICE '✅ SUCCESS: Added specification column';
    ELSE
      RAISE NOTICE '⏭️  SKIP: specification column already exists';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_detail = PG_EXCEPTION_DETAIL;
    RAISE WARNING '⚠️  ERROR adding specification column: % (Detail: %)', SQLERRM, error_detail;
  END;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'condition') THEN
    ALTER TABLE lats_products ADD COLUMN condition TEXT DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished'));
    RAISE NOTICE '✅ Added condition column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'selling_price') THEN
    ALTER TABLE lats_products ADD COLUMN selling_price DECIMAL(12, 2) DEFAULT 0;
    RAISE NOTICE '✅ Added selling_price column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'tags') THEN
    ALTER TABLE lats_products ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Added tags column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'total_quantity') THEN
    ALTER TABLE lats_products ADD COLUMN total_quantity INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added total_quantity column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'total_value') THEN
    ALTER TABLE lats_products ADD COLUMN total_value DECIMAL(12, 2) DEFAULT 0;
    RAISE NOTICE '✅ Added total_value column';
  END IF;

  -- Storage location columns (without foreign keys if tables don't exist)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'storage_room_id') THEN
    -- Check if lats_store_rooms table exists before adding foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_store_rooms') THEN
      ALTER TABLE lats_products ADD COLUMN storage_room_id UUID REFERENCES lats_store_rooms(id) ON DELETE SET NULL;
      RAISE NOTICE '✅ Added storage_room_id column with foreign key';
    ELSE
      ALTER TABLE lats_products ADD COLUMN storage_room_id UUID;
      RAISE NOTICE '✅ Added storage_room_id column (without foreign key - table does not exist)';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'store_shelf_id') THEN
    -- Check if lats_store_shelves table exists before adding foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_store_shelves') THEN
      ALTER TABLE lats_products ADD COLUMN store_shelf_id UUID REFERENCES lats_store_shelves(id) ON DELETE SET NULL;
      RAISE NOTICE '✅ Added store_shelf_id column with foreign key';
    ELSE
      ALTER TABLE lats_products ADD COLUMN store_shelf_id UUID;
      RAISE NOTICE '✅ Added store_shelf_id column (without foreign key - table does not exist)';
    END IF;
  END IF;

  -- Ensure images column exists as JSONB
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'images') THEN
    ALTER TABLE lats_products ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Added images column';
  END IF;

  -- Ensure attributes column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'attributes') THEN
    ALTER TABLE lats_products ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Added attributes column';
  END IF;

  -- Ensure metadata column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'metadata') THEN
    ALTER TABLE lats_products ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Added metadata column';
  END IF;

  RAISE NOTICE '✅ All product columns verified/created';
END $$;

SELECT '========== STEP 2: ENSURE PRODUCT_IMAGES TABLE EXISTS ==========' as status;

-- Create product_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES lats_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for product_images
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);

COMMENT ON TABLE product_images IS 'Stores individual product images with metadata';
COMMENT ON COLUMN product_images.is_primary IS 'Indicates if this is the primary image for the product';

SELECT '========== STEP 3: ENSURE PRODUCT VARIANTS TABLE HAS ALL COLUMNS ==========' as status;

-- Ensure product variants table has all required columns
DO $$
BEGIN
  -- Ensure all columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_product_variants' AND column_name = 'name') THEN
    ALTER TABLE lats_product_variants ADD COLUMN name TEXT NOT NULL DEFAULT 'Default Variant';
    RAISE NOTICE '✅ Added name column to variants';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_product_variants' AND column_name = 'cost_price') THEN
    ALTER TABLE lats_product_variants ADD COLUMN cost_price DECIMAL(12, 2) DEFAULT 0;
    RAISE NOTICE '✅ Added cost_price column to variants';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_product_variants' AND column_name = 'selling_price') THEN
    ALTER TABLE lats_product_variants ADD COLUMN selling_price DECIMAL(12, 2) DEFAULT 0;
    RAISE NOTICE '✅ Added selling_price column to variants';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_product_variants' AND column_name = 'quantity') THEN
    ALTER TABLE lats_product_variants ADD COLUMN quantity INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added quantity column to variants';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_product_variants' AND column_name = 'min_quantity') THEN
    ALTER TABLE lats_product_variants ADD COLUMN min_quantity INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added min_quantity column to variants';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_product_variants' AND column_name = 'attributes') THEN
    ALTER TABLE lats_product_variants ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Added attributes column to variants';
  END IF;

  RAISE NOTICE '✅ All variant columns verified/created';
END $$;

SELECT '========== STEP 4: CREATE HELPER FUNCTIONS ==========' as status;

-- Function to automatically update product total_quantity and total_value when variants change
CREATE OR REPLACE FUNCTION update_product_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent product's total_quantity and total_value
  UPDATE lats_products
  SET 
    total_quantity = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM lats_product_variants
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    total_value = (
      SELECT COALESCE(SUM(quantity * selling_price), 0)
      FROM lats_product_variants
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_product_totals ON lats_product_variants;

-- Create trigger to auto-update product totals
CREATE TRIGGER trigger_update_product_totals
  AFTER INSERT OR UPDATE OR DELETE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_totals();

COMMENT ON FUNCTION update_product_totals() IS 'Automatically updates product total_quantity and total_value when variants change';

SELECT '========== STEP 5: ENABLE RLS AND CREATE POLICIES ==========' as status;

-- Enable RLS on lats_products if not already enabled
ALTER TABLE lats_products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view products" ON lats_products;
DROP POLICY IF EXISTS "Users can insert products" ON lats_products;
DROP POLICY IF EXISTS "Users can update products" ON lats_products;
DROP POLICY IF EXISTS "Users can delete products" ON lats_products;

-- Create permissive policies (adjust based on your auth requirements)
CREATE POLICY "Users can view products" 
  ON lats_products FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert products" 
  ON lats_products FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update products" 
  ON lats_products FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete products" 
  ON lats_products FOR DELETE 
  USING (true);

-- Enable RLS on product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view product images" ON product_images;
DROP POLICY IF EXISTS "Users can insert product images" ON product_images;
DROP POLICY IF EXISTS "Users can update product images" ON product_images;
DROP POLICY IF EXISTS "Users can delete product images" ON product_images;

-- Create policies for product_images
CREATE POLICY "Users can view product images" 
  ON product_images FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert product images" 
  ON product_images FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update product images" 
  ON product_images FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete product images" 
  ON product_images FOR DELETE 
  USING (true);

SELECT '========== STEP 6: CREATE INDEXES FOR PERFORMANCE ==========' as status;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lats_products_name ON lats_products(name);
CREATE INDEX IF NOT EXISTS idx_lats_products_sku ON lats_products(sku);
CREATE INDEX IF NOT EXISTS idx_lats_products_category_id ON lats_products(category_id);
CREATE INDEX IF NOT EXISTS idx_lats_products_condition ON lats_products(condition);
CREATE INDEX IF NOT EXISTS idx_lats_products_storage_room_id ON lats_products(storage_room_id);
CREATE INDEX IF NOT EXISTS idx_lats_products_store_shelf_id ON lats_products(store_shelf_id);

-- GIN indexes for JSONB columns for better search performance
CREATE INDEX IF NOT EXISTS idx_lats_products_images_gin ON lats_products USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_lats_products_attributes_gin ON lats_products USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_lats_products_metadata_gin ON lats_products USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_lats_products_tags_gin ON lats_products USING GIN (tags);

SELECT '========== STEP 7: GRANT PERMISSIONS ==========' as status;

-- Grant permissions on all tables (Neon-compatible)
-- Only grant to roles that exist
DO $$
BEGIN
  -- Grant to authenticated role (Supabase/Neon standard)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
    RAISE NOTICE '✅ Granted permissions to authenticated role';
  END IF;

  -- Grant to anon role (Supabase/Neon standard)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
    RAISE NOTICE '✅ Granted permissions to anon role';
  END IF;

  -- Grant to service_role if it exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
    RAISE NOTICE '✅ Granted permissions to service_role';
  END IF;

  -- Grant to postgres role only if it exists (not in Neon)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
    RAISE NOTICE '✅ Granted permissions to postgres role';
  END IF;

  -- Grant to neondb_owner if it exists (Neon specific)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO neondb_owner;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO neondb_owner;
    RAISE NOTICE '✅ Granted permissions to neondb_owner role';
  END IF;
END $$;

SELECT '========== VERIFICATION ==========' as status;

-- Verify the setup
DO $$
DECLARE
  col_count INTEGER;
  idx_count INTEGER;
BEGIN
  -- Count columns in lats_products
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'lats_products';
  
  RAISE NOTICE '✅ lats_products has % columns', col_count;
  
  -- Count indexes on lats_products
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'lats_products';
  
  RAISE NOTICE '✅ lats_products has % indexes', idx_count;
  
  -- Check if product_images table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images') THEN
    RAISE NOTICE '✅ product_images table exists';
  ELSE
    RAISE NOTICE '❌ product_images table missing';
  END IF;
  
  -- Check if helper function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_product_totals') THEN
    RAISE NOTICE '✅ update_product_totals function exists';
  ELSE
    RAISE NOTICE '❌ update_product_totals function missing';
  END IF;
END $$;

-- Commit the transaction
COMMIT;

SELECT '🎉 PRODUCT PAGES FIX COMPLETE!' as summary;
SELECT '✅ Database schema is now properly configured' as result_1;
SELECT '✅ All required columns exist' as result_2;
SELECT '✅ Indexes created for performance' as result_3;
SELECT '✅ RLS policies configured' as result_4;
SELECT '✅ Helper functions created' as result_5;
SELECT '' as empty;
SELECT '💡 Next Steps:' as next_steps;
SELECT '1. Refresh your application' as step_1;
SELECT '2. Test adding a new product' as step_2;
SELECT '3. Test editing an existing product' as step_3;
SELECT '4. Test uploading images' as step_4;
SELECT '5. Test creating product variants' as step_5;

-- If you see this message, the migration was successful!
-- If you got errors, check the Neon Console output for details.

