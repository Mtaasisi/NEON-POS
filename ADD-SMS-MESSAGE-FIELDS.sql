-- =====================================================
-- Add SMS Message Customization Fields to Receipt Settings
-- =====================================================
-- This migration adds fields to customize SMS/receipt messages
-- Created: 2025-10-12
-- =====================================================

-- Add SMS message customization fields to receipt settings table
ALTER TABLE lats_pos_receipt_settings
ADD COLUMN IF NOT EXISTS sms_header_message TEXT DEFAULT 'Thank you for your purchase!',
ADD COLUMN IF NOT EXISTS sms_footer_message TEXT DEFAULT 'Thank you for choosing us!';

-- Add comments for documentation
COMMENT ON COLUMN lats_pos_receipt_settings.sms_header_message IS 'Customizable header message for SMS receipts';
COMMENT ON COLUMN lats_pos_receipt_settings.sms_footer_message IS 'Customizable footer message for SMS receipts';

-- Update existing records to have default values if they're null
UPDATE lats_pos_receipt_settings
SET sms_header_message = 'Thank you for your purchase!'
WHERE sms_header_message IS NULL;

UPDATE lats_pos_receipt_settings
SET sms_footer_message = 'Thank you for choosing us!'
WHERE sms_footer_message IS NULL;

-- Show success message
SELECT 'SMS message customization fields added successfully!' as status;

