-- ═══════════════════════════════════════════════════════════════
-- Large Image Analysis Script
-- Run this in your Neon database to get detailed statistics
-- ═══════════════════════════════════════════════════════════════

-- 1. Summary Statistics
-- ═══════════════════════════════════════════════════════════════
SELECT 
  '📊 SUMMARY' as section,
  COUNT(*) as total_products_with_base64,
  COUNT(CASE WHEN LENGTH(image_url) > 10000 THEN 1 END) as large_images,
  COUNT(CASE WHEN LENGTH(image_url) <= 10000 THEN 1 END) as acceptable_images,
  ROUND(AVG(LENGTH(image_url)) / 1024.0, 2) as avg_size_kb,
  ROUND(MAX(LENGTH(image_url)) / 1024.0, 2) as max_size_kb,
  ROUND(SUM(LENGTH(image_url)) / 1024.0 / 1024.0, 2) as total_size_mb
FROM products
WHERE image_url LIKE 'data:image/%';

-- 2. List of Problematic Products
-- ═══════════════════════════════════════════════════════════════
SELECT 
  '🚨 LARGE IMAGES' as section,
  id,
  name,
  LEFT(image_url, 30) as image_preview,
  LENGTH(image_url) as size_chars,
  ROUND(LENGTH(image_url) / 1024.0, 2) as size_kb,
  CASE 
    WHEN LENGTH(image_url) > 100000 THEN '🔴 Critical (>100KB)'
    WHEN LENGTH(image_url) > 50000 THEN '🟠 High (>50KB)'
    WHEN LENGTH(image_url) > 10000 THEN '🟡 Medium (>10KB)'
    ELSE '🟢 OK'
  END as severity
FROM products
WHERE image_url LIKE 'data:image/%'
  AND LENGTH(image_url) > 10000
ORDER BY LENGTH(image_url) DESC;

-- 3. Size Distribution
-- ═══════════════════════════════════════════════════════════════
SELECT 
  '📈 SIZE DISTRIBUTION' as section,
  CASE 
    WHEN LENGTH(image_url) <= 10000 THEN '0-10KB (OK)'
    WHEN LENGTH(image_url) <= 25000 THEN '10-25KB (Warning)'
    WHEN LENGTH(image_url) <= 50000 THEN '25-50KB (Problem)'
    WHEN LENGTH(image_url) <= 100000 THEN '50-100KB (Critical)'
    ELSE '100KB+ (Severe)'
  END as size_range,
  COUNT(*) as count,
  ROUND(AVG(LENGTH(image_url)) / 1024.0, 2) as avg_kb
FROM products
WHERE image_url LIKE 'data:image/%'
GROUP BY 
  CASE 
    WHEN LENGTH(image_url) <= 10000 THEN '0-10KB (OK)'
    WHEN LENGTH(image_url) <= 25000 THEN '10-25KB (Warning)'
    WHEN LENGTH(image_url) <= 50000 THEN '25-50KB (Problem)'
    WHEN LENGTH(image_url) <= 100000 THEN '50-100KB (Critical)'
    ELSE '100KB+ (Severe)'
  END
ORDER BY avg_kb;

-- 4. Impact Assessment
-- ═══════════════════════════════════════════════════════════════
SELECT 
  '💾 STORAGE IMPACT' as section,
  ROUND(SUM(LENGTH(image_url)) / 1024.0 / 1024.0, 2) as total_base64_mb,
  ROUND(SUM(CASE WHEN LENGTH(image_url) > 10000 THEN LENGTH(image_url) ELSE 0 END) / 1024.0 / 1024.0, 2) as problematic_mb,
  COUNT(CASE WHEN LENGTH(image_url) > 10000 THEN 1 END) as products_to_fix,
  ROUND(
    SUM(CASE WHEN LENGTH(image_url) > 10000 THEN LENGTH(image_url) ELSE 0 END) * 100.0 / 
    NULLIF(SUM(LENGTH(image_url)), 0), 
    2
  ) as percent_problematic
FROM products
WHERE image_url LIKE 'data:image/%';

-- 5. Top 10 Largest Images
-- ═══════════════════════════════════════════════════════════════
SELECT 
  '🔝 TOP 10 LARGEST' as section,
  id,
  name,
  ROUND(LENGTH(image_url) / 1024.0, 2) as size_kb,
  LEFT(image_url, 50) as image_type
FROM products
WHERE image_url LIKE 'data:image/%'
ORDER BY LENGTH(image_url) DESC
LIMIT 10;

-- 6. Recommendation
-- ═══════════════════════════════════════════════════════════════
SELECT 
  '💡 RECOMMENDATION' as section,
  CASE 
    WHEN COUNT(CASE WHEN LENGTH(image_url) > 10000 THEN 1 END) = 0 
      THEN '✅ No action needed - all images are within safe limits'
    WHEN COUNT(CASE WHEN LENGTH(image_url) > 10000 THEN 1 END) <= 5 
      THEN '🟡 Low priority - fix ' || COUNT(CASE WHEN LENGTH(image_url) > 10000 THEN 1 END) || ' products manually'
    WHEN COUNT(CASE WHEN LENGTH(image_url) > 10000 THEN 1 END) <= 20 
      THEN '🟠 Medium priority - run cleanup script for ' || COUNT(CASE WHEN LENGTH(image_url) > 10000 THEN 1 END) || ' products'
    ELSE '🔴 High priority - urgent cleanup needed for ' || COUNT(CASE WHEN LENGTH(image_url) > 10000 THEN 1 END) || ' products'
  END as action_required,
  CASE 
    WHEN COUNT(CASE WHEN LENGTH(image_url) > 100000 THEN 1 END) > 0
      THEN 'Use Option 2: Migrate to Supabase Storage (RECOMMENDED)'
    WHEN COUNT(CASE WHEN LENGTH(image_url) > 50000 THEN 1 END) > 0
      THEN 'Use Option 1: SQL Quick Fix OR Option 2: Migrate to Storage'
    ELSE 'Use Option 1: SQL Quick Fix (fastest)'
  END as suggested_solution
FROM products
WHERE image_url LIKE 'data:image/%';

-- ═══════════════════════════════════════════════════════════════
-- NEXT STEPS:
--
-- If you see problematic images above, refer to:
--   📄 LARGE_IMAGE_CLEANUP_INSTRUCTIONS.md
--
-- Quick fix (run after backing up):
--   See "Option 1: SQL Quick Fix" in the instructions
--
-- Best solution (for production):
--   Run: npx ts-node scripts/migrateImagesToStorage.ts
-- ═══════════════════════════════════════════════════════════════

