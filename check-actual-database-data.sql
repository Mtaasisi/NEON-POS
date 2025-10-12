-- ================================================================================
-- CHECK ACTUAL DATABASE DATA
-- ================================================================================
-- This script checks what data actually exists in your database
-- and identifies what's missing from the inventory page display
-- ================================================================================

-- Check products table structure and data
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 CHECKING PRODUCTS TABLE' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lats_products' 
ORDER BY ordinal_position;

SELECT '' as blank;

-- Count total products
SELECT 
    'Total Products' as metric,
    COUNT(*) as count
FROM lats_products;

SELECT 
    'Active Products' as metric,
    COUNT(*) as count
FROM lats_products WHERE is_active = true;

SELECT 
    'Inactive Products' as metric,
    COUNT(*) as count
FROM lats_products WHERE is_active = false;

SELECT '' as blank;

-- Check products with missing information
SELECT '🔍 PRODUCTS WITH MISSING INFORMATION:' as section;

SELECT 
    'Products without variants' as issue,
    COUNT(*) as count
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id
WHERE v.id IS NULL AND p.is_active = true;

SELECT 
    'Products without categories' as issue,
    COUNT(*) as count
FROM lats_products 
WHERE category_id IS NULL AND is_active = true;

SELECT 
    'Products without SKUs' as issue,
    COUNT(*) as count
FROM lats_products 
WHERE (sku IS NULL OR sku = '') AND is_active = true;

SELECT 
    'Products without descriptions' as issue,
    COUNT(*) as count
FROM lats_products 
WHERE (description IS NULL OR description = '') AND is_active = true;

SELECT 
    'Products with zero prices' as issue,
    COUNT(*) as count
FROM lats_products 
WHERE (unit_price IS NULL OR unit_price = 0) AND is_active = true;

SELECT 
    'Products with zero stock' as issue,
    COUNT(*) as count
FROM lats_products 
WHERE (stock_quantity IS NULL OR stock_quantity = 0) AND is_active = true;

SELECT '' as blank;

-- Show sample products with their actual data
SELECT '📦 SAMPLE PRODUCTS (First 10):' as section;
SELECT 
    p.id,
    p.name,
    p.description,
    p.sku,
    p.unit_price,
    p.cost_price,
    p.stock_quantity,
    p.min_stock_level,
    p.image_url,
    p.is_active,
    c.name as category_name,
    s.name as supplier_name,
    (SELECT COUNT(*) FROM lats_product_variants v WHERE v.product_id = p.id) as variant_count
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
ORDER BY p.created_at DESC
LIMIT 10;

SELECT '' as blank;

-- Check variants table
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🎯 CHECKING VARIANTS TABLE' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Show variants table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lats_product_variants' 
ORDER BY ordinal_position;

SELECT '' as blank;

-- Count variants
SELECT 
    'Total Variants' as metric,
    COUNT(*) as count
FROM lats_product_variants;

SELECT 
    'Active Variants' as metric,
    COUNT(*) as count
FROM lats_product_variants WHERE is_active = true;

SELECT '' as blank;

-- Check variants with missing information
SELECT '🔍 VARIANTS WITH MISSING INFORMATION:' as section;

SELECT 
    'Variants without names' as issue,
    COUNT(*) as count
FROM lats_product_variants 
WHERE (name IS NULL OR name = '' OR name = 'null') AND is_active = true;

SELECT 
    'Variants without SKUs' as issue,
    COUNT(*) as count
FROM lats_product_variants 
WHERE (sku IS NULL OR sku = '') AND is_active = true;

SELECT 
    'Variants with zero prices' as issue,
    COUNT(*) as count
FROM lats_product_variants 
WHERE (unit_price IS NULL OR unit_price = 0) AND is_active = true;

SELECT 
    'Variants with zero stock' as issue,
    COUNT(*) as count
FROM lats_product_variants 
WHERE (quantity IS NULL OR quantity = 0) AND is_active = true;

SELECT '' as blank;

