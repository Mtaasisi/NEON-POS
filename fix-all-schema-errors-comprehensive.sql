-- ============================================
-- Comprehensive Schema Fix for All 400 Errors
-- ============================================
-- This script fixes all missing columns found during automated testing

-- 1. Fix whatsapp_instances_comprehensive table - add user_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_instances_comprehensive' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE whatsapp_instances_comprehensive 
        ADD COLUMN user_id UUID REFERENCES auth.users(id);
        
        COMMENT ON COLUMN whatsapp_instances_comprehensive.user_id IS 'User who created/owns this instance';
    END IF;
END $$;

-- 2. Fix devices table - add missing columns
DO $$ 
BEGIN
    -- Add assigned_to column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' 
        AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE devices 
        ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
        
        COMMENT ON COLUMN devices.assigned_to IS 'Technician assigned to this device';
    END IF;
    
    -- Add issue_description column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' 
        AND column_name = 'issue_description'
    ) THEN
        ALTER TABLE devices 
        ADD COLUMN issue_description TEXT;
        
        COMMENT ON COLUMN devices.issue_description IS 'Description of the device issue';
    END IF;
END $$;

-- 3. Fix user_daily_goals table - add is_active column
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
    END IF;
END $$;

-- 4. Fix user_daily_goals unique constraint issue
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
    END IF;
END $$;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id 
ON whatsapp_instances_comprehensive(user_id);

CREATE INDEX IF NOT EXISTS idx_devices_assigned_to 
ON devices(assigned_to);

CREATE INDEX IF NOT EXISTS idx_user_daily_goals_active 
ON user_daily_goals(user_id, date, is_active) 
WHERE is_active = TRUE;

-- ============================================
-- Verification queries
-- ============================================

-- Check whatsapp_instances_comprehensive columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'whatsapp_instances_comprehensive'
ORDER BY ordinal_position;

-- Check devices columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'devices'
AND column_name IN ('assigned_to', 'issue_description')
ORDER BY ordinal_position;

-- Check user_daily_goals columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_daily_goals'
AND column_name = 'is_active'
ORDER BY ordinal_position;

-- Check user_daily_goals constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_daily_goals'
AND constraint_type = 'UNIQUE';

-- Success message
SELECT '✅ All schema fixes applied successfully!' AS status;

