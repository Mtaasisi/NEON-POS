-- =============================================================================
-- FIX 400 ERROR: Create missing lats_spare_part_variants table
-- =============================================================================
-- This creates the missing table that's causing the 400 Bad Request errors
-- Run this against your Neon database
-- =============================================================================

-- Create lats_spare_part_variants table
CREATE TABLE IF NOT EXISTS lats_spare_part_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id UUID NOT NULL REFERENCES lats_spare_parts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  cost_price DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spare_part_variants_spare_part_id 
  ON lats_spare_part_variants(spare_part_id);
  
CREATE INDEX IF NOT EXISTS idx_spare_part_variants_sku 
  ON lats_spare_part_variants(sku) WHERE sku IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE lats_spare_part_variants ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on spare part variants"
  ON lats_spare_part_variants FOR ALL
  USING (true) WITH CHECK (true);

-- Verify the table was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_spare_part_variants') THEN
    RAISE NOTICE '✅ lats_spare_part_variants table created successfully!';
    RAISE NOTICE '🔄 Refresh your browser - the 400 errors should be gone!';
  ELSE
    RAISE WARNING '❌ Failed to create lats_spare_part_variants table';
  END IF;
END $$;

