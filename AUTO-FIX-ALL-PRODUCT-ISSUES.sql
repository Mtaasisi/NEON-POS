-- ================================================================================
-- AUTO-FIX ALL PRODUCT ISSUES
-- ================================================================================
-- This script automatically fixes common product issues found in diagnostics
-- Run this AFTER running COMPREHENSIVE-PRODUCT-DIAGNOSTIC.sql
-- ================================================================================

BEGIN;

SELECT '🔧 STARTING AUTO-FIX FOR ALL PRODUCT ISSUES...' as status;
SELECT '' as blank;

-- ================================================================================
-- FIX 1: CREATE MISSING VARIANTS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 FIX 1: Creating missing variants for products' as fix_name;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Check if we're using 'name' or 'variant_name' column
DO $$
DECLARE
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
    name_column TEXT;
    attributes_column TEXT;
BEGIN
    -- Check column names
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'name'
    ) INTO has_name;
    
    -- Determine which column to use
    IF has_variant_name THEN
        name_column := 'variant_name';
    ELSIF has_name THEN
        name_column := 'name';
    ELSE
        RAISE EXCEPTION 'No name column found in lats_product_variants';
    END IF;
    
    -- Check attributes column
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'lats_product_variants' AND column_name = 'variant_attributes')
        THEN 'variant_attributes'
        ELSE 'attributes'
    END INTO attributes_column;
    
    -- Create missing variants using dynamic SQL
    EXECUTE format('
        INSERT INTO lats_product_variants (
            product_id,
            %I,
            sku,
            cost_price,
            unit_price,
            selling_price,
            quantity,
            min_quantity,
            %I,
            is_active,
            created_at,
            updated_at
        )
        SELECT 
            p.id as product_id,
            ''Default'' as name,
            COALESCE(p.sku, ''SKU-'' || SUBSTRING(p.id::text, 1, 8)) as sku,
            COALESCE(p.cost_price, 0) as cost_price,
            COALESCE(p.unit_price, 0) as unit_price,
            COALESCE(p.unit_price, 0) as selling_price,
            COALESCE(p.stock_quantity, 0) as quantity,
            COALESCE(p.min_stock_level, 0) as min_quantity,
            ''{}''::jsonb as attributes,
            true as is_active,
            NOW() as created_at,
            NOW() as updated_at
        FROM lats_products p
        LEFT JOIN lats_product_variants v ON p.id = v.product_id
        WHERE v.id IS NULL
          AND p.is_active = true
    ', name_column, attributes_column);
    
    RAISE NOTICE '✅ Created default variants for products without variants';
END $$;

-- Show what was created
SELECT 
    '✅ Variants created in last minute:' as result,
    p.name as product_name,
    COUNT(v.id) as variants_created
FROM lats_products p
INNER JOIN lats_product_variants v ON p.id = v.product_id
WHERE v.created_at >= NOW() - INTERVAL '1 minute'
GROUP BY p.name
ORDER BY p.name;

SELECT '' as blank;

-- ================================================================================
-- FIX 2: FIX IMAGE URLS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 FIX 2: Fixing broken image URLs' as fix_name;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

UPDATE lats_products
SET 
    image_url = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
    updated_at = NOW()
WHERE (image_url IS NULL OR image_url = '' OR image_url = '/placeholder-product.png')
  AND is_active = true;

SELECT 
    '✅ Fixed image URLs for ' || COUNT(*) || ' products' as result
FROM lats_products
WHERE image_url LIKE 'data:image%'
  AND updated_at >= NOW() - INTERVAL '1 minute'
  AND is_active = true;

SELECT '' as blank;

-- ================================================================================
-- FIX 3: SET DEFAULT PRICES FOR ZERO-PRICE PRODUCTS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 FIX 3: Setting default prices (WARNING: Manual review recommended)' as fix_name;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Note: This sets a placeholder price. You should review and update these manually!
UPDATE lats_products
SET 
    unit_price = 1.00,
    updated_at = NOW()
WHERE (unit_price IS NULL OR unit_price = 0)
  AND is_active = true;

UPDATE lats_products
SET 
    cost_price = 0.50,
    updated_at = NOW()
WHERE (cost_price IS NULL OR cost_price = 0)
  AND is_active = true;

SELECT 
    '⚠️  Set default prices for products (PLEASE REVIEW AND UPDATE)' as warning,
    COUNT(*) as products_updated
FROM lats_products
WHERE updated_at >= NOW() - INTERVAL '1 minute'
  AND is_active = true
  AND (unit_price = 1.00 OR cost_price = 0.50);

SELECT '' as blank;

-- ================================================================================
-- FIX 4: GENERATE MISSING SKUs
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 FIX 4: Generating missing SKUs' as fix_name;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

UPDATE lats_products
SET 
    sku = 'SKU-' || SUBSTRING(id::text, 1, 8) || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    updated_at = NOW()
WHERE (sku IS NULL OR sku = '')
  AND is_active = true;

SELECT 
    '✅ Generated SKUs for ' || COUNT(*) || ' products' as result
FROM lats_products
WHERE sku LIKE 'SKU-%'
  AND updated_at >= NOW() - INTERVAL '1 minute'
  AND is_active = true;

SELECT '' as blank;

-- ================================================================================
-- FIX 5: SYNC STOCK QUANTITIES BETWEEN PRODUCTS AND VARIANTS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 FIX 5: Syncing stock quantities' as fix_name;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Update product stock to match sum of variant quantities
UPDATE lats_products p
SET 
    stock_quantity = COALESCE((
        SELECT SUM(v.quantity)
        FROM lats_product_variants v
        WHERE v.product_id = p.id
          AND v.is_active = true
    ), 0),
    updated_at = NOW()
WHERE p.is_active = true;

SELECT 
    '✅ Synced stock quantities for all products' as result,
    COUNT(*) as products_updated
FROM lats_products
WHERE updated_at >= NOW() - INTERVAL '1 minute'
  AND is_active = true;

SELECT '' as blank;

-- ================================================================================
-- FIX 6: FIX DUPLICATE SKUs
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 FIX 6: Fixing duplicate SKUs' as fix_name;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Add sequence number to duplicate SKUs
WITH duplicate_skus AS (
    SELECT 
        id,
        sku,
        ROW_NUMBER() OVER (PARTITION BY sku ORDER BY created_at) as rn
    FROM lats_products
    WHERE sku IN (
        SELECT sku 
        FROM lats_products 
        WHERE sku IS NOT NULL AND sku != ''
        GROUP BY sku 
        HAVING COUNT(*) > 1
    )
)
UPDATE lats_products p
SET 
    sku = d.sku || '-' || d.rn,
    updated_at = NOW()
FROM duplicate_skus d
WHERE p.id = d.id
  AND d.rn > 1;

SELECT 
    '✅ Fixed duplicate SKUs' as result,
    COUNT(*) as skus_fixed
FROM lats_products
WHERE updated_at >= NOW() - INTERVAL '1 minute';

SELECT '' as blank;

-- Do the same for variants
WITH duplicate_variant_skus AS (
    SELECT 
        v.id,
        v.sku,
        ROW_NUMBER() OVER (PARTITION BY v.sku ORDER BY v.created_at) as rn
    FROM lats_product_variants v
    WHERE v.sku IN (
        SELECT sku 
        FROM lats_product_variants 
        WHERE sku IS NOT NULL AND sku != ''
        GROUP BY sku 
        HAVING COUNT(*) > 1
    )
)
UPDATE lats_product_variants v
SET 
    sku = d.sku || '-' || d.rn,
    updated_at = NOW()
FROM duplicate_variant_skus d
WHERE v.id = d.id
  AND d.rn > 1;

SELECT 
    '✅ Fixed duplicate variant SKUs' as result,
    COUNT(*) as skus_fixed
FROM lats_product_variants
WHERE updated_at >= NOW() - INTERVAL '1 minute';

SELECT '' as blank;

-- ================================================================================
-- FIX 7: CLEAN UP INVALID FOREIGN KEYS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 FIX 7: Cleaning up invalid foreign keys' as fix_name;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Set invalid category_id to NULL
UPDATE lats_products p
SET 
    category_id = NULL,
    updated_at = NOW()
FROM lats_products p2
LEFT JOIN lats_categories c ON p2.category_id = c.id
WHERE p.id = p2.id
  AND p2.category_id IS NOT NULL
  AND c.id IS NULL;

SELECT 
    '✅ Cleared invalid category references' as result,
    COUNT(*) as references_cleared
FROM lats_products
WHERE category_id IS NULL
  AND updated_at >= NOW() - INTERVAL '1 minute';

SELECT '' as blank;

-- Set invalid supplier_id to NULL
UPDATE lats_products p
SET 
    supplier_id = NULL,
    updated_at = NOW()
FROM lats_products p2
LEFT JOIN lats_suppliers s ON p2.supplier_id = s.id
WHERE p.id = p2.id
  AND p2.supplier_id IS NOT NULL
  AND s.id IS NULL;

SELECT 
    '✅ Cleared invalid supplier references' as result,
    COUNT(*) as references_cleared
FROM lats_products
WHERE supplier_id IS NULL
  AND updated_at >= NOW() - INTERVAL '1 minute';

SELECT '' as blank;

-- ================================================================================
-- FIX 8: UPDATE VARIANT PRICES FROM PRODUCT PRICES
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 FIX 8: Syncing variant prices with product prices' as fix_name;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

UPDATE lats_product_variants v
SET 
    unit_price = COALESCE(p.unit_price, 0),
    cost_price = COALESCE(p.cost_price, 0),
    selling_price = COALESCE(
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'lats_product_variants' 
                        AND column_name = 'selling_price')
            THEN p.unit_price
            ELSE NULL
        END, 
        p.unit_price, 
        0
    ),
    updated_at = NOW()
