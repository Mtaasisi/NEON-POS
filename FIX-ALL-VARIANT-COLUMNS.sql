-- ================================================================================
-- COMPREHENSIVE FIX: Standardize all lats_product_variants column names
-- ================================================================================
-- Issues Fixed:
-- 1. variant_name → name (code expects "name")
-- 2. Add missing weight and dimensions columns
-- 3. Ensure unit_price exists (code might use selling_price in some places)
-- 4. Add barcode if missing
-- 5. Rename variant_attributes → attributes if needed
-- ================================================================================

BEGIN;

\echo '========================================';
\echo '🔍 STEP 1: Current Schema Check';
\echo '========================================';

-- Show current schema
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
\echo '🔧 STEP 2: Fixing Column Names';
\echo '========================================';

-- Fix 1: Rename variant_name to name
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'variant_name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'name'
    ) THEN
        ALTER TABLE lats_product_variants RENAME COLUMN variant_name TO name;
        RAISE NOTICE '✅ Renamed variant_name → name';
    ELSE
        RAISE NOTICE '✓ name column already correct';
    END IF;
END $$;

-- Fix 2: Rename variant_attributes to attributes
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'variant_attributes'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'attributes'
    ) THEN
        ALTER TABLE lats_product_variants RENAME COLUMN variant_attributes TO attributes;
        RAISE NOTICE '✅ Renamed variant_attributes → attributes';
    ELSE
        RAISE NOTICE '✓ attributes column already correct';
    END IF;
END $$;

\echo '';
\echo '========================================';
\echo '➕ STEP 3: Adding Missing Columns';
\echo '========================================';

-- Fix 3: Add weight column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'weight'
    ) THEN
        ALTER TABLE lats_product_variants ADD COLUMN weight DECIMAL(10, 2);
        RAISE NOTICE '✅ Added weight column';
    ELSE
        RAISE NOTICE '✓ weight column exists';
    END IF;
END $$;

-- Fix 4: Add dimensions column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'dimensions'
    ) THEN
        ALTER TABLE lats_product_variants ADD COLUMN dimensions JSONB;
        RAISE NOTICE '✅ Added dimensions column';
    ELSE
        RAISE NOTICE '✓ dimensions column exists';
    END IF;
END $$;

-- Fix 5: Add barcode column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'barcode'
    ) THEN
        ALTER TABLE lats_product_variants ADD COLUMN barcode TEXT;
        RAISE NOTICE '✅ Added barcode column';
    ELSE
        RAISE NOTICE '✓ barcode column exists';
    END IF;
END $$;

-- Fix 6: Add attributes column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'attributes'
    ) THEN
        ALTER TABLE lats_product_variants ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added attributes column';
    ELSE
        RAISE NOTICE '✓ attributes column exists';
    END IF;
END $$;

-- Fix 7: Add name column if missing (in case both variant_name and name are missing)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'name'
    ) THEN
        ALTER TABLE lats_product_variants ADD COLUMN name TEXT NOT NULL DEFAULT 'Default';
        RAISE NOTICE '✅ Added name column';
    ELSE
        RAISE NOTICE '✓ name column exists';
    END IF;
END $$;

\echo '';
\echo '========================================';
\echo '🔧 STEP 4: Ensure Price Columns';
\echo '========================================';

-- Ensure unit_price exists (keep it for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE lats_product_variants ADD COLUMN unit_price NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added unit_price column';
    ELSE
        RAISE NOTICE '✓ unit_price column exists';
    END IF;
END $$;

-- Ensure selling_price exists (some code might use this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'selling_price'
    ) THEN
        ALTER TABLE lats_product_variants ADD COLUMN selling_price NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added selling_price column';
    ELSE
        RAISE NOTICE '✓ selling_price column exists';
    END IF;
END $$;

-- Sync selling_price with unit_price if one is missing
DO $$ 
BEGIN
    -- If unit_price has values but selling_price doesn't, copy them
    IF EXISTS (SELECT 1 FROM lats_product_variants WHERE unit_price > 0 AND (selling_price IS NULL OR selling_price = 0)) THEN
        UPDATE lats_product_variants 
        SET selling_price = unit_price 
        WHERE unit_price > 0 AND (selling_price IS NULL OR selling_price = 0);
        RAISE NOTICE '✅ Synced unit_price → selling_price';
    END IF;
    
    -- If selling_price has values but unit_price doesn't, copy them
    IF EXISTS (SELECT 1 FROM lats_product_variants WHERE selling_price > 0 AND (unit_price IS NULL OR unit_price = 0)) THEN
        UPDATE lats_product_variants 
        SET unit_price = selling_price 
        WHERE selling_price > 0 AND (unit_price IS NULL OR unit_price = 0);
        RAISE NOTICE '✅ Synced selling_price → unit_price';
    END IF;
END $$;

\echo '';
\echo '========================================';
\echo '✅ STEP 5: Verify Final Schema';
\echo '========================================';

-- Show final schema
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
\echo '🎉 ALL FIXES COMPLETED';
\echo '========================================';
\echo '';
\echo '✅ Column Standardization:';
\echo '   • variant_name → name';
\echo '   • variant_attributes → attributes';
\echo '';
\echo '✅ New Columns Added:';
\echo '   • weight (DECIMAL)';
\echo '   • dimensions (JSONB)';
\echo '   • barcode (TEXT)';
\echo '';
\echo '✅ Price Columns Synchronized:';
\echo '   • unit_price';
\echo '   • selling_price';
\echo '';
\echo '🚀 You can now create products without errors!';
\echo '========================================';

COMMIT;

