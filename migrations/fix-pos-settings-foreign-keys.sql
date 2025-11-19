-- ================================================
-- FIX POS SETTINGS FOREIGN KEY CONSTRAINTS
-- ================================================
-- This migration fixes the foreign key constraints on POS settings tables
-- to reference the correct 'users' table instead of 'auth_users'
-- ================================================

-- Drop existing foreign key constraints that reference auth_users
ALTER TABLE IF EXISTS lats_pos_general_settings 
DROP CONSTRAINT IF EXISTS lats_pos_general_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_dynamic_pricing_settings 
DROP CONSTRAINT IF EXISTS lats_pos_dynamic_pricing_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_receipt_settings 
DROP CONSTRAINT IF EXISTS lats_pos_receipt_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_barcode_scanner_settings 
DROP CONSTRAINT IF EXISTS lats_pos_barcode_scanner_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_delivery_settings 
DROP CONSTRAINT IF EXISTS lats_pos_delivery_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_search_filter_settings 
DROP CONSTRAINT IF EXISTS lats_pos_search_filter_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_user_permissions_settings 
DROP CONSTRAINT IF EXISTS lats_pos_user_permissions_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_loyalty_customer_settings 
DROP CONSTRAINT IF EXISTS lats_pos_loyalty_customer_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_analytics_reporting_settings 
DROP CONSTRAINT IF EXISTS lats_pos_analytics_reporting_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_notification_settings 
DROP CONSTRAINT IF EXISTS lats_pos_notification_settings_user_id_fkey;

ALTER TABLE IF EXISTS lats_pos_advanced_settings 
DROP CONSTRAINT IF EXISTS lats_pos_advanced_settings_user_id_fkey;

-- Make user_id columns nullable (settings can be global/default)
ALTER TABLE IF EXISTS lats_pos_general_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_dynamic_pricing_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_receipt_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_barcode_scanner_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_delivery_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_search_filter_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_user_permissions_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_loyalty_customer_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_analytics_reporting_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_notification_settings 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS lats_pos_advanced_settings 
ALTER COLUMN user_id DROP NOT NULL;

-- Add new foreign key constraints that reference the correct 'users' table
-- with ON DELETE SET NULL since user_id is now nullable
ALTER TABLE IF EXISTS lats_pos_general_settings 
ADD CONSTRAINT lats_pos_general_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_dynamic_pricing_settings 
ADD CONSTRAINT lats_pos_dynamic_pricing_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_receipt_settings 
ADD CONSTRAINT lats_pos_receipt_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_barcode_scanner_settings 
ADD CONSTRAINT lats_pos_barcode_scanner_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_delivery_settings 
ADD CONSTRAINT lats_pos_delivery_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_search_filter_settings 
ADD CONSTRAINT lats_pos_search_filter_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_user_permissions_settings 
ADD CONSTRAINT lats_pos_user_permissions_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_loyalty_customer_settings 
ADD CONSTRAINT lats_pos_loyalty_customer_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_analytics_reporting_settings 
ADD CONSTRAINT lats_pos_analytics_reporting_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_notification_settings 
ADD CONSTRAINT lats_pos_notification_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lats_pos_advanced_settings 
ADD CONSTRAINT lats_pos_advanced_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create a helpful comment
COMMENT ON TABLE lats_pos_general_settings IS 'POS general settings - user_id is nullable for global/default settings';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ POS settings foreign key constraints fixed successfully'; 
  RAISE NOTICE '✅ All POS settings tables now reference the users table correctly';
  RAISE NOTICE '✅ user_id columns are now nullable for global settings support';
END $$;

