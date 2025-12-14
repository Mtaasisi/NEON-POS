-- ================================================
-- ADD POS SETTINGS FOREIGN KEY CONSTRAINTS
-- ================================================
-- This migration adds foreign key constraints to POS settings tables
-- now that invalid user_ids have been cleaned up
-- ================================================

-- Add foreign key constraints that reference the correct 'users' table
-- with ON DELETE SET NULL since user_id is nullable
ALTER TABLE lats_pos_general_settings 
ADD CONSTRAINT lats_pos_general_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_dynamic_pricing_settings 
ADD CONSTRAINT lats_pos_dynamic_pricing_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_receipt_settings 
ADD CONSTRAINT lats_pos_receipt_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_barcode_scanner_settings 
ADD CONSTRAINT lats_pos_barcode_scanner_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_delivery_settings 
ADD CONSTRAINT lats_pos_delivery_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_search_filter_settings 
ADD CONSTRAINT lats_pos_search_filter_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_user_permissions_settings 
ADD CONSTRAINT lats_pos_user_permissions_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_loyalty_customer_settings 
ADD CONSTRAINT lats_pos_loyalty_customer_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_analytics_reporting_settings 
ADD CONSTRAINT lats_pos_analytics_reporting_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_notification_settings 
ADD CONSTRAINT lats_pos_notification_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lats_pos_advanced_settings 
ADD CONSTRAINT lats_pos_advanced_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Foreign key constraints added successfully'; 
  RAISE NOTICE '✅ All POS settings tables now properly reference the users table';
END $$;

