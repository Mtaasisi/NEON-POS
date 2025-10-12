-- ============================================================================
-- CHECK PRODUCT IMAGES IN DATABASE
-- ============================================================================

-- 1. Check if product_images table exists and has data
SELECT 
    COUNT(*) as total_product_images,
    COUNT(DISTINCT product_id) as products_with_images
FROM product_images;

-- 2. Sample product images
SELECT 
    id,
    product_id,
    image_url,
    thumbnail_url,
    is_primary,
    created_at
FROM product_images
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check products table for images column
SELECT 
    id,
    name,
    images,
    thumbnail_url,
    created_at
FROM lats_products
WHERE images IS NOT NULL 
   OR thumbnail_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 4. Compare: Products with images column vs product_images table
SELECT 
    'Products with images column' as type,
    COUNT(*) as count
FROM lats_products
WHERE images IS NOT NULL AND jsonb_array_length(images) > 0

UNION ALL

SELECT 
    'Products with product_images records' as type,
    COUNT(DISTINCT product_id) as count
FROM product_images;

-- 5. Find products missing in product_images table
SELECT 
    p.id,
    p.name,
    p.images,
    p.thumbnail_url
FROM lats_products p
WHERE (p.images IS NOT NULL AND jsonb_array_length(p.images) > 0)
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
  )
LIMIT 10;

-- 6. Check for broken or invalid image URLs
SELECT 
    product_id,
    image_url,
    thumbnail_url,
    CASE 
        WHEN image_url IS NULL THEN 'Missing image_url'
        WHEN image_url = '' THEN 'Empty image_url'
        WHEN NOT image_url ~ '^https?://' THEN 'Invalid URL format'
        ELSE 'OK'
    END as image_status
FROM product_images
WHERE image_url IS NULL 
   OR image_url = '' 
   OR NOT image_url ~ '^https?://'
LIMIT 10;

