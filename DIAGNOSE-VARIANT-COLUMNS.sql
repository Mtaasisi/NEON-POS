-- ================================================================================
-- DIAGNOSE: Check what columns actually exist in lats_product_variants
-- ================================================================================

-- Check all columns in the table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

-- Check if both name and variant_name exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_product_variants' AND column_name = 'name') 
        THEN '✅ name column EXISTS'
        ELSE '❌ name column MISSING'
    END as name_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_product_variants' AND column_name = 'variant_name') 
        THEN '✅ variant_name column EXISTS'
        ELSE '❌ variant_name column MISSING'
    END as variant_name_status;

