-- ============================================================================
-- FIX PURCHASE ORDER INVENTORY ITEMS - Add Missing branch_id
-- ============================================================================
-- This script fixes inventory_items created from PO-1765110767617
-- by adding the branch_id from the purchase order
-- ============================================================================

DO $$
DECLARE
  v_po_number TEXT := 'PO-1765110767617';
  po_record RECORD;
  items_updated INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING PO INVENTORY ITEMS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PO Number: %', v_po_number;
  RAISE NOTICE '';
  
  -- Find the purchase order
  SELECT * INTO po_record
  FROM lats_purchase_orders po
  WHERE po.po_number = v_po_number
  LIMIT 1;
  
  IF po_record IS NULL THEN
    RAISE EXCEPTION '❌ Purchase order % not found!', v_po_number;
  END IF;
  
  RAISE NOTICE '✅ Purchase Order Found:';
  RAISE NOTICE '   ID: %', po_record.id;
  RAISE NOTICE '   Branch ID: %', COALESCE(po_record.branch_id::TEXT, 'NULL');
  RAISE NOTICE '';
  
  IF po_record.branch_id IS NULL THEN
    RAISE WARNING '⚠️ Purchase order has NULL branch_id!';
    RAISE NOTICE '💡 You may need to assign a branch to this PO first';
    RETURN;
  END IF;
  
  -- Update inventory_items that are missing branch_id
  RAISE NOTICE 'Updating inventory_items with missing branch_id...';
  
  UPDATE inventory_items
  SET 
    branch_id = po_record.branch_id,
    updated_at = now()
  WHERE purchase_order_id = po_record.id
    AND branch_id IS NULL;
  
  GET DIAGNOSTICS items_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % inventory items with branch_id', items_updated;
  
  -- Also update variant stock if needed
  RAISE NOTICE '';
  RAISE NOTICE 'Checking variant stock updates...';
  
  -- This will be handled by the variant stock update logic
  -- But we can verify the inventory items are now visible
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Inventory items updated: %', items_updated;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Refresh your inventory page to see the items!';
  
END $$;

-- Show updated inventory items
SELECT 
  id,
  product_id,
  variant_id,
  status,
  branch_id,
  cost_price,
  created_at
FROM inventory_items
WHERE purchase_order_id IN (
  SELECT id FROM lats_purchase_orders WHERE lats_purchase_orders.po_number = 'PO-1765110767617'
)
ORDER BY created_at DESC
LIMIT 20;
