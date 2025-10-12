-- ============================================================================
-- CHECK PRODUCT IMAGES - Quick Diagnostic Script
-- ============================================================================
-- This script helps you verify that product images are being saved correctly
-- Run this after creating a product with images

-- 1. Check if product_images table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'product_images'
) AS product_images_table_exists;

-- 2. Count total product images in the database
SELECT 
    COUNT(*) as total_images,
    COUNT(DISTINCT product_id) as products_with_images
FROM product_images;

-- 3. List recent products with their images (last 10)
SELECT 
    p.id,
    p.name,
    p.sku,
    p.created_at,
    COUNT(pi.id) as image_count
FROM lats_products p
LEFT JOIN product_images pi ON pi.product_id = p.id
GROUP BY p.id, p.name, p.sku, p.created_at
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Show detailed image information for the most recent product
WITH latest_product AS (
    SELECT id, name 
    FROM lats_products 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    lp.name as product_name,
    pi.file_name,
    pi.is_primary,
    SUBSTRING(pi.image_url, 1, 60) || '...' as image_url_preview,
    SUBSTRING(pi.thumbnail_url, 1, 60) || '...' as thumbnail_url_preview,
    pi.file_size,
    pi.created_at
FROM latest_product lp
LEFT JOIN product_images pi ON pi.product_id = lp.id
ORDER BY pi.is_primary DESC, pi.created_at ASC;

-- 5. Check for products WITHOUT images
SELECT 
    p.id,
    p.name,
    p.sku,
    p.created_at
FROM lats_products p
LEFT JOIN product_images pi ON pi.product_id = p.id
WHERE pi.id IS NULL
ORDER BY p.created_at DESC
LIMIT 5;

-- 6. Verify RLS is disabled (should return 'f' or 'false')
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'product_images';

