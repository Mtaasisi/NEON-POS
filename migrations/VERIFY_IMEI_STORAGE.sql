-- ============================================
-- VERIFY IMEI STORAGE FOR TEST PO
-- ============================================

-- Check if IMEI was stored for our test purchase order
SELECT 
  ii.id AS inventory_item_id,
  ii.serial_number,
  ii.imei,
  ii.cost_price,
  ii.selling_price,
  ii.status,
  ii.location,
  p.name AS product_name,
  pv.name AS variant_name,
  po.order_number AS purchase_order,
  ii.created_at
FROM inventory_items ii
LEFT JOIN lats_products p ON ii.product_id = p.id
LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
LEFT JOIN lats_purchase_orders po ON ii.purchase_order_id = po.id
WHERE po.order_number = 'PO-1761051048163'
ORDER BY ii.created_at DESC;

-- Also check all recent inventory items with IMEI
SELECT 
  COUNT(*) AS total_items_with_imei,
  COUNT(DISTINCT imei) AS unique_imei_count
FROM inventory_items
WHERE imei IS NOT NULL
AND created_at > NOW() - INTERVAL '1 hour';

-- Show summary
SELECT 
  'Test Results' AS info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM inventory_items ii
      JOIN lats_purchase_orders po ON ii.purchase_order_id = po.id
      WHERE po.order_number = 'PO-1761051048163'
      AND ii.imei = '123456789012345'
    ) THEN '✅ IMEI Successfully Stored!'
    ELSE '❌ IMEI Not Found'
  END AS imei_storage_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM inventory_items ii
      JOIN lats_purchase_orders po ON ii.purchase_order_id = po.id  
      WHERE po.order_number = 'PO-1761051048163'
      AND ii.cost_price = 100
      AND ii.selling_price > 0
    ) THEN '✅ Pricing Successfully Stored!'
    ELSE '❌ Pricing Not Found'
  END AS pricing_status;

