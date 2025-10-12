-- ============================================
-- VERIFY POS SETTINGS TABLES EXIST
-- Run this in your Neon database console
-- ============================================

-- Check if all required settings tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'lats_pos_general_settings',
  'lats_pos_dynamic_pricing_settings',
  'lats_pos_receipt_settings',
  'lats_pos_barcode_scanner_settings',
  'lats_pos_delivery_settings',
  'lats_pos_search_filter_settings',
  'lats_pos_user_permissions_settings',
  'lats_pos_loyalty_customer_settings',
  'lats_pos_analytics_reporting_settings',
  'lats_pos_notification_settings',
  'lats_pos_advanced_settings'
)
ORDER BY table_name;

-- Count of settings records per table
SELECT 
  'lats_pos_general_settings' as table_name,
  COUNT(*) as record_count
FROM lats_pos_general_settings
UNION ALL
SELECT 
  'lats_pos_dynamic_pricing_settings',
  COUNT(*)
FROM lats_pos_dynamic_pricing_settings
UNION ALL
SELECT 
  'lats_pos_receipt_settings',
  COUNT(*)
FROM lats_pos_receipt_settings
UNION ALL
SELECT 
  'lats_pos_barcode_scanner_settings',
  COUNT(*)
FROM lats_pos_barcode_scanner_settings
UNION ALL
SELECT 
  'lats_pos_delivery_settings',
  COUNT(*)
FROM lats_pos_delivery_settings
UNION ALL
SELECT 
  'lats_pos_search_filter_settings',
  COUNT(*)
FROM lats_pos_search_filter_settings
UNION ALL
SELECT 
  'lats_pos_user_permissions_settings',
  COUNT(*)
FROM lats_pos_user_permissions_settings
UNION ALL
SELECT 
  'lats_pos_loyalty_customer_settings',
  COUNT(*)
FROM lats_pos_loyalty_customer_settings
UNION ALL
SELECT 
  'lats_pos_analytics_reporting_settings',
  COUNT(*)
FROM lats_pos_analytics_reporting_settings
UNION ALL
SELECT 
  'lats_pos_notification_settings',
  COUNT(*)
FROM lats_pos_notification_settings
UNION ALL
SELECT 
  'lats_pos_advanced_settings',
  COUNT(*)
FROM lats_pos_advanced_settings;

-- Check for RLS policies on settings tables
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ HAS RLS'
    ELSE '⚠️ NO RLS'
  END as security_status
FROM pg_policies
WHERE tablename LIKE 'lats_pos_%_settings'
ORDER BY tablename;

-- Show sample data from general settings
SELECT 
  id,
  user_id,
  business_name,
  currency,
  theme,
  language,
  created_at,
  updated_at
FROM lats_pos_general_settings
LIMIT 5;

