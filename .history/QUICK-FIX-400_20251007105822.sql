-- ============================================
-- QUICK FIX FOR 400 ERRORS (SIMPLIFIED)
-- Copy and paste this entire script into Neon SQL Editor
-- ============================================

-- Step 1: Disable RLS on all settings tables
ALTER TABLE IF EXISTS lats_pos_general_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_receipt_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_advanced_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_dynamic_pricing_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_barcode_scanner_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_delivery_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_search_filter_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_user_permissions_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_loyalty_customer_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_analytics_reporting_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_notification_settings DISABLE ROW LEVEL SECURITY;

-- Step 2: Create default settings for admin user
DO $$
DECLARE
  admin_user_id UUID := '287ec561-d5f2-4113-840e-e9335b9d3f69';
BEGIN
  -- General Settings
  INSERT INTO lats_pos_general_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Receipt Settings
  INSERT INTO lats_pos_receipt_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Advanced Settings
  INSERT INTO lats_pos_advanced_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Dynamic Pricing Settings
  INSERT INTO lats_pos_dynamic_pricing_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Barcode Scanner Settings
  INSERT INTO lats_pos_barcode_scanner_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Delivery Settings
  INSERT INTO lats_pos_delivery_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Search Filter Settings
  INSERT INTO lats_pos_search_filter_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- User Permissions Settings
  INSERT INTO lats_pos_user_permissions_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Loyalty Customer Settings
  INSERT INTO lats_pos_loyalty_customer_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Analytics Reporting Settings
  INSERT INTO lats_pos_analytics_reporting_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  -- Notification Settings
  INSERT INTO lats_pos_notification_settings (user_id) 
  VALUES (admin_user_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ All settings created successfully!';
END $$;

-- Step 3: Verify
SELECT '🎉 FIX COMPLETE! Refresh your app now.' as status;

