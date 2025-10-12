-- ============================================
-- QUICK DIAGNOSTIC - Find the 400 Error Cause
-- ============================================

-- 1. Check RLS Status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '🔒 RLS ENABLED (might be blocking)' 
       ELSE '🔓 RLS DISABLED (good)' END as status
FROM pg_tables 
WHERE tablename LIKE 'lats_pos%'
ORDER BY tablename;

-- 2. Check if tables are empty
SELECT 
  (SELECT COUNT(*) FROM lats_pos_general_settings) as general_count,
  (SELECT COUNT(*) FROM lats_pos_receipt_settings) as receipt_count,
  (SELECT COUNT(*) FROM lats_pos_advanced_settings) as advanced_count,
  (SELECT COUNT(*) FROM lats_pos_dynamic_pricing_settings) as pricing_count,
  (SELECT COUNT(*) FROM lats_pos_barcode_scanner_settings) as scanner_count,
  (SELECT COUNT(*) FROM lats_pos_delivery_settings) as delivery_count,
  (SELECT COUNT(*) FROM lats_pos_search_filter_settings) as search_count,
  (SELECT COUNT(*) FROM lats_pos_user_permissions_settings) as permissions_count,
  (SELECT COUNT(*) FROM lats_pos_loyalty_customer_settings) as loyalty_count,
  (SELECT COUNT(*) FROM lats_pos_analytics_reporting_settings) as analytics_count,
  (SELECT COUNT(*) FROM lats_pos_notification_settings) as notification_count;

-- 3. Check your user
SELECT id, email, role, is_active 
FROM auth_users 
WHERE email = 'admin@pos.com';

-- 4. Try to query with user_id filter (like the code does)
SELECT * FROM lats_pos_general_settings 
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
LIMIT 1;

-- 5. Check if RLS policies exist
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename LIKE 'lats_pos%'
ORDER BY tablename;

