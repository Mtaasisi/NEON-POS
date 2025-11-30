-- SQL Queries to Verify Child Variant Handling
-- ============================================

-- 1. Check if system has any child variants
SELECT 
  COUNT(*) as total_variants,
  COUNT(*) FILTER (WHERE parent_variant_id IS NULL) as parent_variants,
  COUNT(*) FILTER (WHERE parent_variant_id IS NOT NULL) as child_variants
FROM lats_product_variants;

-- 2. View parent-child relationships
SELECT 
  p.name as product_name,
  parent.variant_name as parent_variant_name,
  child.variant_attributes->>'imei' as child_imei,
  parent.quantity as parent_stock,
  child.quantity as child_quantity
FROM lats_product_variants parent
LEFT JOIN lats_products p ON p.id = parent.product_id
LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id
WHERE parent.parent_variant_id IS NULL
  AND parent.is_parent = true
LIMIT 10;

-- 3. Check variant_name population (what the fix uses)
SELECT 
  id,
  variant_name,
  parent_variant_id,
  variant_type,
  is_parent,
  CASE 
    WHEN parent_variant_id IS NULL THEN 'Parent Variant'
    ELSE 'Child Variant (IMEI)'
  END as variant_role
FROM lats_product_variants
ORDER BY created_at DESC
LIMIT 20;

-- 4. Verify only parents have variant_name set
SELECT 
  variant_role,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE variant_name IS NOT NULL AND variant_name != '') as with_variant_name,
  COUNT(*) FILTER (WHERE variant_name IS NULL OR variant_name = '') as without_variant_name
FROM (
  SELECT 
    variant_name,
    CASE 
      WHEN parent_variant_id IS NULL THEN 'Parent'
      ELSE 'Child'
    END as variant_role
  FROM lats_product_variants
) sub
GROUP BY variant_role;

-- 5. Check what queries return (simulate the API)
-- This is what getProduct() returns
SELECT 
  id,
  product_id,
  variant_name,
  sku,
  quantity,
  parent_variant_id,
  variant_type
FROM lats_product_variants
WHERE product_id IN (
  SELECT id FROM lats_products LIMIT 5
)
AND parent_variant_id IS NULL  -- ✅ Filter applied by fix
ORDER BY created_at;

-- 6. Verify child variants are excluded
-- Should return 0 rows
SELECT 
  id,
  variant_name,
  variant_attributes->>'imei' as imei,
  parent_variant_id
FROM lats_product_variants
WHERE parent_variant_id IS NOT NULL  -- These are children
  AND variant_name IS NOT NULL;      -- Do children have variant_name?

-- 7. Check for any "Unnamed Variant" in parent variants
SELECT 
  COUNT(*) as unnamed_parent_variants
FROM lats_product_variants
WHERE parent_variant_id IS NULL
  AND (variant_name IS NULL OR variant_name = '' OR variant_name LIKE '%Unnamed%');

-- 8. Parent variants with good names
SELECT 
  p.name as product_name,
  v.variant_name,
  v.sku,
  v.quantity as stock,
  v.is_parent,
  (SELECT COUNT(*) FROM lats_product_variants WHERE parent_variant_id = v.id) as child_count
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE v.parent_variant_id IS NULL
  AND v.variant_name IS NOT NULL
  AND v.variant_name != ''
ORDER BY v.created_at DESC
LIMIT 10;

-- 9. Verify fix data mapping (simulated)
-- This simulates the JavaScript: variant.variant_name || variant.name || 'Unnamed'
SELECT 
  id,
  COALESCE(variant_name, name, 'Unnamed Variant') as display_name,
  variant_name,
  name,
  parent_variant_id IS NULL as is_parent_variant
FROM lats_product_variants
WHERE parent_variant_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 10. Full audit: How many variants have each field?
SELECT 
  'Total Variants' as metric,
  COUNT(*) as count
FROM lats_product_variants
UNION ALL
SELECT 
  'Parent Variants',
  COUNT(*) 
FROM lats_product_variants 
WHERE parent_variant_id IS NULL
UNION ALL
SELECT 
  'Child Variants',
  COUNT(*) 
FROM lats_product_variants 
WHERE parent_variant_id IS NOT NULL
UNION ALL
SELECT 
  'Parents with variant_name',
  COUNT(*) 
FROM lats_product_variants 
WHERE parent_variant_id IS NULL 
  AND variant_name IS NOT NULL 
  AND variant_name != ''
UNION ALL
SELECT 
  'Parents without variant_name',
  COUNT(*) 
FROM lats_product_variants 
WHERE parent_variant_id IS NULL 
  AND (variant_name IS NULL OR variant_name = '')
UNION ALL
SELECT 
  'Children with IMEI',
  COUNT(*) 
FROM lats_product_variants 
WHERE parent_variant_id IS NOT NULL 
  AND variant_attributes->>'imei' IS NOT NULL;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- Query 1: Should show total vs parent vs child breakdown
-- Query 2: Should show parent-child relationships if any exist
-- Query 3: Should show variant_name populated for parents
-- Query 4: Should show parents have names, children don't need them
-- Query 5: Should return only parent variants (what UI sees)
-- Query 6: Should return 0 rows (children don't need variant_name)
-- Query 7: Should return 0 (no unnamed parent variants after fix)
-- Query 8: Should show parents with good descriptive names
-- Query 9: Should show COALESCE working like JavaScript fix
-- Query 10: Should show comprehensive audit of all variants

