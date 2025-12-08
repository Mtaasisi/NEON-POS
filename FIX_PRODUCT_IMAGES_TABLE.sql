-- ================================================
-- FIX: Ensure Product Images Table Exists
-- ================================================
-- Fixes: No images in product thumbnails
-- 
-- Ensures product_images table exists with proper schema
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- Ensure product_images table exists
-- ================================================

CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    thumbnail_url text,
    file_name text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    mime_type text
);

-- Add primary key if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_images_pkey'
    AND conrelid = 'public.product_images'::regclass
  ) THEN
    ALTER TABLE public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add foreign key constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_images_product_id_fkey'
  ) THEN
    -- Only add foreign key if lats_products table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'lats_products'
    ) THEN
      ALTER TABLE public.product_images
      ADD CONSTRAINT product_images_product_id_fkey 
      FOREIGN KEY (product_id) 
      REFERENCES public.lats_products(id) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON public.product_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON public.product_images(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_images_updated_at_trigger ON public.product_images;
CREATE TRIGGER update_product_images_updated_at_trigger
    BEFORE UPDATE ON public.product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_product_images_updated_at();

COMMIT;

-- ================================================
-- Verification queries
-- ================================================

-- Check if table exists and show structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'product_images'
ORDER BY ordinal_position;

-- Count images in database
SELECT 
  COUNT(*) as total_images,
  COUNT(DISTINCT product_id) as products_with_images,
  COUNT(*) FILTER (WHERE is_primary = true) as primary_images
FROM public.product_images;

-- Show sample products with images
SELECT 
  p.id,
  p.name,
  COUNT(pi.id) as image_count,
  MAX(pi.is_primary) as has_primary_image
FROM public.lats_products p
LEFT JOIN public.product_images pi ON p.id = pi.product_id
GROUP BY p.id, p.name
ORDER BY image_count DESC
LIMIT 10;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- The product_images table is now ready!
-- 
-- Next steps:
-- 1. Upload images for your products
-- 2. Images will appear in product thumbnails
-- ================================================
