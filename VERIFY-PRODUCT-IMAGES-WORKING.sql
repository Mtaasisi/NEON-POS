-- ============================================================================
-- VERIFY PRODUCT IMAGES ARE WORKING - COMPREHENSIVE CHECK
-- ============================================================================
-- This script performs a complete verification of product image functionality
-- Run this to check if images are properly stored and accessible

-- =============================================================================
-- 1. CHECK PRODUCT_IMAGES TABLE EXISTS AND HAS DATA
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '1. CHECKING PRODUCT_IMAGES TABLE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT 
    COUNT(*) as total_images,
    COUNT(DISTINCT product_id) as products_with_images,
    COUNT(*) FILTER (WHERE is_primary = true) as primary_images,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '') as valid_urls,
    COUNT(*) FILTER (WHERE image_url ~ '^https?://') as http_urls
FROM product_images;

-- =============================================================================
-- 2. SHOW SAMPLE PRODUCT IMAGES
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '2. SAMPLE PRODUCT IMAGES (5 most recent)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT 
    pi.id,
    p.name as product_name,
    pi.image_url,
    pi.is_primary,
    LENGTH(pi.image_url) as url_length,
    CASE 
        WHEN pi.image_url ~ '^https?://' THEN '✅ Valid URL'
        WHEN pi.image_url ~ '^data:image' THEN '✅ Base64 Image'
        WHEN pi.image_url ~ '^blob:' THEN '✅ Blob URL'
        ELSE '❌ Invalid URL'
    END as url_type,
    pi.created_at
FROM product_images pi
JOIN lats_products p ON p.id = pi.product_id
ORDER BY pi.created_at DESC
LIMIT 5;

-- =============================================================================
-- 3. CHECK LATS_PRODUCTS.IMAGES COLUMN (OLD STORAGE METHOD)
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '3. CHECKING OLD IMAGES COLUMN IN LATS_PRODUCTS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT 
    COUNT(*) as products_with_images_column,
    COUNT(*) FILTER (WHERE jsonb_array_length(images) > 0) as non_empty_images,
    AVG(jsonb_array_length(images)) as avg_images_per_product
FROM lats_products
WHERE images IS NOT NULL;

-- =============================================================================
-- 4. COMPARE OLD VS NEW IMAGE STORAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '4. COMPARISON: OLD vs NEW IMAGE STORAGE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT 
    'Products with images in lats_products.images' as source,
    COUNT(*) as count
FROM lats_products
WHERE images IS NOT NULL AND jsonb_array_length(images) > 0

UNION ALL

SELECT 
    'Products with images in product_images table' as source,
    COUNT(DISTINCT product_id) as count
FROM product_images

UNION ALL

SELECT 
    'Products with images in BOTH locations' as source,
    COUNT(*) as count
FROM lats_products p
WHERE (p.images IS NOT NULL AND jsonb_array_length(p.images) > 0)
  AND EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)

UNION ALL

SELECT 
    'Products with images ONLY in lats_products (needs migration)' as source,
    COUNT(*) as count
FROM lats_products p
WHERE (p.images IS NOT NULL AND jsonb_array_length(p.images) > 0)
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- =============================================================================
-- 5. FIND PRODUCTS THAT NEED IMAGE MIGRATION
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '5. PRODUCTS NEEDING IMAGE MIGRATION';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT 
    p.id,
    p.name,
    p.sku,
    jsonb_array_length(p.images) as image_count_in_old_column,
    p.images->0 as first_image_url,
    'Needs migration to product_images table' as status
FROM lats_products p
WHERE (p.images IS NOT NULL AND jsonb_array_length(p.images) > 0)
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
  )
ORDER BY p.created_at DESC
LIMIT 10;

