-- ============================================
-- COMPLETE PURCHASE ORDER WORKFLOW TEST
-- ============================================
-- This script tests the entire workflow from creation to inventory import
-- Run this in your Neon SQL Editor to verify everything works
-- ============================================

-- ============================================
-- SETUP: Get necessary IDs
-- ============================================
DO $$
DECLARE
  v_supplier_id UUID;
  v_product_id UUID;
  v_variant_id UUID;
  v_user_id UUID;
  v_po_id UUID;
  v_po_number TEXT;
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_result JSON;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 STARTING COMPLETE PURCHASE ORDER WORKFLOW TEST';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ============================================
  -- STEP 1: Get IDs for testing
  -- ============================================
  RAISE NOTICE '📋 Step 1: Getting test data...';
  
  -- Get a supplier
  SELECT id INTO v_supplier_id FROM lats_suppliers LIMIT 1;
  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'No suppliers found! Please create a supplier first.';
  END IF;
  RAISE NOTICE '   ✅ Supplier ID: %', v_supplier_id;
  
  -- Get a product
  SELECT id INTO v_product_id FROM lats_products LIMIT 1;
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'No products found! Please create a product first.';
  END IF;
  RAISE NOTICE '   ✅ Product ID: %', v_product_id;
  
  -- Get a variant for that product
  SELECT id INTO v_variant_id FROM lats_product_variants WHERE product_id = v_product_id LIMIT 1;
  IF v_variant_id IS NULL THEN
    RAISE EXCEPTION 'No variants found for product! Please create a variant first.';
  END IF;
  RAISE NOTICE '   ✅ Variant ID: %', v_variant_id;
  
  -- Get user
  SELECT id INTO v_user_id FROM users WHERE email = 'care@care.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found! Please create user care@care.com first.';
  END IF;
  RAISE NOTICE '   ✅ User ID: %', v_user_id;
  
  RAISE NOTICE '';

  -- ============================================
  -- STEP 2: Check stock BEFORE
  -- ============================================
  RAISE NOTICE '📊 Step 2: Checking stock levels BEFORE...';
  
  SELECT quantity INTO v_stock_before FROM lats_product_variants WHERE id = v_variant_id;
  RAISE NOTICE '   📦 Stock BEFORE: %', v_stock_before;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 3: Create Purchase Order
  -- ============================================
  RAISE NOTICE '🛒 Step 3: Creating purchase order...';
  
  -- Generate PO number
  v_po_number := 'PO-TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  -- Create PO header
  INSERT INTO lats_purchase_orders (
    po_number,
    supplier_id,
    status,
    total_amount,
    currency,
    created_by,
    created_at
  ) VALUES (
    v_po_number,
    v_supplier_id,
    'draft',
    150000.00,
    'TZS',
    v_user_id,
    NOW()
  ) RETURNING id INTO v_po_id;
  
  RAISE NOTICE '   ✅ PO Created: % (ID: %)', v_po_number, v_po_id;
  
  -- Create PO items
  INSERT INTO lats_purchase_order_items (
    purchase_order_id,
    product_id,
    variant_id,
    quantity_ordered,
    quantity_received,
    unit_cost,
    subtotal
  ) VALUES (
    v_po_id,
    v_product_id,
    v_variant_id,
    10, -- Order 10 units
    0,  -- Not received yet
    15000.00,
    150000.00
  );
  
  RAISE NOTICE '   ✅ PO Item Added: 10 units @ 15,000 each';
  RAISE NOTICE '';

  -- ============================================
  -- STEP 4: Verify PO was created
  -- ============================================
  RAISE NOTICE '🔍 Step 4: Verifying PO creation...';
  
  IF EXISTS (SELECT 1 FROM lats_purchase_orders WHERE id = v_po_id) THEN
    RAISE NOTICE '   ✅ PO exists in database';
  ELSE
    RAISE EXCEPTION 'PO not found after creation!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM lats_purchase_order_items WHERE purchase_order_id = v_po_id) THEN
    RAISE NOTICE '   ✅ PO items exist in database';
  ELSE
    RAISE EXCEPTION 'PO items not found after creation!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 5: Receive Purchase Order (THE MAGIC!)
  -- ============================================
  RAISE NOTICE '📦 Step 5: RECEIVING purchase order (importing to inventory)...';
  RAISE NOTICE '   🔄 Calling complete_purchase_order_receive()...';
  
  -- Call the receive function
  SELECT complete_purchase_order_receive(
    v_po_id,
    v_user_id,
    'Automated test receive'
  ) INTO v_result;
  
  RAISE NOTICE '   ✅ Receive result: %', v_result;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 6: Verify PO status changed
  -- ============================================
  RAISE NOTICE '✅ Step 6: Verifying PO status...';
  
  IF EXISTS (SELECT 1 FROM lats_purchase_orders WHERE id = v_po_id AND status = 'received') THEN
    RAISE NOTICE '   ✅ PO status changed to "received"';
  ELSE
    RAISE EXCEPTION 'PO status did not change to received!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM lats_purchase_orders WHERE id = v_po_id AND received_date IS NOT NULL) THEN
    RAISE NOTICE '   ✅ received_date was set';
  ELSE
    RAISE EXCEPTION 'received_date was not set!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 7: Verify items were marked as received
  -- ============================================
  RAISE NOTICE '📋 Step 7: Verifying items were received...';
  
  IF EXISTS (
    SELECT 1 FROM lats_purchase_order_items 
    WHERE purchase_order_id = v_po_id 
    AND quantity_received = 10
  ) THEN
    RAISE NOTICE '   ✅ Items marked as received (10 units)';
  ELSE
    RAISE EXCEPTION 'Items were not marked as received!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 8: Verify inventory adjustment was created
  -- ============================================
  RAISE NOTICE '📊 Step 8: Verifying inventory adjustment...';
  
  IF EXISTS (
    SELECT 1 FROM lats_inventory_adjustments 
    WHERE variant_id = v_variant_id
    AND type = 'purchase_order'
    AND quantity = 10
    AND reason LIKE '%' || v_po_id::TEXT || '%'
  ) THEN
    RAISE NOTICE '   ✅ Inventory adjustment created (type: purchase_order, qty: 10)';
  ELSE
    RAISE EXCEPTION 'Inventory adjustment was not created!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 9: Verify stock was updated
  -- ============================================
  RAISE NOTICE '📦 Step 9: Verifying stock levels AFTER...';
  
  SELECT quantity INTO v_stock_after FROM lats_product_variants WHERE id = v_variant_id;
  RAISE NOTICE '   📦 Stock BEFORE: %', v_stock_before;
  RAISE NOTICE '   📦 Stock AFTER:  %', v_stock_after;
  RAISE NOTICE '   📈 Stock CHANGE: +%', (v_stock_after - v_stock_before);
  
  IF v_stock_after = v_stock_before + 10 THEN
    RAISE NOTICE '   ✅ Stock increased correctly by 10 units!';
  ELSE
    RAISE EXCEPTION 'Stock did not increase correctly! Expected: %, Got: %', 
      v_stock_before + 10, v_stock_after;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 10: Test get_received_items_for_po function
  -- ============================================
  RAISE NOTICE '🔍 Step 10: Testing get_received_items_for_po()...';
  
  IF EXISTS (
    SELECT 1 FROM get_received_items_for_po(v_po_id)
  ) THEN
    RAISE NOTICE '   ✅ get_received_items_for_po() works (found items)';
  ELSE
    RAISE NOTICE '   ⚠️  get_received_items_for_po() returned no items (expected if not using lats_inventory_items table)';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 11: Test get_purchase_order_receive_summary function
  -- ============================================
  RAISE NOTICE '📊 Step 11: Testing get_purchase_order_receive_summary()...';
  
  IF EXISTS (
    SELECT 1 FROM get_purchase_order_receive_summary(v_po_id)
    WHERE total_received = 10
  ) THEN
    RAISE NOTICE '   ✅ get_purchase_order_receive_summary() works (shows 10 received)';
  ELSE
    RAISE EXCEPTION 'get_purchase_order_receive_summary() did not return correct data!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- FINAL SUMMARY
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 ALL TESTS PASSED! WORKFLOW IS WORKING CORRECTLY!';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Test Summary:';
  RAISE NOTICE '   • Purchase order created: %', v_po_number;
  RAISE NOTICE '   • PO status: received';
  RAISE NOTICE '   • Items received: 10 units';
  RAISE NOTICE '   • Stock before: % units', v_stock_before;
  RAISE NOTICE '   • Stock after: % units', v_stock_after;
  RAISE NOTICE '   • Stock increase: +10 units';
  RAISE NOTICE '   • Inventory adjustment: created';
  RAISE NOTICE '   • RPC functions: working';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Test via UI at: http://localhost:3000/lats/purchase-order/create';
  RAISE NOTICE '   2. Create a PO with products';
  RAISE NOTICE '   3. Click "Complete Receive" button';
  RAISE NOTICE '   4. Verify inventory increased';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

-- ============================================
-- Show recent purchase orders
-- ============================================
SELECT 
  '📋 Recent Purchase Orders:' as info,
  po_number,
  status,
  total_amount,
  received_date,
  created_at
FROM lats_purchase_orders
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- Show recent inventory adjustments
-- ============================================
SELECT 
  '📊 Recent Inventory Adjustments:' as info,
  type,
  quantity,
  reason,
  created_at
FROM lats_inventory_adjustments
ORDER BY created_at DESC
LIMIT 5;

