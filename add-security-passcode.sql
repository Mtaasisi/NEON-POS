-- ============================================
-- ADD SECURITY PASSCODE TO POS SETTINGS
-- ============================================

-- Add day_closing_passcode to general settings
ALTER TABLE lats_pos_general_settings 
ADD COLUMN IF NOT EXISTS day_closing_passcode VARCHAR(255) DEFAULT '1234';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_general_settings_passcode 
ON lats_pos_general_settings(day_closing_passcode);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Passcode column added to lats_pos_general_settings';
  RAISE NOTICE '✅ Default passcode set to: 1234';
  RAISE NOTICE '🔐 You can now change the passcode in POS settings!';
END $$;