-- =============================================================================
-- 6. CHECK FOR BROKEN OR INVALID IMAGE URLs
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '6. CHECKING FOR BROKEN/INVALID IMAGE URLs';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT 
    p.name as product_name,
    pi.image_url,
    CASE 
        WHEN pi.image_url IS NULL THEN '❌ Missing image_url'
        WHEN pi.image_url = '' THEN '❌ Empty image_url'
        WHEN NOT (pi.image_url ~ '^https?://' OR pi.image_url ~ '^data:image' OR pi.image_url ~ '^blob:') 
            THEN '❌ Invalid URL format'
        WHEN LENGTH(pi.image_url) < 10 THEN '❌ Suspiciously short URL'
        ELSE '✅ OK'
    END as status
FROM product_images pi
JOIN lats_products p ON p.id = pi.product_id
WHERE pi.image_url IS NULL 
   OR pi.image_url = '' 
   OR LENGTH(pi.image_url) < 10
   OR NOT (pi.image_url ~ '^https?://' OR pi.image_url ~ '^data:image' OR pi.image_url ~ '^blob:')
LIMIT 10;

-- =============================================================================
-- 7. TEST QUERY - SIMULATE ROBUSTIMAGESERVICE.GETPRODUCTIMAGES()
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '7. SIMULATE FRONTEND IMAGE LOADING (RobustImageService)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- Get a sample product ID to test with
WITH sample_product AS (
    SELECT id, name FROM lats_products LIMIT 1
)
SELECT 
    sp.name as testing_product,
    sp.id as product_id,
    COUNT(pi.*) as images_found,
    CASE 
        WHEN COUNT(pi.*) > 0 THEN '✅ Images will load in ProductCard'
        ELSE '❌ No images - ProductCard will show placeholder'
    END as frontend_status
FROM sample_product sp
LEFT JOIN product_images pi ON pi.product_id = sp.id
GROUP BY sp.id, sp.name;

-- Show the actual images that would be loaded
WITH sample_product AS (
    SELECT id FROM lats_products LIMIT 1
)
SELECT 
    pi.id,
    pi.image_url,
    pi.thumbnail_url,
    pi.is_primary,
    pi.file_name,
    'This image will be displayed by ProductCard' as note
FROM product_images pi
JOIN sample_product sp ON sp.id = pi.product_id
ORDER BY pi.is_primary DESC;

-- =============================================================================
-- 8. FINAL SUMMARY & RECOMMENDATIONS
-- =============================================================================
DO $$
DECLARE
    total_images INTEGER;
    total_products_with_images INTEGER;
    products_needing_migration INTEGER;
    broken_urls INTEGER;
BEGIN
    -- Count totals
    SELECT COUNT(*) INTO total_images FROM product_images;
    SELECT COUNT(DISTINCT product_id) INTO total_products_with_images FROM product_images;
    
    SELECT COUNT(*) INTO products_needing_migration
    FROM lats_products p
    WHERE (p.images IS NOT NULL AND jsonb_array_length(p.images) > 0)
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);
    
    SELECT COUNT(*) INTO broken_urls
    FROM product_images
    WHERE image_url IS NULL 
       OR image_url = '' 
       OR NOT (image_url ~ '^https?://' OR image_url ~ '^data:image' OR image_url ~ '^blob:');
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '8. FINAL SUMMARY';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Total images in product_images table: %', total_images;
    RAISE NOTICE 'Products with images: %', total_products_with_images;
    RAISE NOTICE 'Products needing migration: %', products_needing_migration;
    RAISE NOTICE 'Broken/invalid URLs: %', broken_urls;
    RAISE NOTICE '';
    
    IF total_images = 0 THEN
        RAISE NOTICE '❌ PROBLEM: No images found in product_images table!';
        RAISE NOTICE '   → Run FIX-PRODUCT-IMAGES-TABLE.sql to migrate images';
    ELSIF products_needing_migration > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % products have images in old column but not in product_images table', products_needing_migration;
        RAISE NOTICE '   → Run FIX-PRODUCT-IMAGES-TABLE.sql to complete migration';
    ELSIF broken_urls > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % broken or invalid image URLs found', broken_urls;
        RAISE NOTICE '   → Fix these URLs manually or re-upload images';
    ELSE
        RAISE NOTICE '✅ SUCCESS: Product images are properly configured!';
        RAISE NOTICE '   → ProductCard component should display images correctly';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

