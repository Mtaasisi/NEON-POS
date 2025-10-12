-- ============================================
-- TEST QUERIES FOR PURCHASE ORDER WORKFLOW
-- ============================================
-- Use these queries to verify the workflow is working
-- ============================================

-- 1. Check if all RPC functions exist
-- ============================================
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE '%purchase%order%'
   OR proname LIKE '%received_items%'
ORDER BY proname;

-- Expected: Should see 6 functions:
-- - complete_purchase_order_receive
-- - get_purchase_order_receive_summary
-- - get_purchase_order_returns
-- - get_received_items_for_po
-- - mark_po_as_received
-- - process_purchase_order_return


-- 2. View all purchase orders
-- ============================================
SELECT 
  id,
  po_number,
  status,
  total_amount,
  created_at,
  received_date
FROM lats_purchase_orders
ORDER BY created_at DESC
LIMIT 10;


-- 3. View latest purchase order with items
-- ============================================
WITH latest_po AS (
  SELECT id FROM lats_purchase_orders 
  ORDER BY created_at DESC LIMIT 1
)
SELECT 
  po.po_number,
  po.status,
  po.total_amount,
  poi.quantity_ordered,
  poi.quantity_received,
  poi.unit_cost,
  poi.subtotal,
  p.name as product_name,
  pv.variant_name
FROM lats_purchase_orders po
JOIN lats_purchase_order_items poi ON po.id = poi.purchase_order_id
JOIN lats_products p ON poi.product_id = p.id
LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
WHERE po.id = (SELECT id FROM latest_po);


-- 4. Check inventory adjustments (should show receives)
-- ============================================
SELECT 
  ia.id,
  ia.type,
  ia.quantity,
  ia.reason,
  ia.notes,
  ia.created_at,
  p.name as product_name,
  pv.variant_name,
  pv.quantity as current_stock
FROM lats_inventory_adjustments ia
JOIN lats_products p ON ia.product_id = p.id
LEFT JOIN lats_product_variants pv ON ia.variant_id = pv.id
WHERE ia.type = 'purchase_order'
ORDER BY ia.created_at DESC
LIMIT 10;


-- 5. Check variant stock levels
-- ============================================
SELECT 
  p.name as product_name,
  pv.variant_name,
  pv.quantity as stock_quantity,
  pv.cost_price,
  pv.unit_price as selling_price,
  pv.updated_at as last_updated
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
WHERE p.name IN ('iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Air M2')
ORDER BY p.name, pv.variant_name;


-- 6. Get received items for a specific PO
-- ============================================
-- Replace 'YOUR_PO_ID_HERE' with actual PO ID
SELECT * FROM get_received_items_for_po('YOUR_PO_ID_HERE');


-- 7. Get receive summary for a PO
-- ============================================
-- Replace 'YOUR_PO_ID_HERE' with actual PO ID
SELECT * FROM get_purchase_order_receive_summary('YOUR_PO_ID_HERE');


-- 8. Check lats_inventory_items table (if using serial numbers)
-- ============================================
SELECT 
  ii.serial_number,
  ii.status,
  ii.cost_price,
  ii.selling_price,
  ii.location,
  ii.created_at,
  p.name as product_name,
  pv.variant_name
FROM lats_inventory_items ii
JOIN lats_products p ON ii.product_id = p.id
LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
ORDER BY ii.created_at DESC
LIMIT 20;


-- 9. Manual test: Receive a purchase order
-- ============================================
-- Replace 'YOUR_PO_ID_HERE' and 'YOUR_USER_ID_HERE' with actual values
SELECT complete_purchase_order_receive(
  'YOUR_PO_ID_HERE'::UUID,
  'YOUR_USER_ID_HERE'::UUID,
  'Test receive via SQL'
);


-- 10. Verify stock increase after receive
-- ============================================
-- Run BEFORE receiving:
SELECT 
  p.name,
  pv.variant_name,
  pv.quantity as stock_before
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
WHERE p.name = 'iPhone 15 Pro';

-- Then receive the PO, then run:
SELECT 
  p.name,
  pv.variant_name,
  pv.quantity as stock_after
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
WHERE p.name = 'iPhone 15 Pro';

-- Expected: stock_after = stock_before + received_quantity


-- 11. Get your user ID (for testing)
-- ============================================
SELECT id, email, full_name, role FROM users WHERE email = 'care@care.com';


-- 12. Quick workflow test (all in one)
-- ============================================
DO $$
DECLARE
  v_po_id UUID;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get latest PO
  SELECT id INTO v_po_id FROM lats_purchase_orders ORDER BY created_at DESC LIMIT 1;
  
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'care@care.com' LIMIT 1;
  
  -- Show PO before
  RAISE NOTICE 'PO ID: %', v_po_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Get PO status
  RAISE NOTICE 'Current PO status: %', (SELECT status FROM lats_purchase_orders WHERE id = v_po_id);
  
  -- Receive it
  SELECT complete_purchase_order_receive(v_po_id, v_user_id, 'Auto test') INTO v_result;
  RAISE NOTICE 'Receive result: %', v_result;
  
  -- Show PO after
  RAISE NOTICE 'New PO status: %', (SELECT status FROM lats_purchase_orders WHERE id = v_po_id);
  
  -- Show adjustments created
  RAISE NOTICE 'Adjustments created: %', (
    SELECT COUNT(*) FROM lats_inventory_adjustments 
    WHERE reason LIKE '%' || v_po_id::TEXT || '%'
  );
END $$;


-- ============================================
-- CLEANUP (Use with caution!)
-- ============================================

-- Reset a PO to draft status (for re-testing)
-- UPDATE lats_purchase_orders
-- SET status = 'draft', received_date = NULL
-- WHERE id = 'YOUR_PO_ID_HERE';

-- Delete inventory adjustments for a PO (for re-testing)
-- DELETE FROM lats_inventory_adjustments
-- WHERE reason LIKE '%YOUR_PO_ID_HERE%';

-- ============================================
-- END OF TEST QUERIES
-- ============================================

