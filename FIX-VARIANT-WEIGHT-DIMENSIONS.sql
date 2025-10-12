-- ================================================================================
-- FIX: Add missing weight and dimensions columns to lats_product_variants
-- ================================================================================
-- Issue: variantUtils.ts tries to insert weight and dimensions but columns don't exist
-- Error: column "weight" of relation "lats_product_variants" does not exist
-- Solution: Add the missing columns to the table
-- ================================================================================

BEGIN;

-- Check if columns exist before adding them
DO $$ 
BEGIN
    -- Add weight column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'weight'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN weight DECIMAL(10, 2);
        
        RAISE NOTICE '✅ Added weight column to lats_product_variants';
    ELSE
        RAISE NOTICE '⚠️  weight column already exists in lats_product_variants';
    END IF;
    
    -- Add dimensions column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'dimensions'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN dimensions JSONB;
        
        RAISE NOTICE '✅ Added dimensions column to lats_product_variants';
    ELSE
        RAISE NOTICE '⚠️  dimensions column already exists in lats_product_variants';
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
    AND column_name IN ('weight', 'dimensions')
ORDER BY column_name;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FIX COMPLETED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The weight and dimensions columns have been added to lats_product_variants';
    RAISE NOTICE 'You can now create products with variants without errors';
END $$;

COMMIT;

