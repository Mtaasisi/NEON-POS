-- Sync Product Images from lats_products to product_images table
-- This ensures all products with image_url in lats_products also have entries in product_images

-- Step 1: Insert missing images into product_images
INSERT INTO product_images (
    product_id, 
    image_url, 
    is_primary, 
    file_name,
    file_size,
    uploaded_by,
    created_at,
    updated_at
)
SELECT 
    p.id,
    p.image_url,
    true, -- Set as primary image
    COALESCE(
        -- Extract filename from URL
        SUBSTRING(p.image_url FROM '[^/]+$'),
        'product-image.jpg'
    ) as file_name,
    0 as file_size, -- Unknown size
    NULL as uploaded_by,
    NOW() as created_at,
    NOW() as updated_at
FROM lats_products p
WHERE p.image_url IS NOT NULL 
  AND p.image_url != ''
  AND p.is_active = true
  -- Only insert if no primary image exists for this product
  AND NOT EXISTS (
    SELECT 1 
    FROM product_images pi 
    WHERE pi.product_id = p.id 
    AND pi.is_primary = true
  );

-- Step 2: Verify the sync
SELECT 
    'Products with images synced' as status,
    COUNT(*) as count
FROM product_images
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- Step 3: Show products that now have images
SELECT 
    p.name,
    p.sku,
    pi.image_url,
    pi.is_primary
FROM lats_products p
JOIN product_images pi ON pi.product_id = p.id
WHERE p.is_active = true
  AND pi.is_primary = true
ORDER BY p.name
LIMIT 20;

-- Step 4: Check Dell Curved specifically
SELECT 
    'Dell Curved Image Status' as check_type,
    p.name,
    p.image_url as lats_products_image,
    pi.image_url as product_images_image,
    pi.is_primary
FROM lats_products p
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
WHERE LOWER(p.name) LIKE '%dell%curved%'
   OR LOWER(p.name) LIKE '%dell curved%';

