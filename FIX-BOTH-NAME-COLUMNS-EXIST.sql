-- ================================================================================
-- FIX: Both "name" and "variant_name" columns exist
-- ================================================================================
-- This happens when columns were added but not cleaned up properly.
-- Solution: Drop the old variant_name column since code uses "name"
-- ================================================================================

BEGIN;

-- Step 1: Check if both columns exist
DO $$ 
DECLARE
    has_name BOOLEAN;
    has_variant_name BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'name'
    ) INTO has_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    RAISE NOTICE 'Diagnosis:';
    RAISE NOTICE '  name column exists: %', has_name;
    RAISE NOTICE '  variant_name column exists: %', has_variant_name;
    
    IF has_name AND has_variant_name THEN
        RAISE NOTICE '⚠️  Both columns exist - will copy data and remove variant_name';
        
        -- Copy any non-null data from variant_name to name where name is null
        UPDATE lats_product_variants 
        SET name = variant_name 
        WHERE name IS NULL AND variant_name IS NOT NULL;
        
        RAISE NOTICE '✅ Copied data from variant_name to name';
        
        -- Now drop the variant_name column
        ALTER TABLE lats_product_variants DROP COLUMN variant_name;
        
        RAISE NOTICE '✅ Dropped variant_name column';
        
    ELSIF has_variant_name AND NOT has_name THEN
        RAISE NOTICE '🔧 Only variant_name exists - renaming to name';
        ALTER TABLE lats_product_variants RENAME COLUMN variant_name TO name;
        RAISE NOTICE '✅ Renamed variant_name to name';
        
    ELSIF has_name AND NOT has_variant_name THEN
        RAISE NOTICE '✅ Already correct - only name column exists';
        
    ELSE
        RAISE NOTICE '❌ Neither column exists - this is a problem!';
    END IF;
END $$;

-- Step 2: Check the NOT NULL constraint on name
DO $$
BEGIN
    -- Make sure name column allows NOT NULL or has a default
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
        AND is_nullable = 'YES'
    ) THEN
        -- Set a default value for any null names
        UPDATE lats_product_variants SET name = 'Default' WHERE name IS NULL;
        RAISE NOTICE '✅ Set default name for null values';
    END IF;
END $$;

-- Step 3: Show the final schema
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

COMMIT;

-- Success message
SELECT '✅ Fix completed! Only "name" column should exist now.' AS status;

