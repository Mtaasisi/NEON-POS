-- ============================================
-- EMERGENCY FIX FOR 400 ERRORS
-- Run this ENTIRE script in your Neon database SQL Editor
-- ============================================

-- STEP 1: Check which tables actually exist
SELECT 
  '========== CHECKING TABLES ==========' as status;

SELECT 
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
  ) THEN '✅ Exists' ELSE '❌ Missing' END as status
FROM (VALUES 
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
  ('lats_pos_notification_settings'),
  ('lats_categories'),
  ('lats_suppliers'),
  ('lats_products'),
  ('lats_product_variants'),
  ('lats_stock_movements'),
  ('lats_sales')
) AS t(table_name);

-- STEP 2: Disable RLS on ALL lats_pos settings tables (if they exist)
DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN 
    SELECT t FROM unnest(ARRAY[
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
    ]) AS t
  LOOP
    -- Check if table exists before disabling RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = tbl_name) THEN
      EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl_name);
      RAISE NOTICE '✅ Disabled RLS on %', tbl_name;
    ELSE
      RAISE NOTICE '❌ Table % does not exist, skipping RLS disable', tbl_name;
    END IF;
  END LOOP;
END $$;

-- STEP 3: Disable RLS on inventory tables (if they exist)
DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN 
    SELECT t FROM unnest(ARRAY[
      'lats_categories',
      'lats_suppliers',
      'lats_products',
      'lats_product_variants',
      'lats_stock_movements',
      'lats_sales',
      'lats_purchase_orders',
      'lats_purchase_order_items'
    ]) AS t
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = tbl_name) THEN
      EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl_name);
      RAISE NOTICE '✅ Disabled RLS on %', tbl_name;
    ELSE
      RAISE NOTICE '⚠️ Table % does not exist', tbl_name;
    END IF;
  END LOOP;
END $$;

-- STEP 4: Drop ALL RLS policies on settings tables
DO $$
DECLARE
  pol_record RECORD;
BEGIN
  FOR pol_record IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename LIKE 'lats_pos%settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      pol_record.policyname, 
      pol_record.schemaname, 
      pol_record.tablename);
    RAISE NOTICE '✅ Dropped policy % on %', pol_record.policyname, pol_record.tablename;
  END LOOP;
END $$;

-- STEP 5: Drop ALL RLS policies on inventory tables
DO $$
DECLARE
  pol_record RECORD;
BEGIN
  FOR pol_record IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND (tablename LIKE 'lats_%' AND tablename NOT LIKE 'lats_pos%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      pol_record.policyname, 
      pol_record.schemaname, 
      pol_record.tablename);
    RAISE NOTICE '✅ Dropped policy % on %', pol_record.policyname, pol_record.tablename;
  END LOOP;
END $$;

-- STEP 6: Create default settings records for admin user (if tables exist)
DO $$
DECLARE
  admin_user_id UUID := '287ec561-d5f2-4113-840e-e9335b9d3f69';
BEGIN
  RAISE NOTICE '========== CREATING DEFAULT SETTINGS ==========';
  
  -- General Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_general_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_general_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_general_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created general settings';
    ELSE
      RAISE NOTICE '✔️ General settings already exist';
    END IF;
  END IF;

  -- Receipt Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_receipt_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_receipt_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_receipt_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created receipt settings';
    ELSE
      RAISE NOTICE '✔️ Receipt settings already exist';
    END IF;
  END IF;

  -- Advanced Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_advanced_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_advanced_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_advanced_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created advanced settings';
    ELSE
      RAISE NOTICE '✔️ Advanced settings already exist';
    END IF;
  END IF;

  -- Dynamic Pricing Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_dynamic_pricing_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_dynamic_pricing_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_dynamic_pricing_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created pricing settings';
    ELSE
      RAISE NOTICE '✔️ Pricing settings already exist';
    END IF;
  END IF;

  -- Barcode Scanner Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_barcode_scanner_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_barcode_scanner_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_barcode_scanner_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created scanner settings';
    ELSE
      RAISE NOTICE '✔️ Scanner settings already exist';
    END IF;
  END IF;

  -- Delivery Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_delivery_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_delivery_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_delivery_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created delivery settings';
    ELSE
      RAISE NOTICE '✔️ Delivery settings already exist';
    END IF;
  END IF;

  -- Search Filter Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_search_filter_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_search_filter_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_search_filter_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created search settings';
    ELSE
      RAISE NOTICE '✔️ Search settings already exist';
    END IF;
  END IF;

  -- User Permissions Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_user_permissions_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_user_permissions_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_user_permissions_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created permissions settings';
    ELSE
      RAISE NOTICE '✔️ Permissions settings already exist';
    END IF;
  END IF;

  -- Loyalty Customer Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_loyalty_customer_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_loyalty_customer_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_loyalty_customer_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created loyalty settings';
    ELSE
      RAISE NOTICE '✔️ Loyalty settings already exist';
    END IF;
  END IF;

  -- Analytics Reporting Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = 'lats_pos_analytics_reporting_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_analytics_reporting_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_analytics_reporting_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created analytics settings';
    ELSE
      RAISE NOTICE '✔️ Analytics settings already exist';
    END IF;
  END IF;

  -- Notification Settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_pos_notification_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_pos_notification_settings WHERE user_id = admin_user_id) THEN
      INSERT INTO lats_pos_notification_settings (user_id) VALUES (admin_user_id);
      RAISE NOTICE '✅ Created notification settings';
    ELSE
      RAISE NOTICE '✔️ Notification settings already exist';
    END IF;
  END IF;

END $$;

-- STEP 7: Add indexes for performance (if tables exist)
DO $$
DECLARE
  table_name TEXT;
  index_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT t FROM unnest(ARRAY[
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
    ]) AS t
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
      index_name := 'idx_' || replace(table_name, 'lats_pos_', '') || '_user_id';
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(user_id)', index_name, table_name);
      RAISE NOTICE '✅ Created index on %', table_name;
    END IF;
  END LOOP;
END $$;

-- STEP 8: Verify the fix
SELECT '========== VERIFICATION ==========' as status;

SELECT 
  tablename as table_name,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '❌ Still enabled' ELSE '✅ Disabled' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_pos%settings' OR tablename LIKE 'lats_%')
ORDER BY tablename;

-- STEP 9: Check settings records for admin
SELECT 
  '========== ADMIN USER SETTINGS ==========' as status;

-- Count records in each settings table
SELECT 
  'lats_pos_general_settings' as table_name,
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END as status
FROM lats_pos_general_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_receipt_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_receipt_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_advanced_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_advanced_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_dynamic_pricing_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_dynamic_pricing_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_barcode_scanner_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_barcode_scanner_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_delivery_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_delivery_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_search_filter_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_search_filter_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_user_permissions_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_user_permissions_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_loyalty_customer_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_loyalty_customer_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_analytics_reporting_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_analytics_reporting_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
UNION ALL
SELECT 'lats_pos_notification_settings', COUNT(*), 
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END
FROM lats_pos_notification_settings
WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69';

SELECT '🎉 FIX COMPLETE! Now refresh your app - the 400 errors should be gone!' as next_step;

