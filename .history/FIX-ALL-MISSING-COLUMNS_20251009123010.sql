-- ============================================
-- FIX ALL MISSING COLUMNS - Comprehensive Fix
-- ============================================
-- Run this script to fix all column-related 400 errors
-- Generated: 2025-10-09

-- 1. Fix whatsapp_instances_comprehensive table - add user_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_instances_comprehensive' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE whatsapp_instances_comprehensive 
        ADD COLUMN user_id UUID;
        
        COMMENT ON COLUMN whatsapp_instances_comprehensive.user_id IS 'User who created/owns this instance';
        RAISE NOTICE '✅ Added user_id to whatsapp_instances_comprehensive';
    ELSE
        RAISE NOTICE '✓ whatsapp_instances_comprehensive.user_id already exists';
    END IF;
END $$;

-- 2. Fix notifications table - add user_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN user_id UUID;
        
        COMMENT ON COLUMN notifications.user_id IS 'User who receives this notification';
        RAISE NOTICE '✅ Added user_id to notifications';
    ELSE
        RAISE NOTICE '✓ notifications.user_id already exists';
    END IF;
END $$;

-- 3. Fix devices table - add issue_description column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' 
        AND column_name = 'issue_description'
    ) THEN
        ALTER TABLE devices 
        ADD COLUMN issue_description TEXT;
        
        COMMENT ON COLUMN devices.issue_description IS 'Description of the device issue';
        
        -- Copy from problem_description if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'devices' 
            AND column_name = 'problem_description'
        ) THEN
            UPDATE devices SET issue_description = problem_description WHERE problem_description IS NOT NULL;
            RAISE NOTICE '✅ Added issue_description to devices and copied from problem_description';
        ELSE
            RAISE NOTICE '✅ Added issue_description to devices';
        END IF;
    ELSE
        RAISE NOTICE '✓ devices.issue_description already exists';
    END IF;
END $$;

-- 4. Fix devices table - add assigned_to column  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' 
        AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE devices 
        ADD COLUMN assigned_to UUID;
        
        COMMENT ON COLUMN devices.assigned_to IS 'Technician assigned to this device';
        RAISE NOTICE '✅ Added assigned_to to devices';
    ELSE
        RAISE NOTICE '✓ devices.assigned_to already exists';
    END IF;
END $$;

-- 5. Fix user_daily_goals table - add is_active column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_daily_goals' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_daily_goals 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        COMMENT ON COLUMN user_daily_goals.is_active IS 'Whether this goal is currently active';
        
        -- Update existing records to be active
        UPDATE user_daily_goals SET is_active = TRUE WHERE is_active IS NULL;
        RAISE NOTICE '✅ Added is_active to user_daily_goals';
    ELSE
        RAISE NOTICE '✓ user_daily_goals.is_active already exists';
    END IF;
END $$;

-- 6. Fix user_daily_goals unique constraint issue
-- Drop the old constraint and create a new one that includes goal_type
DO $$ 
BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_daily_goals' 
        AND constraint_name = 'user_daily_goals_user_id_date_key'
    ) THEN
        ALTER TABLE user_daily_goals 
        DROP CONSTRAINT user_daily_goals_user_id_date_key;
        RAISE NOTICE '✅ Dropped old constraint user_daily_goals_user_id_date_key';
    END IF;
    
    -- Create new unique constraint that includes goal_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_daily_goals' 
        AND constraint_name = 'user_daily_goals_user_id_date_goal_type_key'
    ) THEN
        ALTER TABLE user_daily_goals 
        ADD CONSTRAINT user_daily_goals_user_id_date_goal_type_key 
        UNIQUE (user_id, date, goal_type);
        RAISE NOTICE '✅ Created new constraint user_daily_goals_user_id_date_goal_type_key';
    ELSE
        RAISE NOTICE '✓ Constraint user_daily_goals_user_id_date_goal_type_key already exists';
    END IF;
END $$;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id 
ON whatsapp_instances_comprehensive(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_devices_assigned_to 
ON devices(assigned_to);

CREATE INDEX IF NOT EXISTS idx_user_daily_goals_active 
ON user_daily_goals(user_id, date, is_active) 
WHERE is_active = TRUE;

-- ============================================
-- Verification Section
-- ============================================

-- Check all fixes
SELECT 
    '================================================' as "STATUS CHECK",
    'whatsapp_instances_comprehensive' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_instances_comprehensive' AND column_name = 'user_id'
    ) THEN '✅ user_id exists' ELSE '❌ user_id missing' END as column_status
UNION ALL
SELECT 
    '================================================',
    'notifications',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'user_id'
    ) THEN '✅ user_id exists' ELSE '❌ user_id missing' END
UNION ALL
SELECT 
    '================================================',
    'devices',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'issue_description'
    ) THEN '✅ issue_description exists' ELSE '❌ issue_description missing' END
UNION ALL
SELECT 
    '================================================',
    'devices',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'assigned_to'
    ) THEN '✅ assigned_to exists' ELSE '❌ assigned_to missing' END
UNION ALL
SELECT 
    '================================================',
    'user_daily_goals',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_daily_goals' AND column_name = 'is_active'
    ) THEN '✅ is_active exists' ELSE '❌ is_active missing' END
UNION ALL
SELECT 
    '================================================',
    'user_daily_goals constraint',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_daily_goals' 
        AND constraint_name = 'user_daily_goals_user_id_date_goal_type_key'
    ) THEN '✅ New constraint exists' ELSE '❌ New constraint missing' END;

-- Final success message
SELECT '
================================================
✅ ALL SCHEMA FIXES COMPLETED SUCCESSFULLY!
================================================

Your database now has all the required columns:
- whatsapp_instances_comprehensive.user_id
- notifications.user_id  
- devices.issue_description
- devices.assigned_to
- user_daily_goals.is_active

The duplicate key constraint has been fixed.
All indexes have been created.

You can now run your application without 400 errors!
================================================
' AS "COMPLETION MESSAGE";

