-- ================================================================
-- Purchase Order Receive Verification Query
-- ================================================================
-- Purpose: Verify if PO-1761383112701 was successfully received
-- Run this after the automated test completes
-- ================================================================

\echo '========================================================'
\echo '🔍 PURCHASE ORDER RECEIVE VERIFICATION'
\echo '========================================================'
\echo ''

-- 1. Check Purchase Order Status
\echo '1️⃣ Purchase Order Status:'
\echo '--------------------------------------------------------'
SELECT 
  po.order_number as "Order Number",
  po.status as "Status",
  po.total_amount as "Total Amount",
  po.supplier_id as "Supplier ID",
  to_char(po.created_at, 'YYYY-MM-DD HH24:MI:SS') as "Created At",
  to_char(po.updated_at, 'YYYY-MM-DD HH24:MI:SS') as "Updated At"
FROM lats_purchase_orders po
WHERE po.order_number IN ('PO-1761383112701', 'PO-1761383097975')
ORDER BY po.created_at DESC;

\echo ''
\echo ''

-- 2. Check Purchase Order Items
\echo '2️⃣ Purchase Order Items (Ordered vs Received):'
\echo '--------------------------------------------------------'
SELECT 
  po.order_number as "PO Number",
  p.name as "Product",
  pv.name as "Variant",
  poi.quantity as "Ordered Qty",
  COALESCE(poi.received_quantity, 0) as "Received Qty",
  poi.unit_price as "Unit Price",
  CASE 
    WHEN COALESCE(poi.received_quantity, 0) = 0 THEN '❌ Not Received'
    WHEN poi.received_quantity < poi.quantity THEN '⚠️ Partially Received'
    WHEN poi.received_quantity >= poi.quantity THEN '✅ Fully Received'
  END as "Status"
FROM lats_purchase_order_items poi
JOIN lats_purchase_orders po ON po.id = poi.purchase_order_id
JOIN lats_product_variants pv ON pv.id = poi.variant_id
JOIN lats_products p ON p.id = pv.product_id
WHERE po.order_number IN ('PO-1761383112701', 'PO-1761383097975')
ORDER BY po.order_number, p.name;

\echo ''
\echo ''

-- 3. Check Inventory Items Created
\echo '3️⃣ Inventory Items Created from Purchase Order:'
\echo '--------------------------------------------------------'
SELECT 
  po.order_number as "PO Number",
  p.name as "Product",
  pv.name as "Variant",
  ii.status as "Item Status",
  ii.location as "Location",
  ii.shelf as "Shelf",
  ii.serial_number as "Serial #",
  ii.imei as "IMEI",
  to_char(ii.created_at, 'YYYY-MM-DD HH24:MI:SS') as "Created At"
FROM lats_inventory_items ii
JOIN lats_product_variants pv ON pv.id = ii.variant_id
JOIN lats_products p ON p.id = pv.product_id
JOIN lats_purchase_orders po ON po.id = ii.purchase_order_id
WHERE po.order_number IN ('PO-1761383112701', 'PO-1761383097975')
ORDER BY ii.created_at DESC
LIMIT 50;

\echo ''
\echo ''

-- 4. Summary Statistics
\echo '4️⃣ Receive Summary Statistics:'
\echo '--------------------------------------------------------'
SELECT 
  po.order_number as "Order Number",
  po.status as "PO Status",
  COUNT(DISTINCT poi.id) as "Total Items",
  SUM(poi.quantity) as "Total Ordered Quantity",
  SUM(COALESCE(poi.received_quantity, 0)) as "Total Received Quantity",
  COUNT(DISTINCT ii.id) as "Inventory Items Created",
  CASE 
    WHEN SUM(COALESCE(poi.received_quantity, 0)) = 0 THEN '❌ NOT RECEIVED'
    WHEN SUM(COALESCE(poi.received_quantity, 0)) < SUM(poi.quantity) THEN '⚠️ PARTIALLY RECEIVED'
    WHEN SUM(COALESCE(poi.received_quantity, 0)) >= SUM(poi.quantity) THEN '✅ FULLY RECEIVED'
  END as "Receive Status"
FROM lats_purchase_orders po
LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
LEFT JOIN lats_inventory_items ii ON ii.purchase_order_id = po.id
WHERE po.order_number IN ('PO-1761383112701', 'PO-1761383097975')
GROUP BY po.id, po.order_number, po.status
ORDER BY po.created_at DESC;

\echo ''
\echo ''

-- 5. Check Product Serial Number Tracking
\echo '5️⃣ Product Serial Number Tracking Configuration:'
\echo '--------------------------------------------------------'
SELECT 
  po.order_number as "PO Number",
  p.name as "Product",
  pv.name as "Variant",
  COALESCE(pv.track_serial_number, false) as "Track Serial",
  COALESCE(pv.track_imei, false) as "Track IMEI",
  COALESCE(pv.track_stock, true) as "Track Stock",
  CASE 
    WHEN COALESCE(pv.track_serial_number, false) OR COALESCE(pv.track_imei, false) 
    THEN '📱 Requires Serial/IMEI Entry'
    ELSE '📦 Simple Stock Item'
  END as "Item Type"
FROM lats_purchase_order_items poi
JOIN lats_purchase_orders po ON po.id = poi.purchase_order_id
JOIN lats_product_variants pv ON pv.id = poi.variant_id
JOIN lats_products p ON p.id = pv.product_id
WHERE po.order_number IN ('PO-1761383112701', 'PO-1761383097975')
ORDER BY po.order_number, p.name;

\echo ''
\echo ''

-- 6. Recent Purchase Order Activity
\echo '6️⃣ Recent Purchase Orders (Last 10):'
\echo '--------------------------------------------------------'
SELECT 
  po.order_number as "Order Number",
  po.status as "Status",
  s.name as "Supplier",
  po.total_amount as "Total",
  to_char(po.created_at, 'YYYY-MM-DD HH24:MI') as "Created",
  to_char(po.updated_at, 'YYYY-MM-DD HH24:MI') as "Updated"
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
ORDER BY po.created_at DESC
LIMIT 10;

\echo ''
\echo '========================================================'
\echo '✅ VERIFICATION COMPLETE'
\echo '========================================================'
\echo ''
\echo 'NEXT STEPS:'
\echo '1. Review the "Receive Status" in section 4'
\echo '2. If "NOT RECEIVED", the automated test did not complete'
\echo '3. If "FULLY RECEIVED", the test was successful!'
\echo '4. Check section 3 to verify inventory items were created'
\echo '5. Check section 5 to see if serial numbers are required'
\echo ''

