-- =====================================================
-- Add background_color column to store_locations table
-- =====================================================
-- This migration adds the background_color column that is
-- needed for storing branch-specific background wallpapers.
-- =====================================================

-- Add background_color column to store_locations table
ALTER TABLE store_locations
ADD COLUMN IF NOT EXISTS background_color TEXT;

-- Add comment to document the column
COMMENT ON COLUMN store_locations.background_color IS
'Branch-specific background wallpaper/color theme identifier';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ background_color Column Added to store_locations!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was added:';
    RAISE NOTICE '  ✅ background_color TEXT column';
    RAISE NOTICE '  ✅ Column comment for documentation';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 This allows branch-specific background wallpapers';
    RAISE NOTICE '   to be saved and persisted in the database.';
    RAISE NOTICE '';
END $$;
