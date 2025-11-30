-- Fix Empty Image URLs in Database
-- This script removes product_images records that have empty or null image URLs

-- First, let's see what we're dealing with
SELECT 
    id,
    product_id,
    file_name,
    LENGTH(image_url) as url_length,
    LENGTH(thumbnail_url) as thumb_length,
    created_at
FROM product_images
WHERE 
    image_url IS NULL 
    OR image_url = '' 
    OR thumbnail_url IS NULL 
    OR thumbnail_url = '';

-- Delete the broken records
-- UNCOMMENT THE FOLLOWING LINES AFTER REVIEWING THE ABOVE RESULTS:

-- DELETE FROM product_images
-- WHERE 
--     image_url IS NULL 
--     OR image_url = '' 
--     OR thumbnail_url IS NULL 
--     OR thumbnail_url = '';

-- Verify deletion
-- SELECT COUNT(*) as remaining_bad_records
-- FROM product_images
-- WHERE 
--     image_url IS NULL 
--     OR image_url = '' 
--     OR thumbnail_url IS NULL 
--     OR thumbnail_url = '';

