-- ================================================
-- CREATE PRODUCT IMAGES TABLE
-- ================================================
-- This migration creates the product_images table with all required fields
-- and sets up proper indexes, triggers, and RLS policies

-- Drop existing table if it exists (to ensure clean state)
DROP TABLE IF EXISTS product_images CASCADE;

-- Create product_images table with complete schema
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES lats_products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    uploaded_by UUID,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON product_images(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_images_updated_at_trigger ON product_images;
CREATE TRIGGER update_product_images_updated_at_trigger
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_product_images_updated_at();

-- Create trigger to ensure only one primary image per product
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this image as primary, unset all other primary images for this product
    IF NEW.is_primary = true THEN
        UPDATE product_images 
        SET is_primary = false 
        WHERE product_id = NEW.product_id 
        AND id != NEW.id 
        AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_primary_image_trigger ON product_images;
CREATE TRIGGER ensure_single_primary_image_trigger
    BEFORE INSERT OR UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_image();

-- Enable Row Level Security
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view product images" ON product_images;
DROP POLICY IF EXISTS "Allow authenticated users to insert product images" ON product_images;
DROP POLICY IF EXISTS "Allow authenticated users to update product images" ON product_images;
DROP POLICY IF EXISTS "Allow authenticated users to delete product images" ON product_images;
DROP POLICY IF EXISTS "Allow all users to view product images" ON product_images;
DROP POLICY IF EXISTS "Allow all users to insert product images" ON product_images;
DROP POLICY IF EXISTS "Allow all users to update product images" ON product_images;
DROP POLICY IF EXISTS "Allow all users to delete product images" ON product_images;

-- Create RLS policies
-- Allow all users to view product images
CREATE POLICY "Allow all users to view product images"
    ON product_images FOR SELECT
    USING (true);

-- Allow all users to insert product images
CREATE POLICY "Allow all users to insert product images"
    ON product_images FOR INSERT
    WITH CHECK (true);

-- Allow all users to update product images
CREATE POLICY "Allow all users to update product images"
    ON product_images FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow all users to delete product images
CREATE POLICY "Allow all users to delete product images"
    ON product_images FOR DELETE
    USING (true);

-- Grant permissions
-- Note: Only grant to authenticated role if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT ALL ON product_images TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON product_images TO service_role;
    END IF;
END $$;

-- Add comment to table
COMMENT ON TABLE product_images IS 'Stores product image references with metadata for the LATS system';

