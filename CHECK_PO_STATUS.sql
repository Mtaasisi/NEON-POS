-- ============================================================================
-- CHECK PURCHASE ORDER STATUS AND INVENTORY
-- ============================================================================
-- This script checks why PO-1765110767617 didn't add products to inventory
-- ============================================================================

DO $$
DECLARE
  po_number TEXT := 'PO-1765110767617';
  po_record RECORD;
  item_record RECORD;
  inventory_count INT;
  variant_count INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PURCHASE ORDER DIAGNOSIS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PO Number: %', po_number;
  RAISE NOTICE '';
  
  -- Find the purchase order
  SELECT * INTO po_record
  FROM lats_purchase_orders
  WHERE po_number = po_number
  LIMIT 1;
  
  IF po_record IS NULL THEN
    RAISE WARNING '❌ Purchase order % not found!', po_number;
    RAISE NOTICE '';
    RAISE NOTICE 'Searching for similar PO numbers...';
    FOR po_record IN 
      SELECT id, po_number, status, created_at
      FROM lats_purchase_orders
      WHERE po_number LIKE '%1765110767617%'
      ORDER BY created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  Found: % (ID: %, Status: %)', po_record.po_number, po_record.id, po_record.status;
    END LOOP;
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Purchase Order Found:';
  RAISE NOTICE '   ID: %', po_record.id;
  RAISE NOTICE '   Status: %', po_record.status;
  RAISE NOTICE '   Branch ID: %', COALESCE(po_record.branch_id::TEXT, 'NULL');
  RAISE NOTICE '   Created: %', po_record.created_at;
  RAISE NOTICE '   Updated: %', po_record.updated_at;
  RAISE NOTICE '';
  
  -- Check PO items
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PURCHASE ORDER ITEMS';
  RAISE NOTICE '========================================';
  
  FOR item_record IN 
    SELECT 
      id,
      product_id,
      variant_id,
      quantity_ordered,
      quantity_received,
      unit_cost,
      product_name,
      variant_name
    FROM lats_purchase_order_items
    WHERE purchase_order_id = po_record.id
    ORDER BY created_at
  LOOP
    RAISE NOTICE 'Item: %', COALESCE(item_record.product_name, 'Unknown Product');
    RAISE NOTICE '   Product ID: %', item_record.product_id;
    RAISE NOTICE '   Variant ID: %', COALESCE(item_record.variant_id::TEXT, 'NULL');
    RAISE NOTICE '   Ordered: %', item_record.quantity_ordered;
    RAISE NOTICE '   Received: %', COALESCE(item_record.quantity_received, 0);
    RAISE NOTICE '   Unit Cost: %', COALESCE(item_record.unit_cost, 0);
    RAISE NOTICE '';
  END LOOP;
  
  -- Check inventory items created from this PO
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INVENTORY ITEMS FROM THIS PO';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO inventory_count
  FROM inventory_items
  WHERE purchase_order_id = po_record.id;
  
  RAISE NOTICE 'Total inventory items created: %', inventory_count;
  
  IF inventory_count = 0 THEN
    RAISE WARNING '⚠️ PROBLEM: No inventory items were created from this PO!';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'Sample inventory items (first 10):';
    FOR item_record IN 
      SELECT 
        id,
        product_id,
        variant_id,
        status,
        cost_price,
        selling_price,
        created_at
      FROM inventory_items
      WHERE purchase_order_id = po_record.id
      ORDER BY created_at DESC
      LIMIT 10
    LOOP
      RAISE NOTICE '   Item ID: %, Product: %, Variant: %, Status: %, Cost: %',
        item_record.id,
        item_record.product_id,
        COALESCE(item_record.variant_id::TEXT, 'NULL'),
        item_record.status,
        item_record.cost_price;
    END LOOP;
  END IF;
  
  -- Check variant stock updates
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VARIANT STOCK UPDATES';
  RAISE NOTICE '========================================';
  
  FOR item_record IN 
    SELECT DISTINCT variant_id
    FROM lats_purchase_order_items
    WHERE purchase_order_id = po_record.id
      AND variant_id IS NOT NULL
  LOOP
    SELECT quantity INTO variant_count
    FROM lats_product_variants
    WHERE id = item_record.variant_id;
    
    RAISE NOTICE 'Variant %: Current stock = %', item_record.variant_id, COALESCE(variant_count, 0);
  END LOOP;
  
  -- Check for errors or issues
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS';
  RAISE NOTICE '========================================';
  
  IF po_record.status NOT IN ('received', 'partial_received') THEN
    RAISE WARNING '⚠️ PO status is "%" - should be "received" or "partial_received"', po_record.status;
  END IF;
  
  IF inventory_count = 0 THEN
    RAISE WARNING '⚠️ No inventory items created!';
    RAISE NOTICE '💡 Possible causes:';
    RAISE NOTICE '   1. Receiving function failed silently';
    RAISE NOTICE '   2. Branch isolation issue (inventory_items need branch_id)';
    RAISE NOTICE '   3. Products/variants missing branch_id';
    RAISE NOTICE '   4. Database function error';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Solutions:';
    RAISE NOTICE '   1. Check database logs for errors';
    RAISE NOTICE '   2. Verify PO items have valid product_id and variant_id';
    RAISE NOTICE '   3. Check if inventory_items table has branch_id column';
    RAISE NOTICE '   4. Try re-receiving the PO';
  ELSE
    RAISE NOTICE '✅ Inventory items were created successfully';
  END IF;
  
  -- Check branch_id on inventory items
  IF inventory_count > 0 THEN
    SELECT COUNT(*) INTO inventory_count
    FROM inventory_items
    WHERE purchase_order_id = po_record.id
      AND branch_id IS NULL;
    
    IF inventory_count > 0 THEN
      RAISE WARNING '⚠️ % inventory items have NULL branch_id - may not show in inventory!', inventory_count;
    END IF;
  END IF;
  
END $$;

-- Also show the PO details directly
SELECT 
  id,
  po_number,
  status,
  branch_id,
  supplier_id,
  total_amount,
  created_at,
  updated_at
FROM lats_purchase_orders
WHERE po_number = 'PO-1765110767617'
LIMIT 1;
