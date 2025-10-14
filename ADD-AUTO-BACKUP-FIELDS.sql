-- =====================================================
-- ADD AUTOMATIC BACKUP FIELDS TO lats_pos_general_settings
-- =====================================================
-- Adds columns for automatic backup configuration
-- Safe to run multiple times - checks if columns exist first
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🔄 Adding automatic backup fields...';

    -- Add auto_backup_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'auto_backup_enabled'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN auto_backup_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added auto_backup_enabled column';
    ELSE
        RAISE NOTICE '⏭️  auto_backup_enabled column already exists';
    END IF;

    -- Add auto_backup_frequency column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'auto_backup_frequency'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN auto_backup_frequency TEXT DEFAULT 'daily'
        CHECK (auto_backup_frequency IN ('daily', 'weekly', 'monthly'));
        RAISE NOTICE '✅ Added auto_backup_frequency column';
    ELSE
        RAISE NOTICE '⏭️  auto_backup_frequency column already exists';
    END IF;

    -- Add auto_backup_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'auto_backup_time'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN auto_backup_time TEXT DEFAULT '02:00';
        RAISE NOTICE '✅ Added auto_backup_time column';
    ELSE
        RAISE NOTICE '⏭️  auto_backup_time column already exists';
    END IF;

    -- Add auto_backup_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'auto_backup_type'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN auto_backup_type TEXT DEFAULT 'full'
        CHECK (auto_backup_type IN ('full', 'schema-only', 'data-only'));
        RAISE NOTICE '✅ Added auto_backup_type column';
    ELSE
        RAISE NOTICE '⏭️  auto_backup_type column already exists';
    END IF;

    -- Add last_auto_backup column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'last_auto_backup'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN last_auto_backup TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added last_auto_backup column';
    ELSE
        RAISE NOTICE '⏭️  last_auto_backup column already exists';
    END IF;

    RAISE NOTICE '🎉 Automatic backup fields migration completed!';
    RAISE NOTICE '📋 You can now configure automatic database backups';

END $$;

-- Verify columns were added
SELECT 
    '✅ Automatic Backup Fields Status' AS status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' AND column_name = 'auto_backup_enabled'
    ) THEN '✅ Exists' ELSE '❌ Missing' END AS auto_backup_enabled,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' AND column_name = 'auto_backup_frequency'
    ) THEN '✅ Exists' ELSE '❌ Missing' END AS auto_backup_frequency,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' AND column_name = 'auto_backup_time'
    ) THEN '✅ Exists' ELSE '❌ Missing' END AS auto_backup_time,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' AND column_name = 'auto_backup_type'
    ) THEN '✅ Exists' ELSE '❌ Missing' END AS auto_backup_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' AND column_name = 'last_auto_backup'
    ) THEN '✅ Exists' ELSE '❌ Missing' END AS last_auto_backup;

-- Show current automatic backup configuration
SELECT 
    '📊 Current Automatic Backup Settings' AS info,
    COALESCE(auto_backup_enabled::text, 'false') AS enabled,
    COALESCE(auto_backup_frequency, 'daily') AS frequency,
    COALESCE(auto_backup_time, '02:00') AS time,
    COALESCE(auto_backup_type, 'full') AS type,
    CASE 
        WHEN last_auto_backup IS NULL THEN 'Never'
        ELSE last_auto_backup::text
    END AS last_backup
FROM lats_pos_general_settings
LIMIT 1;

