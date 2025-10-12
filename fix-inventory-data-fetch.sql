-- ================================================================================
-- FIX INVENTORY DATA FETCH - Ensure UI Shows Real Database Data
-- ================================================================================
-- This script fixes the data fetching issues so your inventory page shows
-- the actual data from the database instead of placeholder values
-- ================================================================================

BEGIN;

-- ================================================================================
-- STEP 1: DIAGNOSTIC - Check Current Data vs What Should Be Displayed
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔍 CURRENT DATA VS UI DISPLAY MISMATCH' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Show what the UI should be displaying
SELECT 
    '📦 PRODUCTS WITH REAL DATA (What UI Should Show):' as section;

SELECT 
    p.name as product_name,
    p.sku as product_sku,
    p.unit_price as product_price,
    p.stock_quantity as product_stock,
    c.name as category,
    s.name as supplier,
    COUNT(v.id) as variant_count,
    SUM(v.quantity) as total_variant_stock,
    SUM(v.unit_price * v.quantity) as total_value
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
LEFT JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.sku, p.unit_price, p.stock_quantity, c.name, s.name
ORDER BY p.name;

SELECT '' as blank;

-- ================================================================================
-- STEP 2: FIX DATA INCONSISTENCIES
-- ================================================================================

SELECT '🔧 FIXING DATA INCONSISTENCIES...' as status;

-- Fix 1: Ensure product stock_quantity matches sum of variant quantities
UPDATE lats_products p
SET 
    stock_quantity = COALESCE(
        (SELECT SUM(v.quantity) FROM lats_product_variants v WHERE v.product_id = p.id),
        0
    ),
    updated_at = NOW()
WHERE p.is_active = true;

SELECT '✅ Synced product stock quantities with variants' as result;

-- Fix 2: Ensure product unit_price matches primary variant price (if variants exist)
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

SELECT '✅ Synced product prices with primary variants' as result;

-- Fix 3: Ensure product cost_price matches primary variant cost_price
UPDATE lats_products p
SET 
    cost_price = COALESCE(
        (SELECT v.cost_price FROM lats_product_variants v 
         WHERE v.product_id = p.id AND v.is_active = true 
         ORDER BY v.created_at ASC LIMIT 1),
        p.cost_price
    ),
    updated_at = NOW()
WHERE p.is_active = true
  AND EXISTS (SELECT 1 FROM lats_product_variants v WHERE v.product_id = p.id);

SELECT '✅ Synced product cost prices with primary variants' as result;

-- Fix 4: Calculate total_value for products
UPDATE lats_products p
SET 
    total_value = COALESCE(
        (SELECT SUM(v.unit_price * v.quantity) FROM lats_product_variants v WHERE v.product_id = p.id),
        p.unit_price * p.stock_quantity
    ),
    updated_at = NOW()
WHERE p.is_active = true;

SELECT '✅ Calculated total values for products' as result;

-- Fix 5: Calculate total_quantity for products
UPDATE lats_products p
SET 
    total_quantity = COALESCE(
        (SELECT SUM(v.quantity) FROM lats_product_variants v WHERE v.product_id = p.id),
        p.stock_quantity
    ),
    updated_at = NOW()
WHERE p.is_active = true;

SELECT '✅ Calculated total quantities for products' as result;

-- ================================================================================
-- STEP 3: ENSURE PROPER SKU GENERATION
-- ================================================================================

-- Fix 6: Generate SKUs for products that don't have them
UPDATE lats_products
SET 
    sku = UPPER(REPLACE(SUBSTRING(name, 1, 8), ' ', '-')) || '-' || SUBSTRING(id::TEXT, 1, 8),
    updated_at = NOW()
WHERE (sku IS NULL OR sku = '') AND is_active = true;

SELECT '✅ Generated missing SKUs' as result;