FROM lats_products p
WHERE v.product_id = p.id
  AND v.is_active = true
  AND (v.unit_price IS NULL OR v.unit_price = 0 OR v.cost_price IS NULL OR v.cost_price = 0);

SELECT 
    '✅ Updated variant prices from product prices' as result,
    COUNT(*) as variants_updated
FROM lats_product_variants
WHERE updated_at >= NOW() - INTERVAL '1 minute'
  AND is_active = true;

SELECT '' as blank;

-- ================================================================================
-- VERIFICATION
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ VERIFICATION' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Count of products without variants (should be 0)
SELECT 
    '📊 Products without variants:' as check_name,
    COUNT(DISTINCT p.id) as count
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id
HAVING COUNT(v.id) = 0;

-- Count of products with broken images
SELECT 
    '📊 Products with broken images:' as check_name,
    COUNT(*) as count
FROM lats_products
WHERE is_active = true
  AND (image_url IS NULL OR image_url = '' OR image_url = '/placeholder-product.png');

-- Count of products with zero prices
SELECT 
    '📊 Products with zero prices:' as check_name,
    COUNT(*) as count
FROM lats_products
WHERE is_active = true
  AND (unit_price IS NULL OR unit_price = 0);

-- Count of products without SKU
SELECT 
    '📊 Products without SKU:' as check_name,
    COUNT(*) as count
