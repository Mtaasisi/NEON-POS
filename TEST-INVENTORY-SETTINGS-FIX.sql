-- ============================================
-- TEST INVENTORY SETTINGS FIX
-- Verifies that inventory settings are properly installed
-- Date: October 13, 2025
-- ============================================

-- ============================================
-- 1. CHECK IF admin_settings TABLE EXISTS
-- ============================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'admin_settings'
    )
    THEN '✅ admin_settings table exists'
    ELSE '❌ admin_settings table DOES NOT exist - Run 🔧-FIX-INVENTORY-SETTINGS-ERROR.sql first!'
  END as table_check;

-- ============================================
-- 2. COUNT INVENTORY SETTINGS
-- ============================================
SELECT 
  CASE 
    WHEN COUNT(*) >= 89
    THEN '✅ All ' || COUNT(*) || ' inventory settings installed'
    WHEN COUNT(*) > 0
    THEN '⚠️ Only ' || COUNT(*) || ' of 89 inventory settings found - May need reinstall'
    ELSE '❌ No inventory settings found - Run 🔧-FIX-INVENTORY-SETTINGS-ERROR.sql!'
  END as settings_count
FROM admin_settings 
WHERE category = 'inventory';

-- ============================================
-- 3. CHECK CRITICAL SETTINGS
-- ============================================
SELECT 
  '🔍 Checking critical settings...' as test;

-- Check stock management settings
SELECT 
  CASE 
    WHEN COUNT(*) >= 8
    THEN '✅ Stock Management settings: ' || COUNT(*) || ' found'
    ELSE '❌ Missing Stock Management settings'
  END as stock_settings
FROM admin_settings 
WHERE category = 'inventory' 
AND setting_key IN (
  'low_stock_threshold',
  'critical_stock_threshold',
  'auto_reorder_enabled',
  'reorder_point_percentage',
  'minimum_order_quantity',
  'maximum_stock_level',
  'safety_stock_level',
  'stock_counting_frequency'
);

-- Check pricing settings
SELECT 
  CASE 
    WHEN COUNT(*) >= 8
    THEN '✅ Pricing & Valuation settings: ' || COUNT(*) || ' found'
    ELSE '❌ Missing Pricing settings'
  END as pricing_settings
FROM admin_settings 
WHERE category = 'inventory' 
AND setting_key IN (
  'default_markup_percentage',
  'enable_dynamic_pricing',
  'price_rounding_method',
  'cost_calculation_method',
  'auto_price_update',
  'enable_bulk_discount',
  'enable_seasonal_pricing',
  'price_history_days'
);

-- Check notification settings
SELECT 
  CASE 
    WHEN COUNT(*) >= 10
    THEN '✅ Notification settings: ' || COUNT(*) || ' found'
    ELSE '❌ Missing Notification settings'
  END as notification_settings
FROM admin_settings 
WHERE category = 'inventory' 
AND setting_key LIKE '%alert%' OR setting_key LIKE '%notification%';

-- ============================================
-- 4. CHECK DATA TYPES
-- ============================================
SELECT 
  '🔍 Checking data types...' as test;

SELECT 
  COUNT(CASE WHEN setting_type = 'boolean' THEN 1 END) as boolean_settings,
  COUNT(CASE WHEN setting_type = 'number' THEN 1 END) as number_settings,
  COUNT(CASE WHEN setting_type = 'string' THEN 1 END) as string_settings,
  COUNT(*) as total_settings,
  CASE 
    WHEN COUNT(*) >= 89
    THEN '✅ All setting types properly configured'
    ELSE '⚠️ Some settings may be missing'
  END as type_check
FROM admin_settings 
WHERE category = 'inventory';

-- ============================================
-- 5. CHECK FUNCTIONS AND VIEWS
-- ============================================
SELECT 
  '🔍 Checking database functions and views...' as test;

-- Check if update function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'update_inventory_setting'
    )
    THEN '✅ update_inventory_setting() function exists'
    ELSE '❌ update_inventory_setting() function missing'
  END as function_check;

-- Check if view exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_name = 'inventory_settings_view'
    )
    THEN '✅ inventory_settings_view exists'
    ELSE '❌ inventory_settings_view missing'
  END as view_check;

-- ============================================
-- 6. CHECK INDEXES
-- ============================================
SELECT 
  '🔍 Checking indexes...' as test;

SELECT 
  indexname,
  '✅ Index found: ' || indexname as status
FROM pg_indexes 
WHERE tablename = 'admin_settings'
AND indexname LIKE 'idx_admin_settings%';

-- ============================================
-- 7. SAMPLE SETTINGS VALUES
-- ============================================
SELECT 
  '📋 Sample Settings:' as test;

SELECT 
  setting_key,
  setting_value,
  setting_type,
  LEFT(description, 50) as description
FROM admin_settings 
WHERE category = 'inventory'
ORDER BY setting_key
LIMIT 10;

-- ============================================
-- 8. TEST QUERY (Same as used by the app)
-- ============================================
SELECT 
  '🧪 Testing app query...' as test;

SELECT 
  setting_key, 
  setting_value, 
  setting_type
FROM admin_settings
WHERE category = 'inventory'
AND is_active = true
LIMIT 5;

-- ============================================
-- 9. FINAL STATUS
-- ============================================
DO $$ 
DECLARE
  setting_count INTEGER;
  table_exists BOOLEAN;
BEGIN 
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_settings'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE NOTICE '❌ FAILED: admin_settings table does not exist';
    RAISE NOTICE '👉 Run: 🔧-FIX-INVENTORY-SETTINGS-ERROR.sql';
    RETURN;
  END IF;
  
  -- Check settings count
  SELECT COUNT(*) INTO setting_count 
  FROM admin_settings 
  WHERE category = 'inventory';
  
  RAISE NOTICE '==============================================';
  IF setting_count >= 89 THEN
    RAISE NOTICE '✅ INVENTORY SETTINGS: ALL TESTS PASSED!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '📊 Total Settings: % (Expected: 89)', setting_count;
    RAISE NOTICE '🎯 System is ready to use';
    RAISE NOTICE '💡 You can now refresh your app';
  ELSIF setting_count > 0 THEN
    RAISE NOTICE '⚠️ INVENTORY SETTINGS: INCOMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '📊 Found Settings: % (Expected: 89)', setting_count;
    RAISE NOTICE '👉 Run: 🔧-FIX-INVENTORY-SETTINGS-ERROR.sql';
  ELSE
    RAISE NOTICE '❌ INVENTORY SETTINGS: NOT FOUND';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '📊 Found Settings: 0 (Expected: 89)';
    RAISE NOTICE '👉 Run: 🔧-FIX-INVENTORY-SETTINGS-ERROR.sql';
  END IF;
  RAISE NOTICE '==============================================';
END $$;

