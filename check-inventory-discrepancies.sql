-- =====================================================
-- CHECK INVENTORY DISCREPANCIES
-- =====================================================
-- Run this in Supabase SQL Editor to see inventory sync issues

-- Show variants where shown quantity doesn't match actual inventory
SELECT 
  p.name as product_name,
  pv.name as variant_name,
  pv.sku as variant_sku,
  pv.quantity as shown_quantity,
  COUNT(CASE WHEN ii.status = 'available' THEN 1 END) as actual_available,
  COUNT(ii.id) as total_items,
  COUNT(CASE WHEN ii.status = 'available' THEN 1 END) - pv.quantity as discrepancy
FROM lats_product_variants pv
LEFT JOIN lats_products p ON p.id = pv.product_id
LEFT JOIN inventory_items ii ON ii.variant_id = pv.id
GROUP BY p.id, p.name, pv.id, pv.name, pv.sku, pv.quantity
HAVING COUNT(CASE WHEN ii.status = 'available' THEN 1 END) != pv.quantity
ORDER BY ABS(COUNT(CASE WHEN ii.status = 'available' THEN 1 END) - pv.quantity) DESC;

-- Show breakdown by status for problem variants
SELECT 
  pv.name as variant_name,
  ii.status,
  COUNT(*) as count
FROM inventory_items ii
JOIN lats_product_variants pv ON pv.id = ii.variant_id
WHERE ii.variant_id IN (
  SELECT pv2.id 
  FROM lats_product_variants pv2
  LEFT JOIN inventory_items ii2 ON ii2.variant_id = pv2.id
  GROUP BY pv2.id, pv2.quantity
  HAVING COUNT(CASE WHEN ii2.status = 'available' THEN 1 END) != pv2.quantity
)
GROUP BY pv.id, pv.name, ii.status
ORDER BY pv.name, ii.status;

-- Show recently received purchase orders
SELECT 
  po.order_number,
  po.status,
  po.received_date,
  COUNT(poi.id) as items_count,
  COUNT(ii.id) as inventory_items_created
FROM lats_purchase_orders po
LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
LEFT JOIN inventory_items ii ON ii.purchase_order_id = po.id
WHERE po.status = 'received'
  AND po.received_date > NOW() - INTERVAL '30 days'
GROUP BY po.id, po.order_number, po.status, po.received_date
ORDER BY po.received_date DESC;

