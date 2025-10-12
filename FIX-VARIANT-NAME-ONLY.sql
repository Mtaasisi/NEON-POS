-- ================================================================================
-- SIMPLE FIX: Just rename variant_name to name
-- ================================================================================
-- This only fixes the column name mismatch, without adding unnecessary columns
-- ================================================================================

BEGIN;

-- Rename variant_name to name
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) THEN
        ALTER TABLE lats_product_variants RENAME COLUMN variant_name TO name;
        RAISE NOTICE '✅ Renamed variant_name → name';
    ELSE
        RAISE NOTICE '✓ Column is already named "name"';
    END IF;
END $$;

-- Also rename variant_attributes to attributes if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_attributes'
    ) THEN
        ALTER TABLE lats_product_variants RENAME COLUMN variant_attributes TO attributes;
        RAISE NOTICE '✅ Renamed variant_attributes → attributes';
    ELSE
        RAISE NOTICE '✓ Column is already named "attributes"';
    END IF;
END $$;

-- Show the result
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

COMMIT;

-- Done!
SELECT '✅ Fix completed! You can now create products.' AS status;

