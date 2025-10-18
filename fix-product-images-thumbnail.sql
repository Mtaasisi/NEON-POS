-- ============================================================================
-- FIX PRODUCT IMAGES THUMBNAIL COLUMN
-- ============================================================================
-- This script ensures the thumbnail_url column exists in product_images table
-- Run this if you get "column thumbnail_url does not exist" error
-- ============================================================================

DO $$
BEGIN
  -- Check if thumbnail_url column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'product_images' 
    AND column_name = 'thumbnail_url'
  ) THEN
    -- Add thumbnail_url column if it doesn't exist
    ALTER TABLE product_images ADD COLUMN thumbnail_url TEXT;
    RAISE NOTICE '✅ Added thumbnail_url column to product_images table';
  ELSE
    RAISE NOTICE '✅ thumbnail_url column already exists';
  END IF;

  -- Update existing rows to have thumbnail_url = image_url if thumbnail_url is NULL
  UPDATE product_images 
  SET thumbnail_url = image_url 
  WHERE thumbnail_url IS NULL;
  
  RAISE NOTICE '✅ Updated existing rows to use image_url as thumbnail_url';
END $$;

-- Verify the fix
SELECT 
  COUNT(*) as total_images,
  COUNT(thumbnail_url) as images_with_thumbnail,
  COUNT(*) - COUNT(thumbnail_url) as images_without_thumbnail
FROM product_images;

SELECT '✅ Product images thumbnail_url column fix complete!' as result;

