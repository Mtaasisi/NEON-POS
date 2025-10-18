-- ============================================
-- ADD FONT SIZE COLUMN TO GENERAL SETTINGS
-- Run this migration to add font_size support
-- ============================================

-- Step 1: Add font_size column (without constraint first)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'font_size'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN font_size TEXT DEFAULT 'medium';
        
        RAISE NOTICE '✅ Column font_size added';
    ELSE
        RAISE NOTICE 'ℹ️  Column font_size already exists';
    END IF;
END $$;

-- Step 2: Update existing rows to have default font_size if NULL
UPDATE lats_pos_general_settings 
SET font_size = 'medium' 
WHERE font_size IS NULL OR font_size = '';

-- Step 3: Add or replace the CHECK constraint
DO $$
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'lats_pos_general_settings_font_size_check'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        DROP CONSTRAINT lats_pos_general_settings_font_size_check;
        
        RAISE NOTICE '🔄 Existing constraint dropped';
    END IF;
    
    -- Add the constraint
    ALTER TABLE lats_pos_general_settings 
    ADD CONSTRAINT lats_pos_general_settings_font_size_check 
    CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));
    
    RAISE NOTICE '✅ CHECK constraint added';
END $$;

-- Success messages
SELECT '✅ Font size column migration completed successfully!' as status;
SELECT 'You can now adjust font size in POS Settings > General > Interface Settings' as next_step;
SELECT 'Available sizes: Tiny (11px) ✨, Extra Small (12px), Small (14px), Medium (16px) ⭐, Large (18px)' as options;

