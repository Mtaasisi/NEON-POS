-- ============================================
-- DIAGNOSTIC SCRIPT FOR 400 ERRORS
-- Run this to find out what's causing the issues
-- ============================================

-- 1. Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename LIKE 'lats_pos%'
ORDER BY tablename;

-- 2. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename LIKE 'lats_pos%'
ORDER BY tablename, policyname;

-- 3. Check current user/role
SELECT current_user, session_user, current_role;

-- 4. Check auth.uid() function (if using Supabase)
-- This might fail if not using Supabase, that's OK
-- SELECT auth.uid();

-- 5. Check if any records exist in settings tables
SELECT 'lats_pos_general_settings' as table_name, COUNT(*) as record_count 
FROM lats_pos_general_settings
UNION ALL
SELECT 'lats_pos_receipt_settings', COUNT(*) FROM lats_pos_receipt_settings
UNION ALL
SELECT 'lats_pos_advanced_settings', COUNT(*) FROM lats_pos_advanced_settings
UNION ALL
SELECT 'lats_pos_dynamic_pricing_settings', COUNT(*) FROM lats_pos_dynamic_pricing_settings
UNION ALL
SELECT 'lats_pos_barcode_scanner_settings', COUNT(*) FROM lats_pos_barcode_scanner_settings
UNION ALL
SELECT 'lats_pos_delivery_settings', COUNT(*) FROM lats_pos_delivery_settings
UNION ALL
SELECT 'lats_pos_search_filter_settings', COUNT(*) FROM lats_pos_search_filter_settings
UNION ALL
SELECT 'lats_pos_user_permissions_settings', COUNT(*) FROM lats_pos_user_permissions_settings
UNION ALL
SELECT 'lats_pos_loyalty_customer_settings', COUNT(*) FROM lats_pos_loyalty_customer_settings
UNION ALL
SELECT 'lats_pos_analytics_reporting_settings', COUNT(*) FROM lats_pos_analytics_reporting_settings
UNION ALL
SELECT 'lats_pos_notification_settings', COUNT(*) FROM lats_pos_notification_settings;

-- 6. Try to query one table directly to see the actual error
SELECT * FROM lats_pos_general_settings LIMIT 1;

-- 7. Check if auth_users table has your user
SELECT id, email, role FROM auth_users WHERE email = 'admin@pos.com';

