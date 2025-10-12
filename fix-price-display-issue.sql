-- ================================================================================
-- FIX PRICE DISPLAY ISSUE
-- ================================================================================
-- This script specifically fixes the price display issue in your inventory
-- ================================================================================

BEGIN;

-- ================================================================================
-- STEP 1: CHECK CURRENT PRICE DATA
-- ================================================================================

SELECT '🔍 CHECKING CURRENT PRICE DATA...' as status;

SELECT 
    name,
    unit_price,
    cost_price,
    selling_price,
    stock_quantity,
    CASE 
        WHEN unit_price IS NULL THEN '❌ NULL'
        WHEN unit_price = 0 THEN '⚠️  ZERO'
        ELSE '✅ OK'
    END as price_status
FROM lats_products
WHERE is_active = true
ORDER BY name;

SELECT '' as blank;

-- ================================================================================
-- STEP 2: CHECK VARIANT PRICES
-- ================================================================================

SELECT '🔍 CHECKING VARIANT PRICES...' as status;

SELECT 
    p.name as product_name,
    v.name as variant_name,
    v.unit_price as variant_unit_price,
    v.cost_price as variant_cost_price,
    v.selling_price as variant_selling_price,
    v.quantity as variant_stock
FROM lats_products p
JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.is_active = true AND v.is_active = true
ORDER BY p.name, v.name;

SELECT '' as blank;

-- ================================================================================
-- STEP 3: FIX PRICE ISSUES
-- ================================================================================

SELECT '🔧 FIXING PRICE ISSUES...' as status;

-- Fix 1: Update product prices from variants
UPDATE lats_products p
SET 
    unit_price = COALESCE(
        (SELECT v.unit_price FROM lats_product_variants v 
         WHERE v.product_id = p.id AND v.is_active = true 
         AND v.unit_price > 0
         ORDER BY v.unit_price DESC LIMIT 1),
        p.unit_price
    ),
    cost_price = COALESCE(
        (SELECT v.cost_price FROM lats_product_variants v 
         WHERE v.product_id = p.id AND v.is_active = true 
         AND v.cost_price > 0
         ORDER BY v.cost_price DESC LIMIT 1),
        p.cost_price
    ),
    updated_at = NOW()
WHERE p.is_active = true;

SELECT '✅ Updated product prices from variants' as result;

-- Fix 2: Ensure selling_price column exists and is populated
DO $$
BEGIN
    -- Add selling_price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'selling_price'
    ) THEN
        ALTER TABLE lats_products ADD COLUMN selling_price NUMERIC DEFAULT 0;
    END IF;
    
    -- Populate selling_price from unit_price
    UPDATE lats_products 
    SET selling_price = COALESCE(unit_price, 0)
    WHERE selling_price IS NULL OR selling_price = 0;
    
    RAISE NOTICE '✅ selling_price column ensured and populated';
END $$;

-- Fix 3: Update variants with proper selling_price
UPDATE lats_product_variants
SET 
    selling_price = COALESCE(selling_price, unit_price, 0),
    updated_at = NOW()
WHERE is_active = true;

SELECT '✅ Updated variant selling prices' as result;

-- ================================================================================
-- STEP 4: CREATE PRICE-FOCUSED INVENTORY VIEW
-- ================================================================================

SELECT '📊 CREATING PRICE-FOCUSED INVENTORY VIEW...' as status;

-- Drop and recreate with price focus
DROP VIEW IF EXISTS simple_inventory_view;

CREATE VIEW simple_inventory_view AS
SELECT 
    p.id,
    p.name,
    COALESCE(p.description, 'No description available') as description,
    COALESCE(p.sku, 'SKU-' || SUBSTRING(p.id::TEXT, 1, 8)) as sku,
    COALESCE(c.name, 'Uncategorized') as category,
    COALESCE(s.name, 'No Supplier') as supplier,
    -- Price fields with fallbacks
    COALESCE(p.unit_price, 0) as unit_price,
    COALESCE(p.cost_price, 0) as cost_price,
    COALESCE(p.selling_price, p.unit_price, 0) as selling_price,
    p.stock_quantity,
    CASE 
        WHEN p.stock_quantity <= 0 THEN 'out-of-stock'
        WHEN p.stock_quantity <= p.min_stock_level THEN 'low-stock'
        ELSE 'in-stock'
    END as status,
    COALESCE(
        p.image_url, 
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
    ) as image_url,
    p.brand,
    p.model,
    p.condition,
    (SELECT COUNT(*) FROM lats_product_variants v WHERE v.product_id = p.id AND v.is_active = true) as variant_count,
    -- Add variant details with prices
    (SELECT json_agg(
        json_build_object(
            'id', v.id,
            'name', v.name,
            'sku', v.sku,
            'unitPrice', COALESCE(v.unit_price, 0),
            'costPrice', COALESCE(v.cost_price, 0),
            'sellingPrice', COALESCE(v.selling_price, v.unit_price, 0),
            'stock', COALESCE(v.quantity, 0),
            'isActive', v.is_active
        )
    ) FROM lats_product_variants v WHERE v.product_id = p.id AND v.is_active = true) as variants,
    p.created_at,
    p.updated_at
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
WHERE p.is_active = true;