-- Fix 7: Generate SKUs for variants that don't have them
UPDATE lats_product_variants v
SET 
    sku = COALESCE(
        v.sku,
        (SELECT p.sku FROM lats_products p WHERE p.id = v.product_id) || '-' || 
        UPPER(REPLACE(SUBSTRING(v.name, 1, 6), ' ', '')) || '-' || 
        SUBSTRING(v.id::TEXT, 1, 6)
    ),
    updated_at = NOW()
WHERE (v.sku IS NULL OR v.sku = '') AND v.is_active = true;

SELECT '✅ Generated missing variant SKUs' as result;

-- ================================================================================
-- STEP 4: CREATE PROPER VIEW FOR INVENTORY DISPLAY
-- ================================================================================

-- Create or replace a view that provides all the data the inventory page needs
CREATE OR REPLACE VIEW inventory_display_view AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.description,
    COALESCE(p.sku, 'SKU-' || SUBSTRING(p.id::TEXT, 1, 8)) as product_sku,
    p.unit_price as product_price,
    p.cost_price as product_cost,
    p.stock_quantity as product_stock,
    p.min_stock_level,
    p.max_stock_level,
    p.is_active as product_active,
    p.image_url,
    p.brand,
    p.model,
    p.condition,
    p.selling_price,
    p.total_quantity,
    p.total_value,
    
    -- Category information
    c.id as category_id,
    c.name as category_name,
    c.description as category_description,
    
    -- Supplier information
    s.id as supplier_id,
    s.name as supplier_name,
    s.contact_person as supplier_contact,
    s.email as supplier_email,
    s.phone as supplier_phone,
    
    -- Variant summary
    COUNT(v.id) as variant_count,
    COALESCE(SUM(v.quantity), 0) as total_variant_stock,
    COALESCE(SUM(v.unit_price * v.quantity), 0) as total_variant_value,
    COALESCE(AVG(v.unit_price), p.unit_price) as avg_variant_price,
    
    -- Stock status
    CASE 
        WHEN p.stock_quantity <= 0 THEN 'out-of-stock'
        WHEN p.stock_quantity <= p.min_stock_level THEN 'low-stock'
        ELSE 'in-stock'
    END as stock_status,
    
    -- Pricing status
    CASE 
        WHEN p.unit_price > 0 THEN 'priced'
        ELSE 'unpriced'
    END as pricing_status,
    
    -- Timestamps
    p.created_at,
    p.updated_at
    
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY 
    p.id, p.name, p.description, p.sku, p.unit_price, p.cost_price, 
    p.stock_quantity, p.min_stock_level, p.max_stock_level, p.is_active,
    p.image_url, p.brand, p.model, p.condition, p.selling_price,
    p.total_quantity, p.total_value, p.created_at, p.updated_at,
    c.id, c.name, c.description,
    s.id, s.name, s.contact_person, s.email, s.phone;

SELECT '✅ Created inventory_display_view for proper data fetching' as result;

-- ================================================================================
-- STEP 5: CREATE FUNCTION FOR INVENTORY DATA FETCH
-- ================================================================================

-- Create a function that returns properly formatted inventory data
CREATE OR REPLACE FUNCTION get_inventory_data()
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    description TEXT,
    sku TEXT,
    category_name TEXT,
    supplier_name TEXT,
    unit_price NUMERIC,
    cost_price NUMERIC,
    stock_quantity INTEGER,
    stock_status TEXT,
    variant_count INTEGER,
    total_value NUMERIC,
    image_url TEXT,
    brand TEXT,
    model TEXT,
    condition TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        idv.product_id,
        idv.product_name,
        COALESCE(idv.description, 'No description available') as description,
        idv.product_sku as sku,
        COALESCE(idv.category_name, 'Uncategorized') as category_name,
        COALESCE(idv.supplier_name, 'No Supplier') as supplier_name,
        idv.product_price as unit_price,
        idv.product_cost as cost_price,
        idv.product_stock as stock_quantity,
        idv.stock_status,
        idv.variant_count,
        idv.total_variant_value as total_value,
        COALESCE(idv.image_url, '/placeholder-product.png') as image_url,
        COALESCE(idv.brand, '') as brand,
        COALESCE(idv.model, '') as model,
        COALESCE(idv.condition, 'new') as condition,
        idv.created_at,
        idv.updated_at
    FROM inventory_display_view idv
    ORDER BY idv.product_name;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Created get_inventory_data() function' as result;

