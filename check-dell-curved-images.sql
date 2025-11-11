-- Check Dell Curved product and its images

-- 1. Find Dell Curved product
SELECT 
    id, 
    name, 
    sku, 
    image_url,
    branch_id,
    is_active
FROM lats_products 
WHERE LOWER(name) LIKE '%dell%curved%' 
OR LOWER(name) LIKE '%dell curved%'
OR sku LIKE '%DELL%'
LIMIT 5;

-- 2. Check if Dell Curved has images in product_images table
SELECT 
    pi.id,
    pi.product_id,
    pi.image_url,
    pi.is_primary,
    p.name as product_name
FROM product_images pi
JOIN lats_products p ON p.id = pi.product_id
WHERE LOWER(p.name) LIKE '%dell%curved%'
OR LOWER(p.name) LIKE '%dell curved%';

-- 3. Count products with images in product_images
SELECT 
    'Products with images in product_images' as description,
    COUNT(DISTINCT product_id) as count
FROM product_images;

-- 4. Count products with image_url in lats_products
SELECT 
    'Products with image_url in lats_products' as description,
    COUNT(*) as count
FROM lats_products 
WHERE image_url IS NOT NULL 
AND image_url != ''
AND is_active = true;

-- 5. Products that have image_url but NOT in product_images
SELECT 
    p.id,
    p.name,
    p.image_url,
    CASE WHEN pi.product_id IS NULL THEN 'Missing from product_images' ELSE 'In product_images' END as status
FROM lats_products p
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
WHERE p.image_url IS NOT NULL 
AND p.image_url != ''
AND p.is_active = true
LIMIT 10;

