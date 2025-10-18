-- ============================================
-- QUICK FIX: Just Update the Constraint
-- Use this if column already exists
-- ============================================

-- Drop the old constraint (if exists)
ALTER TABLE lats_pos_general_settings 
DROP CONSTRAINT IF EXISTS lats_pos_general_settings_font_size_check;

-- Add the new constraint with all 5 sizes including Tiny (11px)
ALTER TABLE lats_pos_general_settings 
ADD CONSTRAINT lats_pos_general_settings_font_size_check 
CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));

-- Update any invalid values to 'medium'
UPDATE lats_pos_general_settings 
SET font_size = 'medium' 
WHERE font_size NOT IN ('tiny', 'extra-small', 'small', 'medium', 'large')
   OR font_size IS NULL;

-- Success!
SELECT '✅ Font size constraint updated!' as status,
       'Now supports: Tiny (11px) ✨, Extra Small (12px), Small (14px), Medium (16px) ⭐, Large (18px)' as sizes;

