-- ================================================
-- CREATE SPARE PART IMAGES TABLE
-- ================================================
-- This migration creates the spare_part_images table for storing
-- spare part-specific images (separate from product images)
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- ================================================
-- Create spare_part_images table
-- ================================================

CREATE TABLE IF NOT EXISTS public.spare_part_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    spare_part_id uuid NOT NULL,
    image_url text NOT NULL,
    thumbnail_url text,
    file_name text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    mime_type text,
    is_primary boolean DEFAULT false,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT spare_part_images_pkey PRIMARY KEY (id)
);

-- Add foreign key constraint to lats_spare_parts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'spare_part_images_spare_part_id_fkey'
  ) THEN
    -- Only add foreign key if lats_spare_parts table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'lats_spare_parts'
    ) THEN
      ALTER TABLE public.spare_part_images
      ADD CONSTRAINT spare_part_images_spare_part_id_fkey 
      FOREIGN KEY (spare_part_id) 
      REFERENCES public.lats_spare_parts(id) 
      ON DELETE CASCADE;
      
      RAISE NOTICE 'Created foreign key: spare_part_images_spare_part_id_fkey';
    END IF;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spare_part_images_spare_part_id ON public.spare_part_images(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_images_is_primary ON public.spare_part_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_spare_part_images_created_at ON public.spare_part_images(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_spare_part_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_spare_part_images_updated_at_trigger ON public.spare_part_images;

CREATE TRIGGER update_spare_part_images_updated_at_trigger
    BEFORE UPDATE ON public.spare_part_images
    FOR EACH ROW
    EXECUTE FUNCTION update_spare_part_images_updated_at();

-- Add RLS policies if needed (adjust based on your RLS requirements)
-- For now, we'll enable RLS but allow all operations
-- You may want to restrict this based on your security requirements

ALTER TABLE public.spare_part_images ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'spare_part_images'
    AND policyname = 'Allow all for authenticated users'
  ) THEN
    CREATE POLICY "Allow all for authenticated users" ON public.spare_part_images
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- ================================================
-- Migration complete
-- ================================================
-- The spare_part_images table has been created with:
-- - Foreign key to lats_spare_parts
-- - Indexes for performance
-- - Auto-update timestamp trigger
-- - Basic RLS policies
-- ================================================
