-- ================================================================================
-- FIX PLACEHOLDER IMAGES
-- ================================================================================
-- This script fixes the placeholder image issue by updating products to use
-- a proper placeholder image URL that exists in your application
-- ================================================================================

BEGIN;

-- ================================================================================
-- STEP 1: CHECK CURRENT IMAGE URLS
-- ================================================================================

SELECT '🔍 CHECKING CURRENT IMAGE URLS:' as status;

SELECT 
    name,
    image_url,
    CASE 
        WHEN image_url IS NULL OR image_url = '' THEN '❌ No image'
        WHEN image_url = '/placeholder-product.png' THEN '⚠️  Placeholder (404)'
        ELSE '✅ Has image'
    END as image_status
FROM lats_products
WHERE is_active = true
ORDER BY name;

SELECT '' as blank;

-- ================================================================================
-- STEP 2: UPDATE IMAGE URLS TO USE PROPER PLACEHOLDERS
-- ================================================================================

SELECT '🔧 FIXING IMAGE URLS...' as status;

-- Option 1: Use a data URI for a simple placeholder (works immediately)
UPDATE lats_products
SET 
    image_url = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
    updated_at = NOW()
WHERE (image_url IS NULL OR image_url = '' OR image_url = '/placeholder-product.png')
  AND is_active = true;

SELECT '✅ Updated products with data URI placeholder' as result;

-- ================================================================================
-- STEP 3: ALTERNATIVE - USE EXTERNAL PLACEHOLDER SERVICE
-- ================================================================================

-- If you prefer external placeholder, uncomment this instead:
/*
UPDATE lats_products
SET 
    image_url = 'https://via.placeholder.com/200x200/f3f4f6/666666?text=No+Image',
    updated_at = NOW()
WHERE (image_url IS NULL OR image_url = '' OR image_url = '/placeholder-product.png')
  AND is_active = true;
*/

-- ================================================================================
-- STEP 4: VERIFY THE FIX
-- ================================================================================

SELECT '✅ VERIFICATION - UPDATED IMAGE URLS:' as status;

SELECT 
    name,
    CASE 
        WHEN image_url LIKE 'data:image%' THEN '✅ Data URI placeholder'
        WHEN image_url LIKE 'https://%' THEN '✅ External placeholder'
        WHEN image_url IS NULL OR image_url = '' THEN '❌ Still no image'
        ELSE '✅ Custom image'
    END as image_status,
    LENGTH(image_url) as url_length
FROM lats_products
WHERE is_active = true
ORDER BY name;

SELECT '' as blank;

-- ================================================================================
-- STEP 5: UPDATE THE INVENTORY VIEW
-- ================================================================================

-- Update the inventory view to use the new placeholder logic
DROP VIEW IF EXISTS simple_inventory_view;

CREATE VIEW simple_inventory_view AS
SELECT 
    p.id,
    p.name,
    COALESCE(p.description, 'No description available') as description,
    COALESCE(p.sku, 'SKU-' || SUBSTRING(p.id::TEXT, 1, 8)) as sku,
    COALESCE(c.name, 'Uncategorized') as category,
    COALESCE(s.name, 'No Supplier') as supplier,
    p.unit_price,
    p.cost_price,
    p.stock_quantity,
    CASE 
        WHEN p.stock_quantity <= 0 THEN 'out-of-stock'
        WHEN p.stock_quantity <= p.min_stock_level THEN 'low-stock'
        ELSE 'in-stock'
    END as status,
    -- Use the actual image_url from the database, or fallback to data URI
    COALESCE(
        p.image_url, 
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
    ) as image_url,
    p.brand,
    p.model,
    p.condition,
    (SELECT COUNT(*) FROM lats_product_variants v WHERE v.product_id = p.id AND v.is_active = true) as variant_count,
    p.created_at,
    p.updated_at
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
WHERE p.is_active = true;

SELECT '✅ Updated inventory view with proper placeholder logic' as result;

-- ================================================================================
-- STEP 6: UPDATE THE JSON FUNCTION
-- ================================================================================

-- Update the JSON function to use the new view
DROP FUNCTION IF EXISTS get_inventory_json();

CREATE OR REPLACE FUNCTION get_inventory_json()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'id', id,
                'name', name,
                'description', description,
                'sku', sku,
                'category', category,
                'supplier', supplier,
                'price', unit_price,
                'costPrice', cost_price,
                'stock', stock_quantity,
                'status', status,
                'imageUrl', image_url,
                'brand', brand,
                'model', model,
                'condition', condition,
                'variantCount', variant_count,
                'createdAt', created_at,
                'updatedAt', updated_at
            )
        )
        FROM simple_inventory_view
    );
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Updated JSON function with proper image URLs' as result;

-- ================================================================================
-- STEP 7: TEST THE FIX
-- ================================================================================

SELECT '🧪 TESTING IMAGE URLS:' as test_status;

-- Test the view
SELECT 
    name,
    CASE 
        WHEN image_url LIKE 'data:image%' THEN '✅ Data URI (will work)'
        WHEN image_url LIKE 'https://%' THEN '✅ External URL (will work)'
        ELSE '❌ Problem'
    END as image_test,
    LENGTH(image_url) as url_length
FROM simple_inventory_view
ORDER BY name;

SELECT '' as blank;

-- Test the JSON function
SELECT '🧪 Testing JSON function...' as json_test;
SELECT LEFT(get_inventory_json()::TEXT, 200) || '...' as json_preview;

SELECT '' as blank;

COMMIT;

-- ================================================================================
-- FINAL MESSAGE
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ PLACEHOLDER IMAGE FIX COMPLETE!' as message;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 What was fixed:' as summary;
SELECT '   1. ✅ Updated all products with working placeholder images' as fix1;
SELECT '   2. ✅ Used data URI for immediate functionality' as fix2;
SELECT '   3. ✅ Updated inventory view and JSON function' as fix3;
SELECT '   4. ✅ No more 404 errors for placeholder images' as fix4;

SELECT '' as blank;

SELECT '🔧 How it works:' as how_it_works;
SELECT '   • Data URI creates a simple gray placeholder with "No Image" text' as method1;
SELECT '   • Works immediately without needing external files' as method2;
SELECT '   • All products now have valid image URLs' as method3;

SELECT '' as blank;

SELECT '📝 Next steps:' as next_steps;
SELECT '   1. Clear browser cache and reload your inventory page' as step1;
SELECT '   2. The 404 error should be gone' as step2;
SELECT '   3. You can replace with real images later' as step3;

SELECT '' as blank;
SELECT '🎉 No more image 404 errors!' as done;
