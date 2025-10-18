-- =====================================================
-- REMOVE IMAGE UPLOAD FEATURE FROM DATABASE
-- =====================================================
-- This script removes all image-related tables and functionality
-- Run this in your database SQL editor
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  Starting removal of image upload feature...';
  RAISE NOTICE '';

  -- =====================================================
  -- STEP 1: Drop product_images table
  -- =====================================================
  RAISE NOTICE 'Step 1: Removing product_images table...';
  
  -- Drop foreign key constraints first
  DROP TABLE IF EXISTS product_images CASCADE;
  
  RAISE NOTICE '✅ product_images table removed';
  RAISE NOTICE '';

  -- =====================================================
  -- STEP 2: Remove image-related columns from lats_products
  -- =====================================================
  RAISE NOTICE 'Step 2: Removing image-related columns from lats_products...';
  
  -- Check if images column exists before attempting to drop
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_products' 
    AND column_name = 'images'
  ) THEN
    ALTER TABLE lats_products DROP COLUMN IF EXISTS images CASCADE;
    RAISE NOTICE '✅ Removed images column from lats_products (with CASCADE for dependent views)';
  ELSE
    RAISE NOTICE '✅ images column does not exist in lats_products (already removed or never existed)';
  END IF;
  
  RAISE NOTICE '';

  -- =====================================================
  -- STEP 3: Drop storage bucket (if using Supabase)
  -- =====================================================
  RAISE NOTICE 'Step 3: Storage bucket removal instructions...';
  RAISE NOTICE '⚠️  Manual action required for Supabase users:';
  RAISE NOTICE '   1. Go to Supabase Dashboard > Storage';
  RAISE NOTICE '   2. Delete the "product-images" bucket';
  RAISE NOTICE '   3. This will remove all uploaded product images';
  RAISE NOTICE '';

  -- =====================================================
  -- STEP 4: Clean up any remaining image-related functions
  -- =====================================================
  RAISE NOTICE 'Step 4: Removing image-related functions and triggers...';
  
  -- Drop triggers
  DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
  DROP TRIGGER IF EXISTS ensure_single_primary_image_trigger ON product_images;
  
  -- Drop functions
  DROP FUNCTION IF EXISTS update_product_images_updated_at();
  DROP FUNCTION IF EXISTS ensure_single_primary_image();
  
  RAISE NOTICE '✅ Image-related triggers and functions removed';
  RAISE NOTICE '';

  -- =====================================================
  -- COMPLETION
  -- =====================================================
  RAISE NOTICE '✅ IMAGE UPLOAD FEATURE REMOVAL COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary of changes:';
  RAISE NOTICE '   • product_images table dropped';
  RAISE NOTICE '   • images column removed from lats_products (if existed)';
  RAISE NOTICE '   • Image triggers and functions removed';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Remember to:';
  RAISE NOTICE '   1. Delete the "product-images" storage bucket in Supabase (if applicable)';
  RAISE NOTICE '   2. Test product creation to ensure it works without images';
  RAISE NOTICE '';

END $$;

