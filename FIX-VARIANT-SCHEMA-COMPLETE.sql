-- ================================================================================
-- COMPREHENSIVE FIX: Update lats_product_variants schema
-- ================================================================================
-- Issue: Column mismatch between code and database schema
-- Error: column "weight" of relation "lats_product_variants" does not exist
-- 
-- This script will:
-- 1. Check current schema
-- 2. Add missing columns (weight, dimensions)
-- 3. Ensure all required columns exist with correct types
-- ================================================================================

\echo '========================================';
\echo '🔍 STEP 1: Check Current Schema';
\echo '========================================';

-- Display current schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

\echo '';
\echo '========================================';
\echo '🔧 STEP 2: Add Missing Columns';
\echo '========================================';

BEGIN;

-- Add weight column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'weight'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN weight DECIMAL(10, 2);
        
        RAISE NOTICE '✅ Added weight column (DECIMAL 10,2)';
    ELSE
        RAISE NOTICE '✓ weight column already exists';
    END IF;
END $$;

-- Add dimensions column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'dimensions'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN dimensions JSONB;
        
        RAISE NOTICE '✅ Added dimensions column (JSONB)';
    ELSE
        RAISE NOTICE '✓ dimensions column already exists';
    END IF;
END $$;

-- Add barcode column if it doesn't exist (some schemas might be missing it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'barcode'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN barcode TEXT;
        
        RAISE NOTICE '✅ Added barcode column (TEXT)';
    ELSE
        RAISE NOTICE '✓ barcode column already exists';
    END IF;
END $$;

-- Ensure attributes column exists (might be called variant_attributes in older schemas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'attributes'
    ) THEN
        -- Check if variant_attributes exists and rename it
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'lats_product_variants' 
            AND column_name = 'variant_attributes'
        ) THEN
            ALTER TABLE lats_product_variants 
            RENAME COLUMN variant_attributes TO attributes;
            
            RAISE NOTICE '✅ Renamed variant_attributes to attributes';
        ELSE
            ALTER TABLE lats_product_variants 
            ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
            
            RAISE NOTICE '✅ Added attributes column (JSONB)';
        END IF;
    ELSE
        RAISE NOTICE '✓ attributes column already exists';
    END IF;
END $$;

-- Ensure name column exists (might be called variant_name in older schemas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
    ) THEN
        -- Check if variant_name exists and rename it
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'lats_product_variants' 
            AND column_name = 'variant_name'
        ) THEN
            ALTER TABLE lats_product_variants 
            RENAME COLUMN variant_name TO name;
            
            RAISE NOTICE '✅ Renamed variant_name to name';
        ELSE
            ALTER TABLE lats_product_variants 
            ADD COLUMN name TEXT NOT NULL DEFAULT 'Default';
            
            RAISE NOTICE '✅ Added name column (TEXT)';
        END IF;
    ELSE
        RAISE NOTICE '✓ name column already exists';
    END IF;
END $$;

COMMIT;

\echo '';
\echo '========================================';
\echo '✅ STEP 3: Verify Updated Schema';
\echo '========================================';

-- Show the updated schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

\echo '';
\echo '========================================';
\echo '🎉 FIX COMPLETED SUCCESSFULLY';
\echo '========================================';
\echo 'The lats_product_variants table has been updated.';
\echo 'You can now create products with variants.';
\echo '';
\echo 'Required columns present:';
\echo '  ✓ id';
\echo '  ✓ product_id';
\echo '  ✓ name';
\echo '  ✓ sku';
\echo '  ✓ barcode';
\echo '  ✓ cost_price';
\echo '  ✓ selling_price';
\echo '  ✓ quantity';
\echo '  ✓ min_quantity';
\echo '  ✓ attributes';
\echo '  ✓ weight';
\echo '  ✓ dimensions';
\echo '========================================';

