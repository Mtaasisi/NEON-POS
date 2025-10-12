-- ================================================================================
-- WORKING INVENTORY SOLUTION
-- ================================================================================
-- This creates a simple, working solution for your inventory display
-- ================================================================================

BEGIN;

-- ================================================================================
-- STEP 1: ENSURE DATA IS PROPERLY SYNCED
-- ================================================================================

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
    updated_at = NOW()
WHERE p.is_active = true
  AND EXISTS (SELECT 1 FROM lats_product_variants v WHERE v.product_id = p.id);

-- Generate missing SKUs
UPDATE lats_products
SET 
    sku = UPPER(REPLACE(SUBSTRING(name, 1, 8), ' ', '-')) || '-' || SUBSTRING(id::TEXT, 1, 8),
    updated_at = NOW()
WHERE (sku IS NULL OR sku = '') AND is_active = true;

-- ================================================================================
-- STEP 2: CREATE WORKING INVENTORY VIEW
-- ================================================================================

-- Drop and recreate the view
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
    COALESCE(p.image_url, '/placeholder-product.png') as image_url,
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

-- ================================================================================
-- STEP 3: CREATE SIMPLE RPC FUNCTION
-- ================================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_inventory_json();

-- Create a simple function that returns JSON
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

-- ================================================================================
-- STEP 4: TEST THE SOLUTION
-- ================================================================================

-- Test the view
SELECT '📦 INVENTORY DATA (What your UI should show):' as test_title;
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
SELECT '🧪 Testing JSON function...' as json_test;
SELECT get_inventory_json();

SELECT '' as blank;

-- ================================================================================
-- STEP 5: CREATE SUMMARY
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

COMMIT;

-- ================================================================================
-- FINAL MESSAGE
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ WORKING INVENTORY SOLUTION COMPLETE!' as message;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 What was created:' as summary;
SELECT '   1. ✅ simple_inventory_view - Clean view of all product data' as item1;
SELECT '   2. ✅ get_inventory_json() - Working RPC function' as item2;
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
