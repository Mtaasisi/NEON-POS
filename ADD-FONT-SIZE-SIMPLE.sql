-- ============================================
-- SIMPLE VERSION: Add Font Size Column
-- Use this if the advanced version has issues
-- ============================================

-- Add the column (will error if already exists, that's OK)
ALTER TABLE lats_pos_general_settings 
ADD COLUMN font_size TEXT DEFAULT 'medium';

-- Update any NULL values
UPDATE lats_pos_general_settings 
SET font_size = 'medium' 
WHERE font_size IS NULL;

-- Add the constraint
ALTER TABLE lats_pos_general_settings 
ADD CONSTRAINT lats_pos_general_settings_font_size_check 
CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));

-- Done!
SELECT '✅ Font size column added!' as result;

