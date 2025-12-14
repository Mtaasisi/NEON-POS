-- Check for items with pending_pricing status
SELECT 
  ii.id,
  ii.product_id,
  p.name as product_name,
  ii.imei,
  ii.cost_price,
  ii.selling_price,
  ii.status,
  ii.created_at
FROM inventory_items ii
LEFT JOIN lats_products p ON ii.product_id = p.id
WHERE ii.status = 'pending_pricing'
   OR ii.selling_price IS NULL
   OR ii.selling_price = 0
ORDER BY ii.created_at DESC
LIMIT 10;

-- Also check the purchase order status
SELECT 
  po.id,
  po.order_number,
  po.status,
  po.payment_status,
  poi.id as item_id,
  poi.quantity_ordered,
  poi.quantity_received,
  poi.unit_cost
FROM lats_purchase_orders po
JOIN lats_purchase_order_items poi ON po.id = poi.purchase_order_id
WHERE po.id = 'd1811637-1c56-42e6-974d-23ca24401e79';

