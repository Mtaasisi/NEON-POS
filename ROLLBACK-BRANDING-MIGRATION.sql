-- =====================================================
-- ROLLBACK UNIFIED BRANDING MIGRATION
-- =====================================================
-- Run this to completely undo the branding migration
-- =====================================================

-- Drop the view
DROP VIEW IF EXISTS v_user_branding CASCADE;

-- Drop the table (this removes all data!)
DROP TABLE IF EXISTS unified_branding_settings CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_unified_branding_updated_at() CASCADE;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_branding_settings') THEN
    RAISE NOTICE '✅ Rollback complete - unified_branding_settings removed';
  ELSE
    RAISE NOTICE '❌ Rollback failed - table still exists';
  END IF;
END $$;

-- Done!
SELECT '✅ Branding migration rolled back successfully' as status;

