-- ============================================================
-- FIX USER_DAILY_GOALS & SETTINGS TABLES
-- Run this in your Neon SQL Editor to fix console errors
-- ============================================================

-- ===================
-- FIX #1: User Goals Table - Add missing goal_value column (if needed)
-- ===================
DO $$ 
BEGIN
    -- Check if goal_value column exists, add it if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_daily_goals' 
        AND column_name = 'goal_value'
    ) THEN
        ALTER TABLE user_daily_goals 
        ADD COLUMN goal_value NUMERIC DEFAULT 0;
        
        RAISE NOTICE '✅ Added goal_value column to user_daily_goals table';
    ELSE
        RAISE NOTICE 'ℹ️  goal_value column already exists';
    END IF;
    
    -- Ensure date column has a default value to avoid null constraint errors
    -- This makes the date column optional for backwards compatibility
    BEGIN
        ALTER TABLE user_daily_goals 
        ALTER COLUMN date SET DEFAULT CURRENT_DATE;
        
        RAISE NOTICE '✅ Set default value for date column';
    EXCEPTION 
        WHEN undefined_column THEN
            RAISE NOTICE 'ℹ️  date column does not exist (using simplified schema)';
        WHEN OTHERS THEN
            RAISE NOTICE 'ℹ️  date column already has a default or is optional';
    END;
END $$;

-- ===================
-- FIX #2: Settings Table - Create if missing (for SMS service)
-- ===================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default SMS settings
INSERT INTO settings (key, value) VALUES 
    ('sms_provider_api_key', ''),
    ('sms_api_url', ''),
    ('sms_provider_password', '')
ON CONFLICT (key) DO NOTHING;

-- ===================
-- VERIFICATION
-- ===================
-- Verify user_daily_goals table structure
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 USER_DAILY_GOALS TABLE STRUCTURE:';
END $$;

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_daily_goals'
ORDER BY ordinal_position;

-- Verify settings table
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 SETTINGS TABLE DATA:';
END $$;

SELECT * FROM settings WHERE key LIKE 'sms%';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ All fixes applied successfully!';
    RAISE NOTICE 'ℹ️  Refresh your browser to see the changes';
END $$;

