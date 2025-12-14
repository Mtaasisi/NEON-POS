-- ============================================================================
-- IMEI DEVICES INVENTORY REPORT GENERATOR
-- ============================================================================
-- Run this script anytime to get a fresh report of all IMEI-tracked devices
-- Usage: psql "your-connection-string" -f generate-imei-report.sql
-- ============================================================================

\echo '╔════════════════════════════════════════════════════════════════════════╗'
\echo '║                   IMEI DEVICES INVENTORY REPORT                        ║'
\echo '║                  Generated: ' `date +%Y-%m-%d\ %H:%M:%S` '                              ║'
\echo '╚════════════════════════════════════════════════════════════════════════╝'
\echo ''

-- Summary Statistics
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 SUMMARY STATISTICS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  'Total Parent Variants' as "Metric",
  COUNT(*)::text as "Value"
FROM lats_product_variants
WHERE is_parent = TRUE OR variant_type = 'parent'

UNION ALL

SELECT 
  'Total IMEI Devices',
  COUNT(*)::text
FROM lats_product_variants
WHERE variant_type = 'imei_child'

UNION ALL

SELECT 
  'Active IMEI Devices',
  COUNT(*)::text
FROM lats_product_variants
WHERE variant_type = 'imei_child' AND is_active = TRUE

UNION ALL

SELECT 
  'Sold/Inactive Devices',
  COUNT(*)::text
FROM lats_product_variants
WHERE variant_type = 'imei_child' AND is_active = FALSE

UNION ALL

SELECT 
  'Total Inventory Value',
  '$' || TO_CHAR(COALESCE(SUM(selling_price * quantity), 0), 'FM999,999,999.00')
FROM lats_product_variants
WHERE variant_type = 'imei_child' AND is_active = TRUE;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📦 PARENT VARIANTS OVERVIEW'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  p.name as "Product",
  parent.name as "Parent Variant",
  parent.quantity as "Stock",
  (SELECT COUNT(*) 
   FROM lats_product_variants 
   WHERE parent_variant_id = parent.id 
   AND variant_type = 'imei_child'
   AND is_active = TRUE) as "Active Children",
  '$' || TO_CHAR(COALESCE(parent.selling_price, 0), 'FM999,999.00') as "Price/Unit",
  CASE 
    WHEN (SELECT SUM(quantity) FROM lats_product_variants 
          WHERE parent_variant_id = parent.id 
          AND variant_type = 'imei_child'
          AND is_active = TRUE) = parent.quantity THEN '✅'
    ELSE '⚠️'
  END as "Stock Match"
FROM lats_product_variants parent
LEFT JOIN lats_products p ON p.id = parent.product_id
WHERE parent.is_parent = TRUE OR parent.variant_type = 'parent'
ORDER BY p.name, parent.name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📱 INDIVIDUAL IMEI DEVICES (ALL)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  ROW_NUMBER() OVER (ORDER BY child.created_at DESC) as "#",
  p.name as "Product",
  parent.name as "Parent",
  child.variant_attributes->>'imei' as "IMEI",
  COALESCE(child.variant_attributes->>'serial_number', '-') as "Serial",
  child.variant_attributes->>'condition' as "Cond",
  '$' || TO_CHAR(child.cost_price, 'FM999,999') as "Cost",
  '$' || TO_CHAR(child.selling_price, 'FM999,999') as "Price",
  child.quantity as "Qty",
  CASE 
    WHEN child.is_active = TRUE AND child.quantity > 0 THEN '✅'
    WHEN child.is_active = FALSE THEN '❌'
    ELSE '⚠️'
  END as "St",
  child.created_at::date as "Added"
FROM lats_product_variants child
LEFT JOIN lats_product_variants parent ON parent.id = child.parent_variant_id
LEFT JOIN lats_products p ON p.id = child.product_id
WHERE child.variant_type = 'imei_child'
ORDER BY child.created_at DESC;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '💰 FINANCIAL SUMMARY'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  'Total Cost Value' as "Category",
  '$' || TO_CHAR(COALESCE(SUM(cost_price * quantity), 0), 'FM999,999,999.00') as "Amount"
FROM lats_product_variants
WHERE variant_type = 'imei_child' AND is_active = TRUE

UNION ALL

SELECT 
  'Total Selling Value',
  '$' || TO_CHAR(COALESCE(SUM(selling_price * quantity), 0), 'FM999,999,999.00')
FROM lats_product_variants
WHERE variant_type = 'imei_child' AND is_active = TRUE

UNION ALL

SELECT 
  'Potential Profit',
  '$' || TO_CHAR(
    COALESCE(
      (SELECT SUM(selling_price * quantity) FROM lats_product_variants WHERE variant_type = 'imei_child' AND is_active = TRUE) -
      (SELECT SUM(cost_price * quantity) FROM lats_product_variants WHERE variant_type = 'imei_child' AND is_active = TRUE),
      0
    ), 'FM999,999,999.00'
  )

UNION ALL

SELECT 
  'Average Device Value',
  '$' || TO_CHAR(
    COALESCE(
      (SELECT AVG(selling_price) FROM lats_product_variants WHERE variant_type = 'imei_child' AND is_active = TRUE),
      0
    ), 'FM999,999.00'
  );

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📋 DEVICES BY PRODUCT'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  p.name as "Product",
  COUNT(*) as "Total Devices",
  SUM(CASE WHEN child.is_active = TRUE THEN 1 ELSE 0 END) as "Available",
  SUM(CASE WHEN child.is_active = FALSE THEN 1 ELSE 0 END) as "Sold",
  '$' || TO_CHAR(SUM(child.selling_price * child.quantity), 'FM999,999,999.00') as "Total Value"
FROM lats_product_variants child
LEFT JOIN lats_products p ON p.id = child.product_id
WHERE child.variant_type = 'imei_child'
GROUP BY p.name
ORDER BY COUNT(*) DESC;

\echo ''
\echo '╔════════════════════════════════════════════════════════════════════════╗'
\echo '║                         REPORT COMPLETE                                ║'
\echo '╚════════════════════════════════════════════════════════════════════════╝'
\echo ''
\echo 'Legend: ✅ = Available/OK | ❌ = Sold/Inactive | ⚠️ = Warning/Mismatch'
\echo ''

