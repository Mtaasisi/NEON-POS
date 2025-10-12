-- ================================================================================
-- COMPREHENSIVE PRODUCT DIAGNOSTIC
-- ================================================================================
-- This script checks ALL aspects of your products to identify issues
-- Run this in your Neon Database SQL Editor
-- ================================================================================

BEGIN;

SELECT '🔍 RUNNING COMPREHENSIVE PRODUCT DIAGNOSTIC...' as status;
SELECT '' as blank;

-- ================================================================================
-- 1. CHECK SCHEMA CONSISTENCY
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📋 SECTION 1: SCHEMA CONSISTENCY' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Check if critical columns exist in lats_products
SELECT 
    '✅ lats_products columns:' as check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_products'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '' as blank;

-- Check if critical columns exist in lats_product_variants
SELECT 
    '✅ lats_product_variants columns:' as check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '' as blank;

-- ================================================================================
-- 2. PRODUCTS WITHOUT VARIANTS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '⚠️  SECTION 2: PRODUCTS WITHOUT VARIANTS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    '❌ ISSUE: Products without variants' as issue,
    p.id,
    p.name,
    p.stock_quantity,
    p.is_active,
    COUNT(v.id) as variant_count
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name, p.stock_quantity, p.is_active
HAVING COUNT(v.id) = 0
ORDER BY p.name;

SELECT '' as blank;

-- Count of products without variants
SELECT 
    '📊 SUMMARY:' as summary,
    COUNT(DISTINCT p.id) as products_without_variants
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id
HAVING COUNT(v.id) = 0;

SELECT '' as blank;

-- ================================================================================
-- 3. IMAGE URL ISSUES
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🖼️  SECTION 3: IMAGE URL ISSUES' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    CASE 
        WHEN image_url IS NULL OR image_url = '' THEN '❌ No image'
        WHEN image_url = '/placeholder-product.png' THEN '⚠️  Placeholder (404)'
        WHEN image_url LIKE 'data:image%' THEN '✅ Data URI'
        WHEN image_url LIKE 'https://%' THEN '✅ External URL'
        ELSE '⚠️  Unknown format'
    END as image_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM lats_products
WHERE is_active = true
GROUP BY 
    CASE 
        WHEN image_url IS NULL OR image_url = '' THEN '❌ No image'
        WHEN image_url = '/placeholder-product.png' THEN '⚠️  Placeholder (404)'
        WHEN image_url LIKE 'data:image%' THEN '✅ Data URI'
        WHEN image_url LIKE 'https://%' THEN '✅ External URL'
        ELSE '⚠️  Unknown format'
    END
ORDER BY count DESC;

SELECT '' as blank;

-- Products with problematic images
SELECT 
    '❌ Products with broken images:' as issue,
    name,
    image_url,
    sku
FROM lats_products
WHERE is_active = true
  AND (image_url IS NULL OR image_url = '' OR image_url = '/placeholder-product.png')
ORDER BY name
LIMIT 10;

SELECT '' as blank;

-- ================================================================================
-- 4. PRICE ISSUES
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '💰 SECTION 4: PRICE ISSUES' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Check for products with zero or null prices
SELECT 
    '❌ ISSUE: Products with zero/null prices' as issue,
    p.id,
    p.name,
    p.unit_price,
    p.cost_price,
    COALESCE(p.stock_quantity, 0) as stock_quantity
FROM lats_products p
WHERE p.is_active = true
  AND (p.unit_price IS NULL OR p.unit_price = 0 OR p.cost_price IS NULL OR p.cost_price = 0)
ORDER BY p.name
LIMIT 10;

SELECT '' as blank;

-- Check for variants with zero or null prices
SELECT 
    '❌ ISSUE: Variants with zero/null prices' as issue,
    p.name as product_name,
    v.name as variant_name,
    v.unit_price,
    v.cost_price,
    v.selling_price,
    v.quantity
FROM lats_product_variants v
INNER JOIN lats_products p ON v.product_id = p.id
WHERE v.is_active = true
  AND (
    v.unit_price IS NULL OR v.unit_price = 0 
    OR v.cost_price IS NULL OR v.cost_price = 0
    OR (v.selling_price IS NOT NULL AND v.selling_price = 0)
  )
ORDER BY p.name, v.name
LIMIT 10;

SELECT '' as blank;

-- Price summary
SELECT 
    '📊 PRICE SUMMARY:' as summary,
    COUNT(*) as total_active_products,
    COUNT(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 END) as zero_unit_price,
    COUNT(CASE WHEN cost_price IS NULL OR cost_price = 0 THEN 1 END) as zero_cost_price,
    ROUND(AVG(NULLIF(unit_price, 0)), 2) as avg_unit_price,
    ROUND(AVG(NULLIF(cost_price, 0)), 2) as avg_cost_price
FROM lats_products
WHERE is_active = true;

