-- ================================================
-- CLEANUP INVALID USER IDS IN POS SETTINGS
-- ================================================
-- This migration sets user_id to NULL for records that reference
-- non-existent users
-- ================================================

-- Update all POS settings tables to NULL out invalid user_ids
UPDATE lats_pos_general_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_general_settings.user_id);

UPDATE lats_pos_dynamic_pricing_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_dynamic_pricing_settings.user_id);

UPDATE lats_pos_receipt_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_receipt_settings.user_id);

UPDATE lats_pos_barcode_scanner_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_barcode_scanner_settings.user_id);

UPDATE lats_pos_delivery_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_delivery_settings.user_id);

UPDATE lats_pos_search_filter_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_search_filter_settings.user_id);

UPDATE lats_pos_user_permissions_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_user_permissions_settings.user_id);

UPDATE lats_pos_loyalty_customer_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_loyalty_customer_settings.user_id);

UPDATE lats_pos_analytics_reporting_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_analytics_reporting_settings.user_id);

UPDATE lats_pos_notification_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_notification_settings.user_id);

UPDATE lats_pos_advanced_settings 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = lats_pos_advanced_settings.user_id);

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Invalid user_ids cleaned up successfully'; 
  RAISE NOTICE '✅ POS settings tables are now consistent';
END $$;

