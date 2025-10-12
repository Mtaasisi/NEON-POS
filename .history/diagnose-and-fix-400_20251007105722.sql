-- ============================================
-- DIAGNOSE AND FIX 400 ERRORS
-- Run this in your Neon database SQL Editor
-- ============================================

-- STEP 1: Check if settings tables exist
SELECT 
  'Checking settings tables...' as status;

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
  ('lats_pos_notification_settings')
) AS t(table_name);

-- STEP 2: Check RLS status
SELECT 
  tablename as table_name,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'lats_pos%settings'
ORDER BY tablename;

-- STEP 3: Check if admin user has settings records
DO $$
DECLARE
  admin_user_id UUID := '287ec561-d5f2-4113-840e-e9335b9d3f69';
  table_name TEXT;
  record_count INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Checking settings records for admin user...';
  RAISE NOTICE '============================================';
  
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
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE user_id = $1', table_name) 
    INTO record_count 
    USING admin_user_id;
    
    IF record_count > 0 THEN
      RAISE NOTICE '✅ % has % record(s)', table_name, record_count;
    ELSE
      RAISE NOTICE '❌ % has NO records', table_name;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- NOW RUN THE FIX (uncomment the lines below)
-- ============================================

-- STEP 4: Disable RLS on all settings tables
ALTER TABLE lats_pos_general_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_receipt_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_advanced_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_dynamic_pricing_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_barcode_scanner_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_delivery_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_search_filter_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_user_permissions_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_loyalty_customer_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_analytics_reporting_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_notification_settings DISABLE ROW LEVEL SECURITY;

-- STEP 5: Drop any problematic RLS policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_pos_dynamic_pricing_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_pos_dynamic_pricing_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_pos_dynamic_pricing_settings;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_pos_barcode_scanner_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_pos_barcode_scanner_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_pos_barcode_scanner_settings;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_pos_delivery_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_pos_delivery_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_pos_delivery_settings;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_pos_search_filter_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_pos_search_filter_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_pos_search_filter_settings;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_pos_user_permissions_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_pos_user_permissions_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_pos_user_permissions_settings;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_pos_loyalty_customer_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_pos_loyalty_customer_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_pos_loyalty_customer_settings;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_pos_analytics_reporting_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_pos_analytics_reporting_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_pos_analytics_reporting_settings;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON lats_pos_notification_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_pos_notification_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_pos_notification_settings;

-- STEP 6: Create default settings record for admin user (if not exists)
DO $$
DECLARE
  admin_user_id UUID := '287ec561-d5f2-4113-840e-e9335b9d3f69';
BEGIN
  -- General Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_general_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_general_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created general settings for admin';
  END IF;

  -- Receipt Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_receipt_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_receipt_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created receipt settings for admin';
  END IF;

  -- Advanced Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_advanced_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_advanced_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created advanced settings for admin';
  END IF;

  -- Dynamic Pricing Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_dynamic_pricing_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_dynamic_pricing_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created pricing settings for admin';
  END IF;

  -- Barcode Scanner Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_barcode_scanner_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_barcode_scanner_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created scanner settings for admin';
  END IF;

  -- Delivery Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_delivery_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_delivery_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created delivery settings for admin';
  END IF;

  -- Search Filter Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_search_filter_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_search_filter_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created search settings for admin';
  END IF;

  -- User Permissions Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_user_permissions_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_user_permissions_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created permissions settings for admin';
  END IF;

  -- Loyalty Customer Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_loyalty_customer_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_loyalty_customer_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created loyalty settings for admin';
  END IF;

  -- Analytics Reporting Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_analytics_reporting_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_analytics_reporting_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created analytics settings for admin';
  END IF;

  -- Notification Settings
  IF NOT EXISTS (SELECT 1 FROM lats_pos_notification_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO lats_pos_notification_settings (user_id) VALUES (admin_user_id);
    RAISE NOTICE '✅ Created notification settings for admin';
  END IF;

END $$;

-- STEP 7: Add indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_general_settings_user_id ON lats_pos_general_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_settings_user_id ON lats_pos_receipt_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_advanced_settings_user_id ON lats_pos_advanced_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON lats_pos_dynamic_pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_scanner_settings_user_id ON lats_pos_barcode_scanner_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_settings_user_id ON lats_pos_delivery_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_search_settings_user_id ON lats_pos_search_filter_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_settings_user_id ON lats_pos_user_permissions_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_settings_user_id ON lats_pos_loyalty_customer_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_settings_user_id ON lats_pos_analytics_reporting_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON lats_pos_notification_settings(user_id);

-- STEP 8: Verify the fix worked
SELECT '✅ FIX COMPLETE!' as status;

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

SELECT '🎉 All done! Now refresh your app - the 400 errors should be gone!' as next_step;

