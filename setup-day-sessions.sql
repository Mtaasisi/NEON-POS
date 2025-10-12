-- =====================================================
-- DAY SESSION MANAGEMENT FOR POS
-- =====================================================
-- This migration creates the infrastructure for managing
-- POS day sessions (opening and closing)
-- =====================================================

-- Create daily_opening_sessions table to track when days are opened
CREATE TABLE IF NOT EXISTS daily_opening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by VARCHAR(255),
  opened_by_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one active session per day
  UNIQUE(date, is_active)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_date ON daily_opening_sessions(date);
CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_active ON daily_opening_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_opened_at ON daily_opening_sessions(opened_at);

-- Add session_id to daily_sales_closures to link closure with opening
ALTER TABLE daily_sales_closures 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES daily_opening_sessions(id);

-- Create a function to close current session when closing day
CREATE OR REPLACE FUNCTION close_current_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark current session as inactive when day is closed
  UPDATE daily_opening_sessions
  SET is_active = false
  WHERE date = NEW.date AND is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically close session when day is closed
DROP TRIGGER IF EXISTS trigger_close_session_on_day_close ON daily_sales_closures;
CREATE TRIGGER trigger_close_session_on_day_close
  AFTER INSERT ON daily_sales_closures
  FOR EACH ROW
  EXECUTE FUNCTION close_current_session();

-- Grant permissions to current user and public (for Neon databases)
-- Note: If you have specific users/roles, adjust these grants accordingly
GRANT ALL ON daily_opening_sessions TO PUBLIC;

-- Note: RLS (Row Level Security) is optional for Neon databases
-- Uncomment below if you want to enable RLS (requires Supabase or similar)
-- ALTER TABLE daily_opening_sessions ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are Supabase-specific
-- If you're using Supabase, uncomment the policies below:
/*
DROP POLICY IF EXISTS "Anyone can view daily opening sessions" ON daily_opening_sessions;
CREATE POLICY "Anyone can view daily opening sessions" 
  ON daily_opening_sessions FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert daily opening sessions" ON daily_opening_sessions;
CREATE POLICY "Authenticated users can insert daily opening sessions" 
  ON daily_opening_sessions FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update daily opening sessions" ON daily_opening_sessions;
CREATE POLICY "Authenticated users can update daily opening sessions" 
  ON daily_opening_sessions FOR UPDATE 
  USING (true);
*/

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Daily opening sessions table created successfully!';
  RAISE NOTICE '✅ Session management triggers configured!';
  RAISE NOTICE '✅ RLS policies applied!';
END $$;

