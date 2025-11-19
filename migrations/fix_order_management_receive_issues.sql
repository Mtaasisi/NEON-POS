-- ============================================
-- FIX: Order Management Receive Issues
-- ============================================
-- This script fixes data inconsistencies where:
-- 1. Orders marked as "received" but have no inventory items
-- 2. Inventory items created but missing purchase_order_item_id
-- 3. Items stuck in 'pending_pricing' status
-- ============================================

BEGIN;

-- STEP 1: Fix inventory items missing purchase_order_item_id
-- Match inventory items to purchase order items by variant_id
UPDATE inventory_items ii
SET purchase_order_item_id = poi.id
FROM lats_purchase_order_items poi
WHERE ii.purchase_order_id = poi.purchase_order_id
  AND ii.variant_id = poi.variant_id
  AND ii.purchase_order_item_id IS NULL;

-- Show how many were fixed
DO $$
DECLARE
  v_fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  RAISE NOTICE '✅ Fixed % inventory items with missing purchase_order_item_id', v_fixed_count;
END $$;

-- STEP 2: Update quantity_received based on actual inventory items
UPDATE lats_purchase_order_items poi
SET quantity_received = (
  SELECT COUNT(*)
  FROM inventory_items ii
  WHERE ii.purchase_order_item_id = poi.id
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM inventory_items ii
  WHERE ii.purchase_order_item_id = poi.id
);

-- Show updated items
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated quantity_received for % purchase order items', v_updated_count;
END $$;

-- STEP 3: Fix items stuck in 'pending_pricing' status
-- Set selling prices from variant prices or calculate with markup
UPDATE inventory_items ii
SET 
  selling_price = CASE 
    WHEN pv.selling_price > 0 THEN pv.selling_price
    ELSE ii.cost_price * 1.3  -- Default 30% markup
  END,
  status = 'available',
  updated_at = NOW()
FROM lats_product_variants pv
WHERE ii.variant_id = pv.id
  AND ii.status = 'pending_pricing';

-- Show fixed items
DO $$
DECLARE
  v_fixed_pricing_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_fixed_pricing_count = ROW_COUNT;
  RAISE NOTICE '✅ Fixed % items stuck in pending_pricing status', v_fixed_pricing_count;
END $$;

-- STEP 4: Reset orders marked as "received" but with no inventory items
-- These are false positives - change status back to previous state
UPDATE lats_purchase_orders po
SET 
  status = CASE 
    WHEN payment_status = 'paid' THEN 'sent'  -- If paid, set to sent (ready to receive)
    ELSE 'draft'  -- If unpaid, keep as draft
  END,
  updated_at = NOW()
WHERE po.status = 'received'
  AND NOT EXISTS (
    SELECT 1 
    FROM inventory_items ii 
    WHERE ii.purchase_order_id = po.id
  );

-- Show reset orders
DO $$
DECLARE
  v_reset_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  RAISE NOTICE '⚠️ Reset % orders marked as received but with no inventory items', v_reset_count;
END $$;

-- STEP 5: Update purchase order status based on actual received quantities
UPDATE lats_purchase_orders po
SET 
  status = CASE 
    WHEN (
      SELECT NOT EXISTS (
        SELECT 1
        FROM lats_purchase_order_items poi
        WHERE poi.purchase_order_id = po.id
        AND COALESCE(poi.quantity_received, 0) < poi.quantity_ordered
      )
    ) THEN 'received'  -- All items fully received
    WHEN (
      SELECT EXISTS (
        SELECT 1
        FROM lats_purchase_order_items poi
        WHERE poi.purchase_order_id = po.id
        AND COALESCE(poi.quantity_received, 0) > 0
      )
    ) THEN 'partial_received'  -- Some items received
    ELSE po.status  -- Keep current status
  END,
  received_date = CASE 
    WHEN (
      SELECT NOT EXISTS (
        SELECT 1
        FROM lats_purchase_order_items poi
        WHERE poi.purchase_order_id = po.id
        AND COALESCE(poi.quantity_received, 0) < poi.quantity_ordered
      )
    ) AND po.received_date IS NULL THEN NOW()
    ELSE po.received_date
  END,
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM lats_purchase_order_items poi
  WHERE poi.purchase_order_id = po.id
  AND COALESCE(poi.quantity_received, 0) > 0
);

-- COMMIT changes
COMMIT;

-- ============================================
-- VERIFICATION REPORT
-- ============================================

\echo ''
\echo '==============================================='
\echo '  VERIFICATION REPORT'
\echo '==============================================='
\echo ''

-- Check all purchase orders status vs inventory
SELECT 
  po.po_number,
  po.status,
  po.payment_status,
  COUNT(DISTINCT poi.id) as total_items,
  COALESCE(SUM(poi.quantity_ordered), 0) as total_ordered,
  COALESCE(SUM(poi.quantity_received), 0) as total_received,
  COUNT(ii.id) as inventory_items_count,
  ARRAY_AGG(DISTINCT ii.status) FILTER (WHERE ii.status IS NOT NULL) as inventory_statuses
FROM lats_purchase_orders po
LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
LEFT JOIN inventory_items ii ON ii.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1762913812737', 'PO-1762912175500', 'PO-1762899640123')
GROUP BY po.po_number, po.status, po.payment_status
ORDER BY po.po_number;

\echo ''
\echo '==============================================='
\echo '  FIX COMPLETE!'
\echo '==============================================='
\echo ''
\echo 'Summary of fixes applied:'
\echo '1. ✅ Linked inventory items to purchase order items'
\echo '2. ✅ Updated quantity_received to match inventory'
\echo '3. ✅ Fixed items stuck in pending_pricing'
\echo '4. ✅ Reset false "received" statuses'
\echo '5. ✅ Updated PO statuses based on actual data'
\echo ''
\echo 'You can now:'
\echo '- Refresh Order Management page'
\echo '- Try receiving products again'
\echo '- Items will be added to inventory correctly'
\echo ''

