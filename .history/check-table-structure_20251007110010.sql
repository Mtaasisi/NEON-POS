-- Check if the table columns match what the app expects
-- This could be causing 400 errors if columns are missing or have wrong types

-- Check the actual structure of each settings table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN (
  'lats_pos_general_settings',
  'lats_pos_receipt_settings',
  'lats_pos_advanced_settings',
  'lats_pos_dynamic_pricing_settings',
  'lats_pos_barcode_scanner_settings',
  'lats_pos_delivery_settings',
  'lats_pos_search_filter_settings',
  'lats_pos_user_permissions_settings',
  'lats_pos_loyalty_customer_settings',
  'lats_pos_analytics_reporting_settings',
  'lats_pos_notification_settings'
)
ORDER BY table_name, ordinal_position;

-- Also check if there are ANY records at all in these tables
SELECT 
  'lats_pos_general_settings' as table_name, 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM lats_pos_general_settings
UNION ALL
SELECT 'lats_pos_receipt_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_receipt_settings
UNION ALL
SELECT 'lats_pos_advanced_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_advanced_settings
UNION ALL
SELECT 'lats_pos_dynamic_pricing_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_dynamic_pricing_settings
UNION ALL
SELECT 'lats_pos_barcode_scanner_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_barcode_scanner_settings
UNION ALL
SELECT 'lats_pos_delivery_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_delivery_settings
UNION ALL
SELECT 'lats_pos_search_filter_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_search_filter_settings
UNION ALL
SELECT 'lats_pos_user_permissions_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_user_permissions_settings
UNION ALL
SELECT 'lats_pos_loyalty_customer_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_loyalty_customer_settings
UNION ALL
SELECT 'lats_pos_analytics_reporting_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_analytics_reporting_settings
UNION ALL
SELECT 'lats_pos_notification_settings', COUNT(*), COUNT(DISTINCT user_id)
FROM lats_pos_notification_settings;