SELECT '✅ Created price-focused inventory view' as result;

-- ================================================================================
-- STEP 5: CREATE PRICE-FOCUSED JSON FUNCTION
-- ================================================================================

SELECT '🔧 CREATING PRICE-FOCUSED JSON FUNCTION...' as status;

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
                'sellingPrice', selling_price,
                'stock', stock_quantity,
                'status', status,
                'imageUrl', image_url,
                'brand', brand,
                'model', model,
                'condition', condition,
                'variantCount', variant_count,
                'variants', variants,
                'createdAt', created_at,
                'updatedAt', updated_at
            )
        )
        FROM simple_inventory_view
    );
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Created price-focused JSON function' as result;

-- ================================================================================
-- STEP 6: TEST PRICE DISPLAY
-- ================================================================================

SELECT '🧪 TESTING PRICE DISPLAY...' as status;

-- Test the view with price focus
SELECT 
    name,
    unit_price,
    cost_price,
    selling_price,
    stock_quantity,
    status,
    variant_count
FROM simple_inventory_view
ORDER BY name;

SELECT '' as blank;

-- Test the JSON function
SELECT 'JSON function test (first 200 chars):' as test_type;
SELECT LEFT(get_inventory_json()::TEXT, 200) || '...' as json_preview;

SELECT '' as blank;

-- ================================================================================
-- STEP 7: CREATE PRICE DEBUG FUNCTION
-- ================================================================================

SELECT '🔧 CREATING PRICE DEBUG FUNCTION...' as status;

CREATE OR REPLACE FUNCTION debug_prices()
RETURNS TABLE (
    product_name TEXT,
    product_unit_price NUMERIC,
    product_cost_price NUMERIC,
    product_selling_price NUMERIC,
    variant_count BIGINT,
    variant_prices TEXT,
    price_source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name,
        p.unit_price,
        p.cost_price,
        p.selling_price,
        COUNT(v.id) as variant_count,
        STRING_AGG(
            v.name || ': ' || COALESCE(v.unit_price::TEXT, 'NULL') || 
            ' (cost: ' || COALESCE(v.cost_price::TEXT, 'NULL') || ')',
            ', '
        ) as variant_prices,
        CASE 
            WHEN p.unit_price > 0 THEN 'Product has price'
            WHEN COUNT(v.id) > 0 AND MAX(v.unit_price) > 0 THEN 'Price from variants'
            ELSE 'No price found'
        END as price_source
    FROM lats_products p
    LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.unit_price, p.cost_price, p.selling_price
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Created price debug function' as result;

-- Test the debug function
SELECT '🔍 PRICE DEBUG RESULTS:' as debug_title;
SELECT * FROM debug_prices();

SELECT '' as blank;

COMMIT;

-- ================================================================================
-- FINAL MESSAGE
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ PRICE DISPLAY FIX COMPLETE!' as message;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 What was fixed:' as summary;
SELECT '   1. ✅ Product prices updated from variants' as fix1;
SELECT '   2. ✅ selling_price column ensured and populated' as fix2;
SELECT '   3. ✅ Variant selling prices updated' as fix3;
SELECT '   4. ✅ Price-focused inventory view created' as fix4;
SELECT '   5. ✅ Price-focused JSON function created' as fix5;
SELECT '   6. ✅ Price debug function created' as fix6;

SELECT '' as blank;

SELECT '🔧 Next steps:' as next_steps;
SELECT '   1. Test the JSON function: SELECT get_inventory_json();' as step1;
SELECT '   2. Debug prices: SELECT * FROM debug_prices();' as step2;
SELECT '   3. Update your frontend to use the new JSON function' as step3;
SELECT '   4. Check browser console for price data' as step4;

SELECT '' as blank;
SELECT '🎉 Prices should now display correctly!' as done;