SELECT '' as blank;

-- ================================================================================
-- 5. STOCK QUANTITY MISMATCHES
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📦 SECTION 5: STOCK QUANTITY ISSUES' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Products where product stock doesn't match variant stock
SELECT 
    '⚠️  ISSUE: Stock mismatch between product and variants' as issue,
    p.id,
    p.name,
    p.stock_quantity as product_stock,
    COALESCE(SUM(v.quantity), 0) as total_variant_stock,
    (p.stock_quantity - COALESCE(SUM(v.quantity), 0)) as difference
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name, p.stock_quantity
HAVING p.stock_quantity != COALESCE(SUM(v.quantity), 0)
ORDER BY ABS(p.stock_quantity - COALESCE(SUM(v.quantity), 0)) DESC
LIMIT 10;

SELECT '' as blank;

-- ================================================================================
-- 6. DUPLICATE SKU ISSUES
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔢 SECTION 6: DUPLICATE SKU ISSUES' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Check for duplicate SKUs in products
SELECT 
    '❌ ISSUE: Duplicate product SKUs' as issue,
    sku,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ', ') as product_names
FROM lats_products
WHERE sku IS NOT NULL AND sku != ''
GROUP BY sku
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

SELECT '' as blank;

-- Check for duplicate SKUs in variants
SELECT 
    '❌ ISSUE: Duplicate variant SKUs' as issue,
    v.sku,
    COUNT(*) as duplicate_count,
    STRING_AGG(p.name || ' (' || v.name || ')', ', ') as variants
FROM lats_product_variants v
INNER JOIN lats_products p ON v.product_id = p.id
WHERE v.sku IS NOT NULL AND v.sku != ''
GROUP BY v.sku
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

SELECT '' as blank;

-- ================================================================================
-- 7. FOREIGN KEY INTEGRITY
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔗 SECTION 7: FOREIGN KEY INTEGRITY' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Products with invalid category references
SELECT 
    '❌ ISSUE: Products with invalid category_id' as issue,
    p.id,
    p.name,
    p.category_id,
    p.is_active
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
WHERE p.category_id IS NOT NULL
  AND c.id IS NULL
ORDER BY p.name
LIMIT 10;

SELECT '' as blank;

-- Products with invalid supplier references
SELECT 
    '❌ ISSUE: Products with invalid supplier_id' as issue,
    p.id,
    p.name,
    p.supplier_id,
    p.is_active
FROM lats_products p
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
WHERE p.supplier_id IS NOT NULL
  AND s.id IS NULL
ORDER BY p.name
LIMIT 10;

SELECT '' as blank;

-- ================================================================================
-- 8. MISSING CRITICAL FIELDS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📝 SECTION 8: MISSING CRITICAL FIELDS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Products missing critical information
SELECT 
    '⚠️  Products missing critical fields:' as issue,
    p.id,
    p.name,
    CASE WHEN p.sku IS NULL OR p.sku = '' THEN '❌' ELSE '✅' END as has_sku,
    CASE WHEN p.description IS NULL OR p.description = '' THEN '❌' ELSE '✅' END as has_description,
    CASE WHEN p.category_id IS NULL THEN '❌' ELSE '✅' END as has_category,
    CASE WHEN p.image_url IS NULL OR p.image_url = '' THEN '❌' ELSE '✅' END as has_image,
    CASE WHEN p.unit_price IS NULL OR p.unit_price = 0 THEN '❌' ELSE '✅' END as has_price
FROM lats_products p
WHERE p.is_active = true
  AND (
    p.sku IS NULL OR p.sku = ''
    OR p.description IS NULL OR p.description = ''
    OR p.category_id IS NULL
    OR p.image_url IS NULL OR p.image_url = ''
    OR p.unit_price IS NULL OR p.unit_price = 0
  )
ORDER BY p.name
LIMIT 10;

SELECT '' as blank;

-- ================================================================================
-- 9. VARIANT SCHEMA ISSUES
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔄 SECTION 9: VARIANT SCHEMA ISSUES' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Check for column name variations in variants table
DO $$
DECLARE
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
    has_variant_attributes BOOLEAN;
    has_attributes BOOLEAN;
BEGIN
    -- Check for variant_name vs name
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
    ) INTO has_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_attributes'
    ) INTO has_variant_attributes;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'attributes'
    ) INTO has_attributes;
    
    RAISE NOTICE '✅ Variant column check:';
    RAISE NOTICE '   - has variant_name: %', has_variant_name;
    RAISE NOTICE '   - has name: %', has_name;
    RAISE NOTICE '   - has variant_attributes: %', has_variant_attributes;
    RAISE NOTICE '   - has attributes: %', has_attributes;
    
    IF NOT has_variant_name AND NOT has_name THEN
        RAISE WARNING '❌ CRITICAL: No name column found in lats_product_variants!';
    END IF;
    
    IF has_variant_name AND has_name THEN
        RAISE WARNING '⚠️  WARNING: Both variant_name and name columns exist!';
    END IF;
