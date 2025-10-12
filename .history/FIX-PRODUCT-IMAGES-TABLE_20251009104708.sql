-- ============================================================================
-- FIX PRODUCT IMAGES TABLE
-- ============================================================================
-- This script creates the product_images table if it doesn't exist
-- and ensures proper RLS policies

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  uploaded_by UUID,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);

-- Disable RLS for easier access (Neon doesn't use Supabase auth roles)
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'product_images'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON product_images', pol.policyname);
    END LOOP;
END $$;

-- Migrate existing images from lats_products.images column to product_images table
-- (Only if they don't already exist)
INSERT INTO product_images (product_id, image_url, thumbnail_url, file_name, is_primary, file_size, created_at)
SELECT 
    p.id as product_id,
    img_url as image_url,
    img_url as thumbnail_url,
    'migrated-image-' || ROW_NUMBER() OVER (PARTITION BY p.id) as file_name,
    ROW_NUMBER() OVER (PARTITION BY p.id) = 1 as is_primary,
    0 as file_size,
    p.created_at
FROM lats_products p,
LATERAL unnest(
    CASE 
        WHEN p.images IS NOT NULL AND jsonb_array_length(p.images) > 0 
        THEN ARRAY(SELECT jsonb_array_elements_text(p.images))
        ELSE ARRAY[]::TEXT[]
    END
) AS img_url
WHERE p.images IS NOT NULL 
  AND jsonb_array_length(p.images) > 0
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi 
    WHERE pi.product_id = p.id 
    AND pi.image_url = img_url
  );

-- Success message
DO $$
DECLARE
    image_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO image_count FROM product_images;
    RAISE NOTICE '✅ Product images table created! Total images: %', image_count;
END $$;

