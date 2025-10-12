-- =====================================================
-- CREATE PRODUCT IMAGES STORAGE BUCKET
-- =====================================================
-- This script creates the storage bucket needed for product image uploads
-- Run this in your Neon/Supabase SQL Editor

-- Step 1: Create the storage bucket (if using Supabase)
-- Note: This needs to be done via Supabase Dashboard Storage section
-- OR via the Supabase CLI/API

-- For Supabase Dashboard:
-- 1. Go to Storage section
-- 2. Click "Create bucket"
-- 3. Name: product-images
-- 4. Set as Public
-- 5. Allow file types: image/jpeg, image/jpg, image/png, image/webp
-- 6. Max file size: 5MB

-- Step 2: Ensure the product_images table exists
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES lats_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  uploaded_by UUID,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON product_images(created_at DESC);

-- Step 4: Disable RLS (for Neon which doesn't use Supabase auth)
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- Step 5: Grant all permissions
GRANT ALL ON product_images TO postgres, anon, authenticated, service_role;

-- Step 6: Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the table
SELECT 
  'product_images table' AS status,
  COUNT(*) AS existing_images
FROM product_images;

-- Check for products without images
SELECT 
  'Products without images' AS status,
  COUNT(*) AS count
FROM lats_products p
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE pi.id IS NULL;

SELECT '✅ Product images table is ready!' AS message;

