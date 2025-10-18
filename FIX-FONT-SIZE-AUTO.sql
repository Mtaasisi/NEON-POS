-- ============================================
-- AUTO-FIX: Font Size Column & Constraint
-- This handles all cases automatically!
-- ============================================

DO $$ 
DECLARE
    column_exists BOOLEAN;
    constraint_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'lats_pos_general_settings' 
        AND column_name = 'font_size'
    ) INTO column_exists;
    
    -- Add column if it doesn't exist
    IF NOT column_exists THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN font_size TEXT DEFAULT 'medium';
        RAISE NOTICE '✅ Column font_size added';
    ELSE
        RAISE NOTICE '✓ Column font_size already exists (no action needed)';
    END IF;
    
    -- Update any NULL or empty values to 'medium'
    UPDATE lats_pos_general_settings 
    SET font_size = 'medium' 
    WHERE font_size IS NULL OR font_size = '';
    
    -- Check if constraint exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'lats_pos_general_settings'
        AND constraint_name = 'lats_pos_general_settings_font_size_check'
    ) INTO constraint_exists;
    
    -- Drop old constraint if it exists
    IF constraint_exists THEN
        ALTER TABLE lats_pos_general_settings 
        DROP CONSTRAINT lats_pos_general_settings_font_size_check;
        RAISE NOTICE '🔄 Old constraint removed';
    END IF;
    
    -- Add the new constraint with all 5 sizes
    ALTER TABLE lats_pos_general_settings 
    ADD CONSTRAINT lats_pos_general_settings_font_size_check 
    CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));
    
    RAISE NOTICE '✅ Constraint added with all 5 font sizes';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Font size setup complete!';
    RAISE NOTICE 'Available sizes: Tiny (11px) ✨, Extra Small (12px), Small (14px), Medium (16px) ⭐, Large (18px)';
    
END $$;

-- Verify the setup
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lats_pos_general_settings' 
AND column_name = 'font_size';

-- Show success message
SELECT '✅ Migration completed successfully!' as status,
       'Go to POS Settings → General → Font Size to try it out!' as next_step;

