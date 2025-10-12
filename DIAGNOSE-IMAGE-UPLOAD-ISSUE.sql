-- =====================================================
-- DIAGNOSE IMAGE UPLOAD ISSUE
-- =====================================================
-- Run this to identify why images are not uploading

-- Check 1: Does product_images table exist?
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_images'
    ) THEN '✅ product_images table exists'
    ELSE '❌ product_images table MISSING - This is the problem!'
  END AS table_status;

-- Check 2: What columns does the table have?
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'product_images'
ORDER BY ordinal_position;

-- Check 3: Check RLS status
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '⚠️ RLS is ENABLED - May block uploads'
    ELSE '✅ RLS is DISABLED - Good for Neon'
  END AS rls_status
FROM pg_tables
WHERE tablename = 'product_images';

-- Check 4: Count existing images
SELECT 
  COUNT(*) AS total_images,
  COUNT(DISTINCT product_id) AS products_with_images
FROM product_images;

-- Check 5: Check for products
SELECT 
  COUNT(*) AS total_products
FROM lats_products;

-- Check 6: Check for recent upload attempts (if any errors logged)
SELECT 
  p.id,
  p.name,
  COUNT(pi.id) AS image_count,
  MAX(pi.created_at) AS last_image_upload
FROM lats_products p
LEFT JOIN product_images pi ON p.id = pi.product_id
GROUP BY p.id, p.name
ORDER BY last_image_upload DESC NULLS LAST
LIMIT 10;

-- Check 7: Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'product_images'
ORDER BY grantee, privilege_type;

-- Summary Report
SELECT 
  '📊 DIAGNOSTIC SUMMARY' AS report_section,
  CASE 
    WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_images')
    THEN '❌ ISSUE: product_images table does not exist. Run CREATE-PRODUCT-IMAGES-BUCKET.sql'
    
    WHEN EXISTS (
      SELECT FROM pg_tables 
      WHERE tablename = 'product_images' 
      AND rowsecurity = true
    )
    THEN '⚠️ WARNING: RLS is enabled. May need to disable for Neon. Run: ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;'
    
    ELSE '✅ Table exists and looks good. Check Supabase Storage bucket configuration.'
  END AS diagnosis,
  
  COALESCE((SELECT COUNT(*) FROM product_images)::TEXT, '0') || ' images currently stored' AS image_count;

