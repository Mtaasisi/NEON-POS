-- ================================================================================
-- SIMPLE INVENTORY DISPLAY FIX
-- ================================================================================
-- This script creates a simple, reliable way to fetch inventory data
-- that matches what your UI should display
-- ================================================================================

BEGIN;

-- ================================================================================
-- STEP 1: SYNC DATA BETWEEN PRODUCTS AND VARIANTS
-- ================================================================================

SELECT '🔧 Syncing product data with variants...' as status;

-- Update product stock to match variant totals
UPDATE lats_products p
SET 
    stock_quantity = COALESCE(
        (SELECT SUM(v.quantity) FROM lats_product_variants v WHERE v.product_id = p.id AND v.is_active = true),
        0
    ),
    updated_at = NOW()
WHERE p.is_active = true;

-- Update product prices to match primary variant
UPDATE lats_products p
SET 
    unit_price = COALESCE(
        (SELECT v.unit_price FROM lats_product_variants v 
         WHERE v.product_id = p.id AND v.is_active = true 
         ORDER BY v.created_at ASC LIMIT 1),
        p.unit_price
    ),
    cost_price = COALESCE(
        (SELECT v.cost_price FROM lats_product_variants v 
         WHERE v.product_id = p.id AND v.is_active = true 
         ORDER BY v.created_at ASC LIMIT 1),
        p.cost_price
    ),
    updated_at = NOW()
WHERE p.is_active = true
  AND EXISTS (SELECT 1 FROM lats_product_variants v WHERE v.product_id = p.id);

-- Generate missing SKUs
UPDATE lats_products
SET 
    sku = UPPER(REPLACE(SUBSTRING(name, 1, 8), ' ', '-')) || '-' || SUBSTRING(id::TEXT, 1, 8),
    updated_at = NOW()
WHERE (sku IS NULL OR sku = '') AND is_active = true;

SELECT '✅ Data sync complete' as result;

-- ================================================================================
-- STEP 2: CREATE SIMPLE INVENTORY QUERY
-- ================================================================================

-- Create a simple view for inventory display
CREATE OR REPLACE VIEW simple_inventory_view AS
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
    COALESCE(p.image_url, '/placeholder-product.png') as image_url,
    p.brand,
    p.model,
    p.condition,
    COUNT(v.id) as variant_count,
    p.created_at,
    p.updated_at
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name, p.description, p.sku, p.unit_price, p.cost_price, 
         p.stock_quantity, p.min_stock_level, p.image_url, p.brand, p.model, 
         p.condition, p.created_at, p.updated_at, c.name, s.name;

SELECT '✅ Created simple_inventory_view' as result;

-- ================================================================================
-- STEP 3: CREATE RPC FUNCTION FOR FRONTEND
-- ================================================================================

-- Create a simple RPC function that returns JSON
CREATE OR REPLACE FUNCTION get_inventory_json()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
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
    ) INTO result
    FROM simple_inventory_view
    ORDER BY name;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Created get_inventory_json() function' as result;

-- ================================================================================
-- STEP 4: TEST THE FUNCTION
-- ================================================================================

SELECT '🧪 Testing inventory data fetch...' as test_status;

-- Test the view
SELECT 
    name,
    sku,
    category,
    supplier,
    unit_price,
    stock_quantity,
    status,
    variant_count
FROM simple_inventory_view
ORDER BY name;

SELECT '' as blank;

-- Test the JSON function
SELECT '📄 JSON Output (first 500 chars):' as json_test;
SELECT LEFT(get_inventory_json()::TEXT, 500) || '...' as json_preview;

SELECT '' as blank;

-- ================================================================================
-- STEP 5: CREATE SUMMARY STATISTICS
-- ================================================================================

SELECT '📊 INVENTORY SUMMARY:' as summary_title;

SELECT 
    COUNT(*) as total_products,
    SUM(stock_quantity) as total_stock,
    COUNT(CASE WHEN status = 'in-stock' THEN 1 END) as in_stock,
    COUNT(CASE WHEN status = 'low-stock' THEN 1 END) as low_stock,
    COUNT(CASE WHEN status = 'out-of-stock' THEN 1 END) as out_of_stock,
    ROUND(AVG(unit_price), 2) as avg_price,
    SUM(unit_price * stock_quantity) as total_value
FROM simple_inventory_view;

SELECT '' as blank;

-- Show products by category
SELECT '📂 PRODUCTS BY CATEGORY:' as category_title;
SELECT 
    category,
    COUNT(*) as product_count,
    SUM(stock_quantity) as total_stock,
    ROUND(AVG(unit_price), 2) as avg_price
FROM simple_inventory_view
GROUP BY category
ORDER BY product_count DESC;

SELECT '' as blank;

-- Show products by supplier
SELECT '🏢 PRODUCTS BY SUPPLIER:' as supplier_title;
SELECT 
    supplier,
    COUNT(*) as product_count,
    SUM(stock_quantity) as total_stock,
    ROUND(AVG(unit_price), 2) as avg_price
FROM simple_inventory_view
GROUP BY supplier
ORDER BY product_count DESC;

SELECT '' as blank;

COMMIT;

-- ================================================================================
-- FINAL MESSAGE
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ INVENTORY DISPLAY FIX COMPLETE!' as message;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 What was created:' as summary;
SELECT '   1. ✅ simple_inventory_view - Clean view of all product data' as item1;
SELECT '   2. ✅ get_inventory_json() - RPC function for frontend' as item2;
SELECT '   3. ✅ Data synced between products and variants' as item3;

SELECT '' as blank;

SELECT '🔧 For your frontend:' as frontend_instructions;
SELECT '   Call: SELECT get_inventory_json();' as rpc_call;
SELECT '   This returns properly formatted JSON with all product data' as rpc_result;

SELECT '' as blank;

SELECT '📝 Next steps:' as next_steps;
SELECT '   1. Update your frontend to use get_inventory_json()' as step1;
SELECT '   2. Clear browser cache and reload' as step2;
SELECT '   3. Your inventory should now show real data!' as step3;

SELECT '' as blank;
SELECT '🎉 Ready to test!' as done;
