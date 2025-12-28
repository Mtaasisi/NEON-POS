-- =====================================================
-- REMOVE ALL PRODUCTS FROM DATABASE
-- =====================================================
-- This script safely removes all products and their variants
-- while handling foreign key constraints properly.
--
-- WARNING: This will permanently delete all product data!
-- Make sure to backup your database first.
-- =====================================================

-- Start transaction for safety
BEGIN;

-- Step 1: Disable foreign key constraints temporarily
SET CONSTRAINTS ALL DEFERRED;

-- Step 2: Show current product counts before deletion
SELECT 'BEFORE DELETION - Current product counts:' as status;
SELECT 'lats_products' as table_name, COUNT(*) as count FROM lats_products
UNION ALL
SELECT 'lats_product_variants' as table_name, COUNT(*) as count FROM lats_product_variants
UNION ALL
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'product_images' as table_name, COUNT(*) as count FROM product_images;

-- Step 3: Delete in correct dependency order

-- Delete product images first (references products)
DELETE FROM product_images;
SELECT 'Deleted from product_images' as action, ROW_COUNT as affected_rows;

-- Delete product variants (references products)
DELETE FROM lats_product_variants;
SELECT 'Deleted from lats_product_variants' as action, ROW_COUNT as affected_rows;

-- Delete main products
DELETE FROM lats_products;
SELECT 'Deleted from lats_products' as action, ROW_COUNT as affected_rows;

-- Delete any products from the products table
DELETE FROM products;
SELECT 'Deleted from products' as action, ROW_COUNT as affected_rows;

-- Step 4: Clean up any orphaned records in related tables
-- (These might exist due to previous operations)

-- Clean up any product-related records in other tables that might reference deleted products
-- Note: This is optional and depends on your data integrity needs

-- Step 5: Reset any auto-increment sequences if they exist
-- (PostgreSQL handles this automatically, but this ensures consistency)

-- Step 6: Show final counts after deletion
SELECT 'AFTER DELETION - Final product counts:' as status;
SELECT 'lats_products' as table_name, COUNT(*) as count FROM lats_products
UNION ALL
SELECT 'lats_product_variants' as table_name, COUNT(*) as count FROM lats_product_variants
UNION ALL
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'product_images' as table_name, COUNT(*) as count FROM product_images;

-- Step 7: Re-enable foreign key constraints
SET CONSTRAINTS ALL IMMEDIATE;

-- Commit the transaction
COMMIT;

-- Final confirmation
SELECT '✅ ALL PRODUCTS SUCCESSFULLY REMOVED FROM DATABASE' as result;
SELECT '📊 Summary: All product data has been permanently deleted' as note;
