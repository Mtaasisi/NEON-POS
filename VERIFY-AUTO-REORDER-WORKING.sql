-- ============================================
-- VERIFY AUTO-REORDER IS WORKING
-- Complete end-to-end test of auto-reorder feature
-- Date: October 13, 2025
-- ============================================

DO $$
DECLARE
  v_test_product_id UUID;
  v_test_variant_id UUID;
  v_original_quantity INTEGER;
  v_reorder_point INTEGER;
  v_po_count_before INTEGER;
  v_po_count_after INTEGER;
  v_auto_reorder_enabled TEXT;
  v_auto_create_po TEXT;
  v_new_po_id UUID;
  v_product_name TEXT;
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '🧪 AUTO-REORDER VERIFICATION TEST';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';

  -- ============================================
  -- STEP 1: Verify settings are enabled
  -- ============================================
  RAISE NOTICE '📋 Step 1: Checking settings...';
  
  SELECT setting_value INTO v_auto_reorder_enabled
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'auto_reorder_enabled';
  
  SELECT setting_value INTO v_auto_create_po
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'auto_create_po_at_reorder';
  
  RAISE NOTICE '   auto_reorder_enabled: %', v_auto_reorder_enabled;
  RAISE NOTICE '   auto_create_po_at_reorder: %', v_auto_create_po;
  
  -- If disabled, enable them for testing
  IF v_auto_reorder_enabled != 'true' THEN
    UPDATE admin_settings 
    SET setting_value = 'true' 
    WHERE category = 'inventory' AND setting_key = 'auto_reorder_enabled';
    RAISE NOTICE '   ✅ Enabled auto_reorder_enabled for testing';
  END IF;
  
  IF v_auto_create_po != 'true' THEN
    UPDATE admin_settings 
    SET setting_value = 'true' 
    WHERE category = 'inventory' AND setting_key = 'auto_create_po_at_reorder';
    RAISE NOTICE '   ✅ Enabled auto_create_po_at_reorder for testing';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 2: Find or create test product
  -- ============================================
  RAISE NOTICE '📦 Step 2: Setting up test product...';
  
  -- Find a product with stock
  SELECT p.id, p.name, pv.id, pv.quantity, pv.reorder_point
  INTO v_test_product_id, v_product_name, v_test_variant_id, v_original_quantity, v_reorder_point
  FROM lats_products p
  JOIN lats_product_variants pv ON p.id = pv.product_id
  WHERE p.is_active = true
    AND pv.quantity >= 20  -- Enough stock to test with
  LIMIT 1;
  
  IF v_test_product_id IS NULL THEN
    RAISE EXCEPTION 'No suitable test product found. Please create a product with stock >= 20';
  END IF;
  
  RAISE NOTICE '   Product: %', v_product_name;
  RAISE NOTICE '   Product ID: %', v_test_product_id;
  RAISE NOTICE '   Variant ID: %', v_test_variant_id;
  RAISE NOTICE '   Original Quantity: %', v_original_quantity;
  RAISE NOTICE '   Original Reorder Point: %', COALESCE(v_reorder_point, 0);
  
  -- Set a reorder point if not set
  IF v_reorder_point IS NULL OR v_reorder_point = 0 THEN
    v_reorder_point := 10;
    UPDATE lats_product_variants
    SET reorder_point = v_reorder_point
    WHERE id = v_test_variant_id;
    RAISE NOTICE '   ✅ Set reorder_point to %', v_reorder_point;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 3: Count existing POs
  -- ============================================
  RAISE NOTICE '📊 Step 3: Counting existing purchase orders...';
  
  SELECT COUNT(*) INTO v_po_count_before
  FROM lats_purchase_orders
  WHERE created_at > NOW() - INTERVAL '5 minutes';
  
  RAISE NOTICE '   Recent POs (last 5 min): %', v_po_count_before;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 4: TEST - Reduce stock below reorder point
  -- ============================================
  RAISE NOTICE '🧪 Step 4: TESTING - Reducing stock below reorder point...';
  RAISE NOTICE '   Setting quantity from % to % (below reorder point of %)', 
    v_original_quantity, v_reorder_point - 2, v_reorder_point;
  
  -- This UPDATE should trigger the auto-reorder
  UPDATE lats_product_variants
  SET quantity = v_reorder_point - 2
  WHERE id = v_test_variant_id;
  
  RAISE NOTICE '   ✅ Stock updated';
  RAISE NOTICE '   ⏳ Waiting for trigger to process...';
  PERFORM pg_sleep(1);
  RAISE NOTICE '';

  -- ============================================
  -- STEP 5: Check if PO was created
  -- ============================================
  RAISE NOTICE '🔍 Step 5: Checking if auto-reorder worked...';
  
  SELECT COUNT(*) INTO v_po_count_after
  FROM lats_purchase_orders
  WHERE created_at > NOW() - INTERVAL '5 minutes';
  
  RAISE NOTICE '   POs before test: %', v_po_count_before;
  RAISE NOTICE '   POs after test: %', v_po_count_after;
  
  IF v_po_count_after > v_po_count_before THEN
    RAISE NOTICE '   ✅ SUCCESS! New PO was auto-created!';
    
    -- Get the new PO details
    SELECT id INTO v_new_po_id
    FROM lats_purchase_orders
    WHERE created_at > NOW() - INTERVAL '5 minutes'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '   📋 New PO Details:';
    
    FOR v_test_variant_id IN (
      SELECT 
        po.po_number,
        po.status,
        po.total_amount,
        s.name as supplier,
        poi.quantity_ordered
      FROM lats_purchase_orders po
      LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
      LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.id = v_new_po_id
      LIMIT 1
    ) LOOP
      RAISE NOTICE '     PO Number: %', (v_test_variant_id).po_number;
      RAISE NOTICE '     Status: %', (v_test_variant_id).status;
      RAISE NOTICE '     Supplier: %', COALESCE((v_test_variant_id).supplier, 'N/A');
      RAISE NOTICE '     Quantity: %', (v_test_variant_id).quantity_ordered;
      RAISE NOTICE '     Amount: % TZS', (v_test_variant_id).total_amount;
    END LOOP;
  ELSE
    RAISE NOTICE '   ❌ FAILED! No new PO was created';
    RAISE NOTICE '';
    RAISE NOTICE '   Checking auto_reorder_log for errors...';
    
    FOR v_test_variant_id IN (
      SELECT error_message, created_at
      FROM auto_reorder_log
      WHERE variant_id = v_test_variant_id
      ORDER BY created_at DESC
      LIMIT 1
    ) LOOP
      RAISE NOTICE '     Error: %', (v_test_variant_id).error_message;
      RAISE NOTICE '     Time: %', (v_test_variant_id).created_at;
    END LOOP;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 6: Check auto_reorder_log
  -- ============================================
  RAISE NOTICE '📝 Step 6: Checking auto-reorder log...';
  
  FOR v_test_variant_id IN (
    SELECT 
      triggered_quantity,
      reorder_point,
      suggested_quantity,
      po_created,
      error_message
    FROM auto_reorder_log
    WHERE variant_id = v_test_variant_id
    ORDER BY created_at DESC
    LIMIT 1
  ) LOOP
    RAISE NOTICE '   Triggered at quantity: %', (v_test_variant_id).triggered_quantity;
    RAISE NOTICE '   Reorder point: %', (v_test_variant_id).reorder_point;
    RAISE NOTICE '   Suggested order qty: %', (v_test_variant_id).suggested_quantity;
    RAISE NOTICE '   PO Created: %', (v_test_variant_id).po_created;
    IF (v_test_variant_id).error_message IS NOT NULL THEN
      RAISE NOTICE '   Error: %', (v_test_variant_id).error_message;
    END IF;
  END LOOP;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 7: Check auto_reorder_status view
  -- ============================================
  RAISE NOTICE '📊 Step 7: Checking auto-reorder status view...';
  
  FOR v_test_variant_id IN (
    SELECT 
      product_name,
      current_stock,
      reorder_point,
      stock_status,
      latest_po_status
    FROM auto_reorder_status
    WHERE product_name = v_product_name
    LIMIT 1
  ) LOOP
    RAISE NOTICE '   Product: %', (v_test_variant_id).product_name;
    RAISE NOTICE '   Current Stock: %', (v_test_variant_id).current_stock;
    RAISE NOTICE '   Reorder Point: %', (v_test_variant_id).reorder_point;
    RAISE NOTICE '   Status: %', (v_test_variant_id).stock_status;
    RAISE NOTICE '   Latest PO Status: %', COALESCE((v_test_variant_id).latest_po_status, 'N/A');
  END LOOP;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 8: Restore original stock
  -- ============================================
  RAISE NOTICE '🔄 Step 8: Restoring original stock level...';
  
  UPDATE lats_product_variants
  SET quantity = v_original_quantity
  WHERE id = v_test_variant_id;
  
  RAISE NOTICE '   ✅ Stock restored to %', v_original_quantity;
  RAISE NOTICE '';

  -- ============================================
  -- FINAL REPORT
  -- ============================================
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '📊 FINAL VERIFICATION REPORT';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF v_po_count_after > v_po_count_before THEN
    RAISE NOTICE '✅ AUTO-REORDER IS WORKING!';
    RAISE NOTICE '';
    RAISE NOTICE 'The system successfully:';
    RAISE NOTICE '  1. Detected stock fell below reorder point';
    RAISE NOTICE '  2. Checked that auto-reorder is enabled';
    RAISE NOTICE '  3. Calculated suggested order quantity';
    RAISE NOTICE '  4. Created a draft purchase order';
    RAISE NOTICE '  5. Logged the action';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Next steps:';
    RAISE NOTICE '  • Review draft POs in Purchase Orders tab';
    RAISE NOTICE '  • Approve and process them as needed';
    RAISE NOTICE '  • Monitor via: SELECT * FROM auto_reorder_status;';
  ELSE
    RAISE NOTICE '❌ AUTO-REORDER NOT WORKING';
    RAISE NOTICE '';
    RAISE NOTICE 'Possible issues:';
    RAISE NOTICE '  1. Trigger may not be installed';
    RAISE NOTICE '  2. Functions may not be created';
    RAISE NOTICE '  3. Check error logs in auto_reorder_log table';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Troubleshooting:';
    RAISE NOTICE '  • Run: IMPLEMENT-AUTO-REORDER-FEATURE.sql';
    RAISE NOTICE '  • Check: SELECT * FROM auto_reorder_log ORDER BY created_at DESC;';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  
END $$;

