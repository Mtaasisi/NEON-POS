-- ============================================================================
-- POS Session Tracking Tables Migration
-- ============================================================================
-- This migration creates optional tables for tracking POS sessions and
-- daily closures. These tables are NOT required for the POS to function.
-- The POS system will work perfectly fine without them.
--
-- Run this migration ONLY if you want to enable session tracking features.
-- ============================================================================

-- Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS daily_opening_sessions CASCADE;
DROP TABLE IF EXISTS daily_sales_closures CASCADE;

-- ============================================================================
-- 1. Daily Sales Closures Table
-- ============================================================================
-- Tracks when daily sales are closed for accounting/reconciliation
CREATE TABLE daily_sales_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,  -- One closure per day
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by TEXT NOT NULL,  -- User role or name
  closed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Financial Summary
  total_sales DECIMAL(12, 2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_cash DECIMAL(12, 2) DEFAULT 0,
  total_card DECIMAL(12, 2) DEFAULT 0,
  total_mobile DECIMAL(12, 2) DEFAULT 0,
  total_credit DECIMAL(12, 2) DEFAULT 0,
  
  -- Additional Info
  sales_data JSONB,  -- Can store detailed sales breakdown
  payment_summaries JSONB,  -- Payment method summaries
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on date for fast lookups
CREATE INDEX idx_daily_sales_closures_date ON daily_sales_closures(date DESC);
CREATE INDEX idx_daily_sales_closures_closed_by ON daily_sales_closures(closed_by_user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE daily_sales_closures ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all closures
CREATE POLICY "Allow authenticated users to view closures"
  ON daily_sales_closures
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to create closures
CREATE POLICY "Allow authenticated users to create closures"
  ON daily_sales_closures
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update closures
CREATE POLICY "Allow authenticated users to update closures"
  ON daily_sales_closures
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_sales_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_sales_closures_updated_at
  BEFORE UPDATE ON daily_sales_closures
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_sales_closures_updated_at();

-- ============================================================================
-- 2. Daily Opening Sessions Table
-- ============================================================================
-- Tracks when POS sessions are started each day
CREATE TABLE daily_opening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,  -- Session date
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by TEXT NOT NULL,  -- User role or name
  opened_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Session Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  closed_at TIMESTAMPTZ,  -- When session ended
  
  -- Optional Info
  opening_cash DECIMAL(12, 2),  -- Starting cash in register
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Only one active session per day
  CONSTRAINT unique_active_session_per_day UNIQUE(date, is_active)
);

-- Create indexes for fast lookups
CREATE INDEX idx_daily_opening_sessions_date ON daily_opening_sessions(date DESC);
CREATE INDEX idx_daily_opening_sessions_active ON daily_opening_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_daily_opening_sessions_opened_by ON daily_opening_sessions(opened_by_user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE daily_opening_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all sessions
CREATE POLICY "Allow authenticated users to view sessions"
  ON daily_opening_sessions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to create sessions
CREATE POLICY "Allow authenticated users to create sessions"
  ON daily_opening_sessions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update sessions
CREATE POLICY "Allow authenticated users to update sessions"
  ON daily_opening_sessions
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_opening_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_opening_sessions_updated_at
  BEFORE UPDATE ON daily_opening_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_opening_sessions_updated_at();

-- ============================================================================
-- 3. Helper Functions (Optional)
-- ============================================================================

-- Function to get current active session
CREATE OR REPLACE FUNCTION get_current_active_session()
RETURNS TABLE (
  id UUID,
  date DATE,
  opened_at TIMESTAMPTZ,
  opened_by TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.date,
    s.opened_at,
    s.opened_by
  FROM daily_opening_sessions s
  WHERE s.is_active = TRUE
    AND s.date = CURRENT_DATE
  ORDER BY s.opened_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to close current session
CREATE OR REPLACE FUNCTION close_current_session()
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE daily_opening_sessions
  SET 
    is_active = FALSE,
    closed_at = NOW(),
    updated_at = NOW()
  WHERE is_active = TRUE
    AND date = CURRENT_DATE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Sample Data (Optional - for testing)
-- ============================================================================
-- Uncomment the lines below to insert sample data for testing

/*
-- Insert a sample active session for today
INSERT INTO daily_opening_sessions (
  date,
  opened_at,
  opened_by,
  is_active,
  notes
) VALUES (
  CURRENT_DATE,
  NOW(),
  'system',
  TRUE,
  'Sample session for testing'
) ON CONFLICT (date, is_active) DO NOTHING;

-- Insert a sample closure for yesterday
INSERT INTO daily_sales_closures (
  date,
  closed_at,
  closed_by,
  total_sales,
  total_transactions,
  total_cash,
  total_card,
  notes
) VALUES (
  CURRENT_DATE - INTERVAL '1 day',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '23:59:00',
  'system',
  15000.00,
  42,
  8000.00,
  7000.00,
  'Sample closure for testing'
) ON CONFLICT (date) DO NOTHING;
*/

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- The following tables have been created:
--   ✅ daily_sales_closures
--   ✅ daily_opening_sessions
--
-- The following functions have been created:
--   ✅ get_current_active_session()
--   ✅ close_current_session()
--
-- Note: These tables are OPTIONAL. The POS system works without them.
-- ============================================================================

-- Verify tables were created
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('daily_sales_closures', 'daily_opening_sessions')
ORDER BY table_name;

