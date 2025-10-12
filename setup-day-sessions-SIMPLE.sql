-- =====================================================
-- SIMPLE VERSION FOR NEON DATABASE
-- Day Session Management - No Supabase features
-- =====================================================

-- Create daily_opening_sessions table
CREATE TABLE IF NOT EXISTS daily_opening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by VARCHAR(255),
  opened_by_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_date ON daily_opening_sessions(date);
CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_active ON daily_opening_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_opened_at ON daily_opening_sessions(opened_at);

-- Add session_id to daily_sales_closures (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'daily_sales_closures'
  ) THEN
    ALTER TABLE daily_sales_closures 
    ADD COLUMN IF NOT EXISTS session_id UUID;
    
    RAISE NOTICE '✅ Added session_id column to daily_sales_closures';
  ELSE
    RAISE NOTICE '⚠️ daily_sales_closures table does not exist yet - skipping column addition';
  END IF;
END $$;

-- Create function to close current session
CREATE OR REPLACE FUNCTION close_current_session()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE daily_opening_sessions
  SET is_active = false
  WHERE date = NEW.date AND is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if daily_sales_closures exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'daily_sales_closures'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_close_session_on_day_close ON daily_sales_closures;
    CREATE TRIGGER trigger_close_session_on_day_close
      AFTER INSERT ON daily_sales_closures
      FOR EACH ROW
      EXECUTE FUNCTION close_current_session();
    
    RAISE NOTICE '✅ Trigger created successfully';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Daily opening sessions table created successfully!';
  RAISE NOTICE '✅ Session management configured!';
  RAISE NOTICE '🎉 You can now use day sessions in your POS!';
END $$;

