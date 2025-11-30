-- Verification script for Mobile App Database Connectivity

-- 1. Check lats_products structure
SELECT 'lats_products columns:' as check_type, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lats_products' 
AND column_name IN ('id', 'name', 'sku', 'stock_quantity', 'min_stock_level', 'branch_id', 'is_active', 'category_id', 'description')
ORDER BY column_name;

-- 2. Check lats_sales has discount columns
SELECT 'lats_sales discount columns:' as check_type, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lats_sales' 
AND column_name IN ('discount_amount', 'discount', 'notes', 'total_amount', 'subtotal', 'tax_amount')
ORDER BY column_name;

-- 3. Check customers table structure
SELECT 'customers columns:' as check_type, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('id', 'name', 'phone', 'email', 'city', 'address', 'branch_id', 'notes')
ORDER BY column_name;

-- 4. Check lats_categories exists
SELECT 'lats_categories check:' as check_type, COUNT(*) as category_count 
FROM lats_categories;

-- 5. Sample low stock products
SELECT 'Low stock products:' as check_type, id, name, stock_quantity, min_stock_level
FROM lats_products 
WHERE stock_quantity <= min_stock_level 
AND is_active = true
LIMIT 5;
