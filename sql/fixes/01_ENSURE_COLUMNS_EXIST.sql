-- ⚡ STEP 0: Ensure Required Columns Exist
-- Run this FIRST before running URGENT_FIX_add_imei_function.sql
-- This ensures all required columns exist in lats_product_variants table

-- ==============================================================================
-- Add parent_variant_id column (if doesn't exist)
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'parent_variant_id'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added parent_variant_id column';
    ELSE
        RAISE NOTICE '✓ parent_variant_id column already exists';
    END IF;
END $$;

-- ==============================================================================
-- Add is_parent column (if doesn't exist)
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'is_parent'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN is_parent BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE '✅ Added is_parent column';
    ELSE
        RAISE NOTICE '✓ is_parent column already exists';
    END IF;
END $$;

-- ==============================================================================
-- Add variant_type column (if doesn't exist)
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_type'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN variant_type TEXT DEFAULT 'standard';
        
        RAISE NOTICE '✅ Added variant_type column';
    ELSE
        RAISE NOTICE '✓ variant_type column already exists';
    END IF;
END $$;

-- ==============================================================================
-- Add variant_attributes column (if doesn't exist)
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_attributes'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN variant_attributes JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE '✅ Added variant_attributes column';
    ELSE
        RAISE NOTICE '✓ variant_attributes column already exists';
    END IF;
END $$;

-- ==============================================================================
-- Add variant_name column (if doesn't exist)
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN variant_name TEXT;
        
        RAISE NOTICE '✅ Added variant_name column';
    ELSE
        RAISE NOTICE '✓ variant_name column already exists';
    END IF;
END $$;

-- ==============================================================================
-- Create indexes for better performance
-- ==============================================================================

-- Index for parent-child lookups
CREATE INDEX IF NOT EXISTS idx_variants_parent_id 
ON lats_product_variants(parent_variant_id) 
WHERE parent_variant_id IS NOT NULL;

-- Index for IMEI lookups
CREATE INDEX IF NOT EXISTS idx_variants_type 
ON lats_product_variants(variant_type);

-- Index for IMEI attributes (JSONB)
CREATE INDEX IF NOT EXISTS idx_variants_imei_attributes 
ON lats_product_variants USING GIN (variant_attributes) 
WHERE variant_type IN ('imei', 'imei_child');

-- ==============================================================================
-- Verification
-- ==============================================================================
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col_exists BOOLEAN;
BEGIN
  -- Check each required column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'parent_variant_id'
  ) INTO col_exists;
  IF NOT col_exists THEN missing_columns := array_append(missing_columns, 'parent_variant_id'); END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'is_parent'
  ) INTO col_exists;
  IF NOT col_exists THEN missing_columns := array_append(missing_columns, 'is_parent'); END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'variant_type'
  ) INTO col_exists;
  IF NOT col_exists THEN missing_columns := array_append(missing_columns, 'variant_type'); END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'variant_attributes'
  ) INTO col_exists;
  IF NOT col_exists THEN missing_columns := array_append(missing_columns, 'variant_attributes'); END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'variant_name'
  ) INTO col_exists;
  IF NOT col_exists THEN missing_columns := array_append(missing_columns, 'variant_name'); END IF;

  -- Report results
  IF array_length(missing_columns, 1) IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SUCCESS: All required columns exist!';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Run URGENT_FIX_add_imei_function.sql';
    RAISE NOTICE '   2. Refresh your browser';
    RAISE NOTICE '   3. Test receiving Purchase Orders with IMEI';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '❌ ERROR: Missing columns: %', array_to_string(missing_columns, ', ');
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Please run this script again';
    RAISE NOTICE '';
  END IF;
END $$;

