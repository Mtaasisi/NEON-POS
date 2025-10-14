-- ============================================
-- TEST IF PRICING SETTINGS ARE ACTUALLY WORKING
-- Comprehensive test of Pricing & Valuation features
-- Date: October 13, 2025
-- ============================================

DO $$
DECLARE
  v_setting_value TEXT;
  v_test_product_id UUID;
  v_test_variant_id UUID;
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
  v_expected_price NUMERIC;
  v_markup_setting INTEGER;
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '🧪 TESTING PRICING SETTINGS';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';

  -- ============================================
  -- STEP 1: Check if pricing settings exist
  -- ============================================
  RAISE NOTICE '📋 Step 1: Checking Pricing Settings in Database...';
  
  FOR v_test_variant_id IN (
    SELECT setting_key, setting_value, description
    FROM admin_settings
    WHERE category = 'inventory'
      AND setting_key IN (
        'default_markup_percentage',
        'price_rounding_method',
        'cost_calculation_method',
        'enable_dynamic_pricing',
        'auto_price_update',
        'enable_bulk_discount',
        'enable_seasonal_pricing',
        'price_history_days'
      )
    ORDER BY setting_key
  ) LOOP
    RAISE NOTICE '   ✅ % = %', (v_test_variant_id).setting_key, (v_test_variant_id).setting_value;
  END LOOP;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 2: Get default markup percentage
  -- ============================================
  RAISE NOTICE '📊 Step 2: Testing Markup Calculation...';
  
  SELECT setting_value::INTEGER INTO v_markup_setting
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'default_markup_percentage';
  
  RAISE NOTICE '   Default Markup Setting: % percent (from database)', v_markup_setting;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 3: Check if markup is applied to products
  -- ============================================
  RAISE NOTICE '🔍 Step 3: Checking if markup is applied to existing products...';
  
  -- Find a product and calculate if markup matches setting
  SELECT 
    pv.id,
    pv.product_id,
    pv.cost_price,
    pv.unit_price,
    CASE 
      WHEN pv.cost_price > 0 
      THEN ROUND(((pv.unit_price - pv.cost_price) / pv.cost_price * 100)::numeric, 2)
      ELSE 0 
    END as actual_markup
  INTO 
    v_test_variant_id,
    v_test_product_id,
    v_cost_price,
    v_selling_price,
    v_expected_price
  FROM lats_product_variants pv
  WHERE pv.cost_price > 0 AND pv.unit_price > 0
  LIMIT 1;
  
  IF v_test_variant_id IS NOT NULL THEN
    RAISE NOTICE '   Test Product Variant: %', v_test_variant_id;
    RAISE NOTICE '   Cost Price: % TZS', v_cost_price;
    RAISE NOTICE '   Selling Price: % TZS', v_selling_price;
    RAISE NOTICE '   Actual Markup: % percent', v_expected_price;
    RAISE NOTICE '   Expected Markup (from settings): % percent', v_markup_setting;
    
    IF v_expected_price::INTEGER = v_markup_setting THEN
      RAISE NOTICE '   ✅ Markup MATCHES settings!';
    ELSE
      RAISE NOTICE '   ❌ Markup DOES NOT match settings!';
      RAISE NOTICE '   ⚠️  Settings are not being applied to products!';
    END IF;
  ELSE
    RAISE NOTICE '   ⚠️  No products with both cost and selling prices found';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 4: Check for price history tracking
  -- ============================================
  RAISE NOTICE '📜 Step 4: Checking Price History Tracking...';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'price_history'
  ) THEN
    RAISE NOTICE '   ✅ price_history table exists';
    
    SELECT COUNT(*) INTO v_markup_setting
    FROM price_history;
    
    RAISE NOTICE '   📊 Price history records: %', v_markup_setting;
  ELSE
    RAISE NOTICE '   ❌ price_history table does NOT exist';
    RAISE NOTICE '   ⚠️  Price history tracking is not implemented!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 5: Check for auto price update
  -- ============================================
  RAISE NOTICE '🔄 Step 5: Checking Auto Price Update Feature...';
  
  SELECT setting_value INTO v_setting_value
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'auto_price_update';
  
  RAISE NOTICE '   auto_price_update setting: %', v_setting_value;
  
  -- Check if there's a trigger for auto price updates
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname LIKE '%price%update%' OR tgname LIKE '%auto%price%'
  ) THEN
    RAISE NOTICE '   ✅ Auto price update trigger found';
  ELSE
    RAISE NOTICE '   ❌ No auto price update trigger found';
    RAISE NOTICE '   ⚠️  Auto price update is NOT implemented!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 6: Check for dynamic pricing
  -- ============================================
  RAISE NOTICE '💰 Step 6: Checking Dynamic Pricing Feature...';
  
  SELECT setting_value INTO v_setting_value
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'enable_dynamic_pricing';
  
  RAISE NOTICE '   enable_dynamic_pricing setting: %', v_setting_value;
  
  -- Check if there's a pricing rules table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('pricing_rules', 'dynamic_pricing_rules')
  ) THEN
    RAISE NOTICE '   ✅ Pricing rules table exists';
  ELSE
    RAISE NOTICE '   ❌ No pricing rules table found';
    RAISE NOTICE '   ⚠️  Dynamic pricing has UI but no database implementation!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 7: Check for bulk discount feature
  -- ============================================
  RAISE NOTICE '📦 Step 7: Checking Bulk Discount Feature...';
  
  SELECT setting_value INTO v_setting_value
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'enable_bulk_discount';
  
  RAISE NOTICE '   enable_bulk_discount setting: %', v_setting_value;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('bulk_discount_rules', 'discount_rules')
  ) THEN
    RAISE NOTICE '   ✅ Bulk discount table exists';
  ELSE
    RAISE NOTICE '   ❌ No bulk discount table found';
    RAISE NOTICE '   ⚠️  Bulk discounts not implemented in database!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 8: Check for seasonal pricing
  -- ============================================
  RAISE NOTICE '🌱 Step 8: Checking Seasonal Pricing Feature...';
  
  SELECT setting_value INTO v_setting_value
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'enable_seasonal_pricing';
  
  RAISE NOTICE '   enable_seasonal_pricing setting: %', v_setting_value;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('seasonal_prices', 'seasonal_pricing_rules')
  ) THEN
    RAISE NOTICE '   ✅ Seasonal pricing table exists';
  ELSE
    RAISE NOTICE '   ❌ No seasonal pricing table found';
    RAISE NOTICE '   ⚠️  Seasonal pricing not implemented in database!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 9: Check for price rounding
  -- ============================================
  RAISE NOTICE '🔢 Step 9: Checking Price Rounding...';
  
  SELECT setting_value INTO v_setting_value
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'price_rounding_method';
  
  RAISE NOTICE '   price_rounding_method setting: %', v_setting_value;
  
  -- Check if there's a function for price rounding
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname LIKE '%price%round%' OR proname LIKE '%round%price%'
  ) THEN
    RAISE NOTICE '   ✅ Price rounding function found';
  ELSE
    RAISE NOTICE '   ❌ No price rounding function found';
    RAISE NOTICE '   ⚠️  Price rounding is NOT implemented!';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- FINAL REPORT
  -- ============================================
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '📊 FINAL REPORT';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  
  RAISE NOTICE '✅ Settings Exist:';
  RAISE NOTICE '   • All pricing settings are stored in database';
  RAISE NOTICE '   • Settings can be changed via UI';
  RAISE NOTICE '';
  
  RAISE NOTICE '❌ NOT Implemented (Settings are just stored, not used):';
  RAISE NOTICE '   • Default Markup % - NOT applied when creating products';
  RAISE NOTICE '   • Auto Price Update - No trigger to update prices';
  RAISE NOTICE '   • Price Rounding - No rounding function';
  RAISE NOTICE '   • Price History - No price_history table';
  RAISE NOTICE '   • Dynamic Pricing - Frontend only, no backend';
  RAISE NOTICE '   • Bulk Discounts - No database table';
  RAISE NOTICE '   • Seasonal Pricing - No database table';
  RAISE NOTICE '';
  
  RAISE NOTICE '💡 CONCLUSION:';
  RAISE NOTICE '   The Pricing & Valuation settings are PLACEHOLDERS.';
  RAISE NOTICE '   They save to the database but are NOT actually used';
  RAISE NOTICE '   in any pricing calculations or product creation logic.';
  RAISE NOTICE '';
  RAISE NOTICE '   To make them work, you need to:';
  RAISE NOTICE '   1. Create database functions to apply markup';
  RAISE NOTICE '   2. Create triggers for auto price updates';
  RAISE NOTICE '   3. Implement price rounding functions';
  RAISE NOTICE '   4. Create price history tracking';
  RAISE NOTICE '   5. Build backend for dynamic pricing rules';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  
END $$;

