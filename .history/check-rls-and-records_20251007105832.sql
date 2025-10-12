-- Check RLS status and existing records for your admin user
SET search_path TO public;

-- 1. Check RLS status
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ENABLED (potential issue)'
    ELSE '🔓 RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE tablename LIKE 'lats_pos%settings'
ORDER BY tablename;

-- 2. Check if admin user has records in each table
DO $$
DECLARE
  admin_id UUID := '287ec561-d5f2-4113-840e-e9335b9d3f69';
  rec_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking records for admin user: %', admin_id;
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_general_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_general_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_receipt_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_receipt_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_advanced_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_advanced_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_dynamic_pricing_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_dynamic_pricing_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_barcode_scanner_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_barcode_scanner_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_delivery_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_delivery_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_search_filter_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_search_filter_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_user_permissions_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_user_permissions_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_loyalty_customer_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_loyalty_customer_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_analytics_reporting_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_analytics_reporting_settings: % records', rec_count;
  
  SELECT COUNT(*) INTO rec_count FROM lats_pos_notification_settings WHERE user_id = admin_id;
  RAISE NOTICE 'lats_pos_notification_settings: % records', rec_count;
END $$;

-- 3. Try to actually SELECT from one table to see the real error
SELECT 'Trying to read general_settings...' as test;
SELECT * FROM lats_pos_general_settings LIMIT 1;

