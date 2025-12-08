-- ================================================
-- CREATE VARIANT IMAGES TABLE
-- ================================================
-- This migration creates the variant_images table for storing
-- variant-specific images (separate from product images)
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- ================================================
-- Create variant_images table
-- ================================================

CREATE TABLE IF NOT EXISTS public.variant_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    image_url text NOT NULL,
    thumbnail_url text,
    file_name text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    mime_type text,
    is_primary boolean DEFAULT false,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT variant_images_pkey PRIMARY KEY (id)
);

-- Add foreign key constraint to lats_product_variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'variant_images_variant_id_fkey'
  ) THEN
    -- Only add foreign key if lats_product_variants table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'lats_product_variants'
    ) THEN
      ALTER TABLE public.variant_images
      ADD CONSTRAINT variant_images_variant_id_fkey 
      FOREIGN KEY (variant_id) 
      REFERENCES public.lats_product_variants(id) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_variant_images_variant_id ON public.variant_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_images_is_primary ON public.variant_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_variant_images_created_at ON public.variant_images(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_variant_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_variant_images_updated_at_trigger ON public.variant_images;
CREATE TRIGGER update_variant_images_updated_at_trigger
    BEFORE UPDATE ON public.variant_images
    FOR EACH ROW
    EXECUTE FUNCTION update_variant_images_updated_at();

-- Create trigger to ensure only one primary image per variant
CREATE OR REPLACE FUNCTION ensure_single_primary_variant_image()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this image as primary, unset all other primary images for this variant
    IF NEW.is_primary = true THEN
        UPDATE public.variant_images
        SET is_primary = false
        WHERE variant_id = NEW.variant_id
        AND id != NEW.id
        AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_primary_variant_image_trigger ON public.variant_images;
CREATE TRIGGER ensure_single_primary_variant_image_trigger
    BEFORE INSERT OR UPDATE ON public.variant_images
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_variant_image();

-- Add comments
COMMENT ON TABLE public.variant_images IS 'Stores images for product variants';
COMMENT ON COLUMN public.variant_images.variant_id IS 'Foreign key to lats_product_variants';
COMMENT ON COLUMN public.variant_images.is_primary IS 'Indicates if this is the primary image for the variant';

COMMIT;
