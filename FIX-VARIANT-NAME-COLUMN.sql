-- ================================================================================
-- FIX: Rename variant_name to name in lats_product_variants
-- ================================================================================
-- Issue: Code uses "name" field but database has "variant_name" column
-- Error: null value in column "variant_name" violates not-null constraint
-- Solution: Rename the column from variant_name to name
-- ================================================================================

BEGIN;

\echo '========================================';
\echo '🔍 Checking current column name...';
\echo '========================================';

-- Check which column name exists
DO $$ 
DECLARE
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
BEGIN
    -- Check if variant_name exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    -- Check if name exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
    ) INTO has_name;
    
    IF has_variant_name AND NOT has_name THEN
        RAISE NOTICE '📝 Found variant_name column - will rename to name';
        
        -- Rename the column
        ALTER TABLE lats_product_variants 
        RENAME COLUMN variant_name TO name;
        
        RAISE NOTICE '✅ Successfully renamed variant_name to name';
        
    ELSIF has_name AND NOT has_variant_name THEN
        RAISE NOTICE '✓ Column is already named "name" - no action needed';
        
    ELSIF has_variant_name AND has_name THEN
        RAISE NOTICE '⚠️  WARNING: Both variant_name AND name columns exist!';
        RAISE NOTICE '   This is unusual. Please check your schema manually.';
        
    ELSE
        RAISE NOTICE '❌ Neither variant_name nor name column found!';
        RAISE NOTICE '   Creating name column...';
        
        ALTER TABLE lats_product_variants 
        ADD COLUMN name TEXT NOT NULL DEFAULT 'Default';
        
        RAISE NOTICE '✅ Created name column';
    END IF;
END $$;

\echo '';
\echo '========================================';
\echo '📊 Verifying column structure...';
\echo '========================================';

-- Show relevant columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
    AND column_name IN ('name', 'variant_name', 'sku', 'product_id')
ORDER BY column_name;

\echo '';
\echo '========================================';
\echo '✅ FIX COMPLETED';
\echo '========================================';

COMMIT;

