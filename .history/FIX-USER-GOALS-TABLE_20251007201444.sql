-- ============================================================
-- FIX USER_DAILY_GOALS TABLE - Add missing column
-- ============================================================

-- Add goal_value column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_daily_goals' 
        AND column_name = 'goal_value'
    ) THEN
        ALTER TABLE user_daily_goals 
        ADD COLUMN goal_value INTEGER NOT NULL DEFAULT 5;
        
        RAISE NOTICE '✅ Added goal_value column to user_daily_goals table';
    ELSE
        RAISE NOTICE 'ℹ️  goal_value column already exists';
    END IF;
END $$;

-- Verify the fix
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_daily_goals'
ORDER BY ordinal_position;