-- Show sample variants
SELECT '🎯 SAMPLE VARIANTS (First 10):' as section;
SELECT 
    v.id,
    p.name as product_name,
    v.name as variant_name,
    v.sku,
    v.unit_price,
    v.cost_price,
    v.quantity,
    v.is_active
FROM lats_product_variants v
JOIN lats_products p ON v.product_id = p.id
ORDER BY v.created_at DESC
LIMIT 10;

SELECT '' as blank;

-- Check categories
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📂 CHECKING CATEGORIES' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    'Total Categories' as metric,
    COUNT(*) as count
FROM lats_categories;

SELECT 
    'Active Categories' as metric,
    COUNT(*) as count
FROM lats_categories WHERE is_active = true;

SELECT '' as blank;

SELECT '📂 ALL CATEGORIES:' as section;
SELECT 
    id,
    name,
    description,
    is_active,
    created_at
FROM lats_categories
ORDER BY name;

SELECT '' as blank;

-- Check suppliers
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🏢 CHECKING SUPPLIERS' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    'Total Suppliers' as metric,
    COUNT(*) as count
FROM lats_suppliers;

SELECT 
    'Active Suppliers' as metric,
    COUNT(*) as count
FROM lats_suppliers WHERE is_active = true;

SELECT '' as blank;

SELECT '🏢 ALL SUPPLIERS:' as section;
SELECT 
    id,
    name,
    contact_person,
    email,
    phone,
    is_active
FROM lats_suppliers
ORDER BY name;

SELECT '' as blank;

-- Check stock movements
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 CHECKING STOCK MOVEMENTS' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    'Total Stock Movements' as metric,
    COUNT(*) as count
FROM lats_stock_movements;

SELECT '' as blank;

-- Check product images
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🖼️  CHECKING PRODUCT IMAGES' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Check if product_images table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images')
        THEN 'product_images table exists'
        ELSE 'product_images table does NOT exist'
    END as table_status;

-- If table exists, show data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images') THEN
        RAISE NOTICE 'Total Images: %', (SELECT COUNT(*) FROM product_images);
        RAISE NOTICE 'Products with images: %', (SELECT COUNT(DISTINCT product_id) FROM product_images);
    END IF;
END $$;

SELECT '' as blank;

-- Summary of what needs to be fixed
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📋 SUMMARY - WHAT NEEDS TO BE FIXED' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Create a summary of issues
WITH issues AS (
    SELECT 'Products without variants' as issue, 
           COUNT(*) as count
    FROM lats_products p
    LEFT JOIN lats_product_variants v ON p.id = v.product_id
    WHERE v.id IS NULL AND p.is_active = true
    
    UNION ALL
    
    SELECT 'Products without categories' as issue, 
           COUNT(*) as count
    FROM lats_products 
    WHERE category_id IS NULL AND is_active = true
    
    UNION ALL
    
    SELECT 'Products without SKUs' as issue, 
           COUNT(*) as count
    FROM lats_products 
    WHERE (sku IS NULL OR sku = '') AND is_active = true
    
    UNION ALL
    
    SELECT 'Products without descriptions' as issue, 
           COUNT(*) as count
    FROM lats_products 
    WHERE (description IS NULL OR description = '') AND is_active = true
    
    UNION ALL
    
    SELECT 'Products with zero prices' as issue, 
           COUNT(*) as count
    FROM lats_products 
    WHERE (unit_price IS NULL OR unit_price = 0) AND is_active = true
    
    UNION ALL
    
    SELECT 'Products with zero stock' as issue, 
           COUNT(*) as count
    FROM lats_products 
    WHERE (stock_quantity IS NULL OR stock_quantity = 0) AND is_active = true
)
SELECT 
    issue,
    count,
    CASE 
        WHEN count = 0 THEN '✅ OK'
        WHEN count <= 5 THEN '⚠️  Minor'
        WHEN count <= 20 THEN '🔶 Moderate'
        ELSE '🔴 Major'
    END as severity
FROM issues
ORDER BY count DESC;

SELECT '' as blank;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ Database check complete!' as message;
SELECT 'Run COMPREHENSIVE-PRODUCT-FIX.sql to fix all issues automatically.' as next_step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