FROM lats_products
WHERE is_active = true
  AND (sku IS NULL OR sku = '');

-- Count of duplicate SKUs
SELECT 
    '📊 Duplicate product SKUs:' as check_name,
    COUNT(*) as count
FROM (
    SELECT sku
    FROM lats_products
    WHERE sku IS NOT NULL AND sku != ''
    GROUP BY sku
    HAVING COUNT(*) > 1
) duplicates;

SELECT '' as blank;

COMMIT;

-- ================================================================================
-- COMPLETION MESSAGE
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ AUTO-FIX COMPLETE!' as status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 What was fixed:' as summary;
SELECT '   1. ✅ Created default variants for products without them' as fix1;
SELECT '   2. ✅ Fixed broken image URLs with data URI placeholders' as fix2;
SELECT '   3. ⚠️  Set default prices (REVIEW MANUALLY)' as fix3;
SELECT '   4. ✅ Generated missing SKUs' as fix4;
SELECT '   5. ✅ Synced stock quantities between products and variants' as fix5;
SELECT '   6. ✅ Fixed duplicate SKUs by adding sequence numbers' as fix6;
SELECT '   7. ✅ Cleaned up invalid foreign key references' as fix7;
SELECT '   8. ✅ Synced variant prices with product prices' as fix8;

SELECT '' as blank;

SELECT '⚠️  IMPORTANT NOTES:' as notes_header;
SELECT '   - Products with price = 1.00 need manual price review' as note1;
SELECT '   - Auto-generated SKUs should be updated with real values' as note2;
SELECT '   - Review all data URI placeholders and replace with actual images' as note3;

SELECT '' as blank;

SELECT '🎯 NEXT STEPS:' as next_steps;
SELECT '   1. Run COMPREHENSIVE-PRODUCT-DIAGNOSTIC.sql again to verify fixes' as step1;
SELECT '   2. Manually review and update prices for products with default 1.00' as step2;
SELECT '   3. Update auto-generated SKUs with proper values' as step3;
SELECT '   4. Upload real product images' as step4;

SELECT '' as blank;
SELECT '🎉 Your product database should now be in much better shape!' as done;

