-- ============================================================================
-- CHECK PRODUCT BEFORE AND AFTER PO RECEIVE
-- Product: iPhone 17 Pro
-- Variant SKU: SKU-1763740337393-WRF
-- ============================================================================

\echo ''
\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║  📊 PRODUCT STATE CHECK: SKU-1763740337393-WRF               ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''

-- Product Info
SELECT 
  '📦 PRODUCT' as info_type,
  p.id::TEXT as id,
  p.name as name,
  p.sku as sku,
  p.stock_quantity::TEXT as stock_quantity,
  p.is_active::TEXT as active
FROM lats_products p
WHERE p.name ILIKE '%iPhone 17%'
LIMIT 1;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Target Variant (SKU-1763740337393-WRF)
SELECT 
  '🎯 TARGET VARIANT' as info_type,
  pv.id::TEXT as variant_id,
  COALESCE(pv.variant_name, 'N/A') as variant_name,
  pv.sku as variant_sku,
  pv.quantity::TEXT as current_quantity,
  pv.is_parent::TEXT as is_parent,
  pv.variant_type,
  pv.cost_price::TEXT as cost_price,
  pv.selling_price::TEXT as selling_price,
  pv.is_active::TEXT as active,
  pv.created_at::TEXT as created_at
FROM lats_product_variants pv
WHERE pv.sku = 'SKU-1763740337393-WRF';

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- IMEI Children Count
SELECT 
  '📱 IMEI CHILDREN' as info_type,
  COUNT(*)::TEXT as total_children,
  COUNT(*) FILTER (WHERE child.is_active = TRUE)::TEXT as active_children,
  SUM(child.quantity) FILTER (WHERE child.is_active = TRUE)::TEXT as total_children_quantity
FROM lats_product_variants parent
LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id 
  AND child.variant_type = 'imei_child'
WHERE parent.sku = 'SKU-1763740337393-WRF';

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Individual IMEI Children
SELECT 
  '📋 IMEI CHILD DETAILS' as info_type,
  child.id::TEXT as child_id,
  child.variant_name as child_name,
  child.variant_attributes->>'imei' as imei,
  child.variant_attributes->>'serial_number' as serial_number,
  child.quantity::TEXT as quantity,
  child.is_active::TEXT as active,
  child.created_at::TEXT as created_at
FROM lats_product_variants parent
LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id 
  AND child.variant_type = 'imei_child'
WHERE parent.sku = 'SKU-1763740337393-WRF'
ORDER BY child.created_at DESC;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Stock Analysis
SELECT 
  '📊 STOCK ANALYSIS' as info_type,
  parent.quantity::TEXT as parent_quantity,
  COUNT(child.id)::TEXT as imei_children_count,
  SUM(child.quantity) FILTER (WHERE child.is_active = TRUE)::TEXT as total_imei_quantity,
  (parent.quantity - COALESCE(SUM(child.quantity) FILTER (WHERE child.is_active = TRUE), 0))::TEXT as non_imei_stock,
  CASE 
    WHEN parent.quantity >= COALESCE(SUM(child.quantity) FILTER (WHERE child.is_active = TRUE), 0) 
    THEN '✅ Stock preserved'
    ELSE '⚠️ Stock mismatch'
  END as status
FROM lats_product_variants parent
LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id 
  AND child.variant_type = 'imei_child'
WHERE parent.sku = 'SKU-1763740337393-WRF'
GROUP BY parent.id, parent.quantity;

\echo ''
\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║  ✅ CHECK COMPLETE                                            ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''
\echo '📝 To test stock merging:'
\echo '   1. Receive a PO with this variant'
\echo '   2. Add IMEI/Serial numbers (e.g., 3 items)'
\echo '   3. Run this script again to see if stock merged correctly'
\echo '   Expected: parent_quantity = current_quantity + new_imei_count'
\echo ''