-- ================================================================================
-- STEP 6: VERIFICATION - Show What Should Be Displayed
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ VERIFICATION - DATA THAT SHOULD BE DISPLAYED' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Test the function
SELECT 
    product_name,
    sku,
    category_name,
    supplier_name,
    unit_price,
    stock_quantity,
    stock_status,
    variant_count
FROM get_inventory_data()
ORDER BY product_name;

SELECT '' as blank;

-- Show summary statistics
SELECT 
    '📊 INVENTORY SUMMARY' as section,
    COUNT(*) as total_products,
    SUM(stock_quantity) as total_stock,
    SUM(total_value) as total_value,
    COUNT(CASE WHEN stock_status = 'in-stock' THEN 1 END) as in_stock,
    COUNT(CASE WHEN stock_status = 'low-stock' THEN 1 END) as low_stock,
    COUNT(CASE WHEN stock_status = 'out-of-stock' THEN 1 END) as out_of_stock
FROM get_inventory_data();

SELECT '' as blank;

-- Show pricing summary
SELECT 
    '💰 PRICING SUMMARY' as section,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as products_with_prices,
    COUNT(CASE WHEN unit_price = 0 THEN 1 END) as products_without_prices,
    ROUND(AVG(unit_price), 2) as average_price,
    MIN(unit_price) as min_price,
    MAX(unit_price) as max_price
FROM get_inventory_data();

SELECT '' as blank;

-- ================================================================================
-- STEP 7: CREATE RPC FUNCTION FOR FRONTEND
-- ================================================================================

-- Create an RPC function that the frontend can call
CREATE OR REPLACE FUNCTION fetch_inventory_for_ui()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', product_id,
            'name', product_name,
            'description', description,
            'sku', sku,
            'category', category_name,
            'supplier', supplier_name,
            'price', unit_price,
            'costPrice', cost_price,
            'stock', stock_quantity,
            'status', stock_status,
            'variantCount', variant_count,
            'totalValue', total_value,
            'imageUrl', image_url,
            'brand', brand,
            'model', model,
            'condition', condition,
            'createdAt', created_at,
            'updatedAt', updated_at
        )
    ) INTO result
    FROM get_inventory_data();
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Created fetch_inventory_for_ui() RPC function' as result;

-- Test the RPC function
SELECT '🧪 Testing RPC function...' as test_status;
SELECT fetch_inventory_for_ui();

SELECT '' as blank;

COMMIT;

-- ================================================================================
-- FINAL MESSAGE
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ INVENTORY DATA FETCH FIX COMPLETE!' as message;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 What was fixed:' as summary;
SELECT '   1. ✅ Synced product stock with variant totals' as fix1;
SELECT '   2. ✅ Synced product prices with variant prices' as fix2;
SELECT '   3. ✅ Generated missing SKUs' as fix3;
SELECT '   4. ✅ Created inventory_display_view' as fix4;
SELECT '   5. ✅ Created get_inventory_data() function' as fix5;
SELECT '   6. ✅ Created fetch_inventory_for_ui() RPC function' as fix6;

SELECT '' as blank;

SELECT '🔧 Frontend Integration:' as integration;
SELECT '   Your frontend should now call: fetch_inventory_for_ui()' as rpc_call;
SELECT '   This will return properly formatted JSON with all product data' as rpc_result;

SELECT '' as blank;

SELECT '📝 Next Steps:' as next_steps;
SELECT '   1. Update your frontend to call fetch_inventory_for_ui()' as step1;
SELECT '   2. Clear browser cache and reload inventory page' as step2;
SELECT '   3. Verify all products show correct data' as step3;

SELECT '' as blank;
SELECT '🎉 Your inventory should now display real data from the database!' as done;
