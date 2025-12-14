-- =====================================================
-- VERIFY STOCK UPDATE FIX
-- =====================================================
-- Run this script to check if the stock update fix is working

-- 1. Check the function exists and is updated
SELECT 
  routine_name,
  routine_type,
  last_altered
FROM information_schema.routines
WHERE routine_name = 'complete_purchase_order_receive';

-- 2. Check recent stock movements from PO receipts
SELECT 
  sm.id,
  sm.movement_type,
  sm.quantity,
  sm.previous_quantity,
  sm.new_quantity,
  sm.reason,
  sm.reference,
  sm.created_at,
  p.name as product_name,
  pv.name as variant_name,
  pv.quantity as current_variant_quantity
FROM lats_stock_movements sm
LEFT JOIN lats_products p ON p.id = sm.product_id
LEFT JOIN lats_product_variants pv ON pv.id = sm.variant_id
WHERE sm.reason = 'Purchase Order Receipt'
ORDER BY sm.created_at DESC
LIMIT 10;

-- 3. Check inventory items created vs variant quantities
SELECT 
  p.name as product_name,
  pv.name as variant_name,
  pv.quantity as variant_quantity,
  COUNT(ii.id) as inventory_items_count,
  COUNT(ii.id) FILTER (WHERE ii.status = 'available') as available_items
FROM lats_product_variants pv
LEFT JOIN lats_products p ON p.id = pv.product_id
LEFT JOIN inventory_items ii ON ii.variant_id = pv.id
WHERE pv.product_id IN (
  SELECT DISTINCT product_id 
  FROM lats_purchase_order_items
  LIMIT 10
)
GROUP BY p.name, pv.name, pv.quantity
ORDER BY p.name, pv.name;

-- 4. Check recent purchase order receives
SELECT 
  po.order_number,
  po.status,
  po.received_date,
  COUNT(ii.id) as inventory_items_created,
  SUM(poi.quantity_received) as total_quantity_received
FROM lats_purchase_orders po
LEFT JOIN inventory_items ii ON ii.purchase_order_id = po.id
LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
WHERE po.status IN ('received', 'partial_received', 'completed')
GROUP BY po.id, po.order_number, po.status, po.received_date
ORDER BY po.received_date DESC NULLS LAST
LIMIT 10;

-- 5. Check if there are any POs ready to receive (for testing)
SELECT 
  po.id,
  po.order_number,
  po.status,
  po.created_at,
  s.name as supplier_name,
  COUNT(poi.id) as item_count,
  SUM(poi.quantity_ordered) as total_ordered,
  SUM(COALESCE(poi.quantity_received, 0)) as total_received
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
WHERE po.status IN ('shipped', 'confirmed', 'sent', 'partial_received')
GROUP BY po.id, po.order_number, po.status, po.created_at, s.name
ORDER BY po.created_at DESC
LIMIT 5;

-- 6. Summary statistics
SELECT 
  'Total Stock Movements (PO Receipts)' as metric,
  COUNT(*) as value
FROM lats_stock_movements
WHERE reason = 'Purchase Order Receipt'
UNION ALL
SELECT 
  'Total Inventory Items' as metric,
  COUNT(*) as value
FROM inventory_items
UNION ALL
SELECT 
  'Total Variants with Stock' as metric,
  COUNT(*) as value
FROM lats_product_variants
WHERE quantity > 0
UNION ALL
SELECT 
  'Total Received POs' as metric,
  COUNT(*) as value
FROM lats_purchase_orders
WHERE status IN ('received', 'completed');

