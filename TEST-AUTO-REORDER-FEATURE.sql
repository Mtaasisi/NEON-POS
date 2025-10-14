-- ============================================
-- TEST AUTO REORDER FEATURE
-- This script tests if auto-reorder is working
-- Date: October 13, 2025
-- ============================================

DO $$
DECLARE
  v_setting_enabled TEXT;
  v_auto_create_po TEXT;
  v_low_threshold INTEGER;
  v_test_product_id UUID;
  v_test_variant_id UUID;
  v_current_stock INTEGER;
  v_reorder_point INTEGER;
  v_po_count_before INTEGER;
  v_po_count_after INTEGER;
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '🧪 TESTING AUTO REORDER FEATURE';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';

  -- ============================================
  -- STEP 1: Check if auto_reorder settings exist
  -- ============================================
  RAISE NOTICE '📋 Step 1: Checking Auto Reorder Settings...';
  
  SELECT setting_value INTO v_setting_enabled
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'auto_reorder_enabled';
  
  SELECT setting_value INTO v_auto_create_po
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'auto_create_po_at_reorder';
  
  SELECT setting_value::INTEGER INTO v_low_threshold
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'low_stock_threshold';
  
  IF v_setting_enabled IS NULL THEN
    RAISE NOTICE '   ❌ Setting auto_reorder_enabled NOT FOUND';
  ELSE
    RAISE NOTICE '   ✅ auto_reorder_enabled = %', v_setting_enabled;
  END IF;
  
  IF v_auto_create_po IS NULL THEN
    RAISE NOTICE '   ❌ Setting auto_create_po_at_reorder NOT FOUND';
  ELSE
    RAISE NOTICE '   ✅ auto_create_po_at_reorder = %', v_auto_create_po;
  END IF;
  
  RAISE NOTICE '   ℹ️  low_stock_threshold = %', v_low_threshold;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 2: Find a test product
  -- ============================================
  RAISE NOTICE '📦 Step 2: Finding test product...';
  
  SELECT 
    p.id,
    pv.id,
    pv.quantity,
    pv.reorder_point
  INTO 
    v_test_product_id,
    v_test_variant_id,
    v_current_stock,
    v_reorder_point
  FROM lats_products p
  JOIN lats_product_variants pv ON p.id = pv.product_id
  WHERE p.is_active = true
    AND pv.reorder_point > 0
  LIMIT 1;
  
  IF v_test_product_id IS NULL THEN
    RAISE NOTICE '   ❌ No products found with reorder_point set';
    RAISE NOTICE '   💡 Please set reorder_point on some products first';
    RETURN;
  END IF;
  
  RAISE NOTICE '   ✅ Test Product ID: %', v_test_product_id;
  RAISE NOTICE '   ✅ Test Variant ID: %', v_test_variant_id;
  RAISE NOTICE '   📊 Current Stock: %', v_current_stock;
  RAISE NOTICE '   🎯 Reorder Point: %', v_reorder_point;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 3: Count existing POs
  -- ============================================
  RAISE NOTICE '📊 Step 3: Checking existing POs...';
  
  SELECT COUNT(*) INTO v_po_count_before
  FROM lats_purchase_orders
  WHERE created_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE '   📋 Recent POs (last minute): %', v_po_count_before;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 4: Check for auto-reorder functions
  -- ============================================
  RAISE NOTICE '🔍 Step 4: Checking for auto-reorder database functions...';
  
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'auto_create_purchase_order_for_low_stock'
  ) THEN
    RAISE NOTICE '   ✅ Function auto_create_purchase_order_for_low_stock EXISTS';
  ELSE
    RAISE NOTICE '   ❌ Function auto_create_purchase_order_for_low_stock NOT FOUND';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_and_create_reorder_po'
  ) THEN
    RAISE NOTICE '   ✅ Function check_and_create_reorder_po EXISTS';
  ELSE
    RAISE NOTICE '   ❌ Function check_and_create_reorder_po NOT FOUND';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 5: Check for triggers
  -- ============================================
  RAISE NOTICE '⚡ Step 5: Checking for auto-reorder triggers...';
  
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname LIKE '%auto%reorder%' OR tgname LIKE '%auto%po%'
  ) THEN
    RAISE NOTICE '   ✅ Auto-reorder trigger found';
    RAISE NOTICE '   Trigger details:';
    FOR v_test_product_id IN (
      SELECT tgname FROM pg_trigger 
      WHERE tgname LIKE '%auto%reorder%' OR tgname LIKE '%auto%po%'
    ) LOOP
      RAISE NOTICE '     - %', v_test_product_id;
    END LOOP;
  ELSE
    RAISE NOTICE '   ❌ No auto-reorder triggers found';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 6: Simulate stock decrease
  -- ============================================
  RAISE NOTICE '🧪 Step 6: Simulating stock decrease below reorder point...';
  
  IF v_reorder_point > 0 THEN
    -- Temporarily decrease stock to below reorder point
    RAISE NOTICE '   🔧 Setting stock to % (below reorder point of %)', 
      v_reorder_point - 1, v_reorder_point;
    
    UPDATE lats_product_variants
    SET quantity = v_reorder_point - 1
    WHERE id = v_test_variant_id;
    
    -- Wait a moment for any triggers
    PERFORM pg_sleep(2);
    
    -- Check if any POs were created
    SELECT COUNT(*) INTO v_po_count_after
    FROM lats_purchase_orders
    WHERE created_at > NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE '   📋 POs after stock decrease: %', v_po_count_after;
    
    IF v_po_count_after > v_po_count_before THEN
      RAISE NOTICE '   ✅ AUTO REORDER WORKING! New PO created automatically';
    ELSE
      RAISE NOTICE '   ❌ AUTO REORDER NOT WORKING! No PO created';
    END IF;
    
    -- Restore original stock
    UPDATE lats_product_variants
    SET quantity = v_current_stock
    WHERE id = v_test_variant_id;
    
    RAISE NOTICE '   🔄 Stock restored to original value: %', v_current_stock;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- FINAL REPORT
  -- ============================================
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '📊 FINAL REPORT';
  RAISE NOTICE '════════════════════════════════════════';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Settings Configured:';
  RAISE NOTICE '   • auto_reorder_enabled = %', COALESCE(v_setting_enabled, 'NOT SET');
  RAISE NOTICE '   • auto_create_po_at_reorder = %', COALESCE(v_auto_create_po, 'NOT SET');
  
  RAISE NOTICE '';
  RAISE NOTICE '❌ Missing Components:';
  RAISE NOTICE '   • Auto-reorder database functions';
  RAISE NOTICE '   • Auto-reorder triggers';
  RAISE NOTICE '   • Background job/service to monitor stock';
  
  RAISE NOTICE '';
  RAISE NOTICE '💡 CONCLUSION:';
  RAISE NOTICE '   The auto-reorder SETTINGS exist but the AUTOMATION LOGIC';
  RAISE NOTICE '   is NOT implemented. The feature needs to be built.';
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  
END $$;

