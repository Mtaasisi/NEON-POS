-- =====================================================
-- AUTOMATIC FIX FOR IMAGE UPLOAD
-- =====================================================
-- This script automatically fixes all database-related issues
-- for product image uploads. Just run this once.
-- =====================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  bucket_note TEXT;
BEGIN
  RAISE NOTICE '🚀 Starting automatic image upload fix...';
  RAISE NOTICE '';
  
  -- =====================================================
  -- STEP 1: Check if product_images table exists
  -- =====================================================
  RAISE NOTICE 'Step 1: Checking product_images table...';
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_images'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ product_images table already exists';
  ELSE
    RAISE NOTICE '⚠️  product_images table does not exist - creating now...';
  END IF;
  
  -- =====================================================
  -- STEP 2: Create product_images table (if not exists)
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Step 2: Creating/updating product_images table...';
  
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
  
  RAISE NOTICE '✅ product_images table structure verified';
  
  -- =====================================================
  -- STEP 3: Create indexes for performance
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Step 3: Creating indexes...';
  
  CREATE INDEX IF NOT EXISTS idx_product_images_product_id 
    ON product_images(product_id);
  
  CREATE INDEX IF NOT EXISTS idx_product_images_is_primary 
    ON product_images(is_primary);
  
  CREATE INDEX IF NOT EXISTS idx_product_images_created_at 
    ON product_images(created_at DESC);
  
  RAISE NOTICE '✅ All indexes created successfully';
  
  -- =====================================================
  -- STEP 4: Disable RLS (for Neon Database)
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Step 4: Configuring Row Level Security...';
  
  ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ RLS disabled (good for Neon Database)';
  
  -- =====================================================
  -- STEP 5: Grant all permissions
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Step 5: Granting permissions...';
  
  GRANT ALL ON product_images TO postgres;
  GRANT ALL ON product_images TO anon;
  GRANT ALL ON product_images TO authenticated;
  GRANT ALL ON product_images TO service_role;
  
  RAISE NOTICE '✅ Permissions granted to all roles';
  
  -- =====================================================
  -- STEP 6: Create/update triggers
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Step 6: Setting up triggers...';
  
  -- Create updated_at trigger function if not exists
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $trigger$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $trigger$ LANGUAGE plpgsql;
  
  -- Drop old trigger if exists and create new one
  DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
  
  CREATE TRIGGER update_product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  
  RAISE NOTICE '✅ Triggers configured successfully';
  
  -- =====================================================
  -- STEP 7: Verify setup
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Step 7: Verifying setup...';
  RAISE NOTICE '';
  
  -- Check table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'product_images'
  ) THEN
    RAISE NOTICE '✅ Table exists: product_images';
  ELSE
    RAISE NOTICE '❌ Table missing: product_images';
  END IF;
  
  -- Check indexes
  IF EXISTS (
    SELECT FROM pg_indexes 
    WHERE tablename = 'product_images' 
    AND indexname = 'idx_product_images_product_id'
  ) THEN
    RAISE NOTICE '✅ Index exists: idx_product_images_product_id';
  END IF;
  
  -- Check RLS status
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE tablename = 'product_images' 
    AND rowsecurity = false
  ) THEN
    RAISE NOTICE '✅ RLS is disabled';
  END IF;
  
  -- Count existing images
  DECLARE
    image_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO image_count FROM product_images;
    RAISE NOTICE '📊 Existing images in database: %', image_count;
  END;
  
  -- =====================================================
  -- STEP 8: Migrate legacy images (if any)
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Step 8: Checking for legacy images to migrate...';
  
  DECLARE
    migrated_count INTEGER := 0;
    product_record RECORD;
    image_url TEXT;
    image_index INTEGER;
  BEGIN
    -- Check if lats_products has images column
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'lats_products' 
      AND column_name = 'images'
    ) THEN
      
      -- Loop through products with images
      FOR product_record IN 
        SELECT id, name, images 
        FROM lats_products 
        WHERE images IS NOT NULL 
          AND jsonb_array_length(images) > 0
          AND NOT EXISTS (
            SELECT 1 FROM product_images pi WHERE pi.product_id = lats_products.id
          )
      LOOP
        image_index := 0;
        
        -- Loop through each image URL in the JSONB array
        FOR image_url IN 
          SELECT jsonb_array_elements_text(product_record.images)
        LOOP
          -- Insert image record
          INSERT INTO product_images (
            product_id,
            image_url,
            thumbnail_url,
            file_name,
            file_size,
            is_primary,
            uploaded_by,
            mime_type
          ) VALUES (
            product_record.id,
            image_url,
            image_url, -- Use same URL for thumbnail
            'migrated_image_' || image_index || '.jpg',
            0,
            image_index = 0, -- First image is primary
            NULL,
            'image/jpeg'
          )
          ON CONFLICT DO NOTHING;
          
          image_index := image_index + 1;
          migrated_count := migrated_count + 1;
        END LOOP;
      END LOOP;
      
      IF migrated_count > 0 THEN
        RAISE NOTICE '✅ Migrated % legacy images from lats_products.images', migrated_count;
      ELSE
        RAISE NOTICE 'ℹ️  No legacy images to migrate';
      END IF;
    ELSE
      RAISE NOTICE 'ℹ️  No legacy images column found';
    END IF;
  END;
  
  -- =====================================================
  -- FINAL SUMMARY
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ AUTOMATIC FIX COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Setup Summary:';
  RAISE NOTICE '   ✅ product_images table: READY';
  RAISE NOTICE '   ✅ Indexes: CREATED';
  RAISE NOTICE '   ✅ Permissions: GRANTED';
  RAISE NOTICE '   ✅ RLS: DISABLED';
  RAISE NOTICE '   ✅ Triggers: CONFIGURED';
  RAISE NOTICE '';
  
  -- Check total images
  DECLARE
    total_images INTEGER;
    total_products INTEGER;
    products_with_images INTEGER;
  BEGIN
    SELECT COUNT(*) INTO total_images FROM product_images;
    SELECT COUNT(*) INTO total_products FROM lats_products;
    SELECT COUNT(DISTINCT product_id) INTO products_with_images FROM product_images;
    
    RAISE NOTICE '📊 Current Status:';
    RAISE NOTICE '   • Total products: %', total_products;
    RAISE NOTICE '   • Products with images: %', products_with_images;
    RAISE NOTICE '   • Total images stored: %', total_images;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: One More Step Required!';
  RAISE NOTICE '';
  RAISE NOTICE 'The database is ready, but you need to create the';
  RAISE NOTICE 'Supabase Storage bucket for image uploads:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Go to: https://supabase.com/dashboard';
  RAISE NOTICE '2. Select your project';
  RAISE NOTICE '3. Go to Storage section';
  RAISE NOTICE '4. Click "Create bucket"';
  RAISE NOTICE '5. Name: product-images';
  RAISE NOTICE '6. Make it PUBLIC ✓';
  RAISE NOTICE '7. Max size: 5MB (5242880 bytes)';
  RAISE NOTICE '';
  RAISE NOTICE 'OR run this command:';
  RAISE NOTICE '   node auto-create-storage-bucket.mjs';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 You''re almost done! Create the bucket and test!';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

-- Final verification query
SELECT 
  '✅ AUTO-FIX COMPLETE' AS status,
  COUNT(*) AS total_images,
  COUNT(DISTINCT product_id) AS products_with_images
FROM product_images;

