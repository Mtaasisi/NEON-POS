-- Quick check to see what's causing the 400 errors
-- Run this first to diagnose the exact issue

-- Check which settings tables actually exist
SELECT 
  t.table_name,
  CASE 
    WHEN t.table_name IS NOT NULL THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM (
  VALUES 
    ('lats_pos_general_settings'),
    ('lats_pos_receipt_settings'),
    ('lats_pos_advanced_settings'),
    ('lats_pos_dynamic_pricing_settings'),
    ('lats_pos_barcode_scanner_settings'),
    ('lats_pos_delivery_settings'),
    ('lats_pos_search_filter_settings'),
    ('lats_pos_user_permissions_settings'),
    ('lats_pos_loyalty_customer_settings'),
    ('lats_pos_analytics_reporting_settings'),
    ('lats_pos_notification_settings')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = expected.table_name 
  AND t.table_schema = 'public'
ORDER BY expected.table_name;

-- Check RLS status on existing tables
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS Enabled'
    ELSE '🔓 RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE tablename LIKE 'lats_pos%settings'
ORDER BY tablename;

