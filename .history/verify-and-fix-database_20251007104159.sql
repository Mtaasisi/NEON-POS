-- ============================================
-- STEP 1: Verify Current State
-- ============================================
-- Run this first to see which tables are missing
SELECT 
  'lats_pos_general_settings' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_general_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'lats_pos_receipt_settings', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_receipt_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_advanced_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_advanced_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_dynamic_pricing_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_dynamic_pricing_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_barcode_scanner_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_barcode_scanner_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_delivery_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_delivery_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_search_filter_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_search_filter_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_user_permissions_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_user_permissions_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_loyalty_customer_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_loyalty_customer_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_analytics_reporting_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_analytics_reporting_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'lats_pos_notification_settings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_notification_settings') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
ORDER BY table_name;

-- ============================================
-- AFTER REVIEWING THE RESULTS ABOVE:
-- If you see MISSING tables, copy and run the 
-- entire contents of fix-missing-settings-tables.sql
-- ============================================