END $$;

SELECT '' as blank;

-- ================================================================================
-- 10. OVERALL HEALTH SUMMARY
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 SECTION 10: OVERALL HEALTH SUMMARY' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

WITH health_metrics AS (
    SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_products,
        COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as products_without_images,
        COUNT(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 END) as products_with_zero_price,
        COUNT(CASE WHEN sku IS NULL OR sku = '' THEN 1 END) as products_without_sku,
        COUNT(CASE WHEN category_id IS NULL THEN 1 END) as products_without_category
    FROM lats_products
),
variant_metrics AS (
    SELECT 
        COUNT(DISTINCT product_id) as products_with_variants,
        COUNT(*) as total_variants,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_variants
    FROM lats_product_variants
)
SELECT 
    '📈 HEALTH METRICS:' as metric_type,
    h.total_products,
    h.active_products,
    h.inactive_products,
    v.products_with_variants,
    (h.active_products - v.products_with_variants) as products_without_variants,
    v.total_variants,
    v.active_variants,
    h.products_without_images,
    h.products_with_zero_price,
    h.products_without_sku,
    h.products_without_category
FROM health_metrics h
CROSS JOIN variant_metrics v;

SELECT '' as blank;

-- Calculate health score
WITH health_metrics AS (
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = true AND (image_url IS NOT NULL AND image_url != '') THEN 1 END) as with_images,
        COUNT(CASE WHEN is_active = true AND unit_price > 0 THEN 1 END) as with_prices,
        COUNT(CASE WHEN is_active = true AND (sku IS NOT NULL AND sku != '') THEN 1 END) as with_sku,
        COUNT(CASE WHEN is_active = true AND category_id IS NOT NULL THEN 1 END) as with_category
    FROM lats_products
),
variant_count AS (
    SELECT COUNT(DISTINCT product_id) as products_with_variants
    FROM lats_product_variants
    WHERE is_active = true
)
SELECT 
    '🎯 HEALTH SCORE:' as score_type,
    CASE 
        WHEN h.active = 0 THEN 0
        ELSE ROUND(
            (
                (v.products_with_variants::NUMERIC / h.active * 25) +
                (h.with_images::NUMERIC / h.active * 25) +
                (h.with_prices::NUMERIC / h.active * 25) +
                (h.with_sku::NUMERIC / h.active * 15) +
                (h.with_category::NUMERIC / h.active * 10)
            ), 2
        )
    END as overall_health_percentage,
    CASE 
        WHEN h.active = 0 THEN '❌ No active products'
        WHEN ROUND((v.products_with_variants::NUMERIC / h.active * 25 + h.with_images::NUMERIC / h.active * 25 + h.with_prices::NUMERIC / h.active * 25 + h.with_sku::NUMERIC / h.active * 15 + h.with_category::NUMERIC / h.active * 10), 2) >= 90 THEN '✅ Excellent'
        WHEN ROUND((v.products_with_variants::NUMERIC / h.active * 25 + h.with_images::NUMERIC / h.active * 25 + h.with_prices::NUMERIC / h.active * 25 + h.with_sku::NUMERIC / h.active * 15 + h.with_category::NUMERIC / h.active * 10), 2) >= 75 THEN '👍 Good'
        WHEN ROUND((v.products_with_variants::NUMERIC / h.active * 25 + h.with_images::NUMERIC / h.active * 25 + h.with_prices::NUMERIC / h.active * 25 + h.with_sku::NUMERIC / h.active * 15 + h.with_category::NUMERIC / h.active * 10), 2) >= 50 THEN '⚠️  Fair'
        ELSE '❌ Poor'
    END as health_rating
FROM health_metrics h
CROSS JOIN variant_count v;

SELECT '' as blank;

COMMIT;

-- ================================================================================
-- DIAGNOSTIC COMPLETE
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ DIAGNOSTIC COMPLETE!' as status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 Review the results above to identify issues with your products.' as instruction;
SELECT '💡 Common issues found:' as tip1;
SELECT '   - Products without variants (affects POS functionality)' as tip2;
SELECT '   - Missing or broken image URLs (causes 404 errors)' as tip3;
SELECT '   - Zero or null prices (prevents sales)' as tip4;
SELECT '   - Stock quantity mismatches (inventory inaccuracies)' as tip5;
SELECT '   - Duplicate SKUs (data integrity)' as tip6;
SELECT '   - Invalid foreign keys (orphaned references)' as tip7;

SELECT '' as blank;
SELECT '🚀 Next Steps:' as next_steps;
SELECT '   1. Review each section for issues' as step1;
SELECT '   2. Run appropriate fix scripts based on findings' as step2;
SELECT '   3. Re-run this diagnostic to verify fixes' as step3;

