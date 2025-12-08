-- ================================================
-- COMPLETE FIX: WhatsApp Database Tables for Supabase
-- ================================================
-- Fixes 500 errors for:
-- - /api/antiban-settings
-- - /api/whatsapp-sessions/get-active
-- - /api/whatsapp-sessions/check-integration
-- 
-- Error: "Invalid URL structure" (caused by missing tables)
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- FIX 1: Create whatsapp_antiban_settings table
-- ================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_antiban_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT NULL,
  
  -- Basic Protection Settings
  use_personalization BOOLEAN DEFAULT TRUE,
  random_delay BOOLEAN DEFAULT TRUE,
  vary_length BOOLEAN DEFAULT TRUE,
  skip_recently_contacted BOOLEAN DEFAULT TRUE,
  use_invisible_chars BOOLEAN DEFAULT TRUE,
  use_emoji_variation BOOLEAN DEFAULT TRUE,
  
  -- Timing Controls
  min_delay INTEGER DEFAULT 3,
  max_delay INTEGER DEFAULT 8,
  batch_delay INTEGER DEFAULT 60,
  
  -- Rate Limits
  batch_size INTEGER DEFAULT 20,
  max_per_hour INTEGER DEFAULT 30,
  daily_limit INTEGER DEFAULT 100,
  
  -- Smart Features
  respect_quiet_hours BOOLEAN DEFAULT TRUE,
  use_presence BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one settings record per user
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_antiban_user_id ON public.whatsapp_antiban_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_antiban_updated_at ON public.whatsapp_antiban_settings(updated_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_antiban_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_antiban_settings_updated_at_trigger ON public.whatsapp_antiban_settings;
CREATE TRIGGER update_whatsapp_antiban_settings_updated_at_trigger
  BEFORE UPDATE ON public.whatsapp_antiban_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_whatsapp_antiban_settings_updated_at();

-- ================================================
-- FIX 2: Create whatsapp_sessions table
-- ================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id SERIAL PRIMARY KEY,
  wasender_session_id INTEGER NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'DISCONNECTED',
  account_protection BOOLEAN DEFAULT true,
  log_messages BOOLEAN DEFAULT true,
  webhook_url TEXT,
  webhook_enabled BOOLEAN DEFAULT false,
  webhook_events JSONB,
  api_key TEXT,
  webhook_secret TEXT,
  session_data JSONB,
  user_info JSONB,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON public.whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_wasender_id ON public.whatsapp_sessions(wasender_session_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_whatsapp_sessions_updated_at ON public.whatsapp_sessions;
CREATE TRIGGER trigger_update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_sessions_updated_at();

-- ================================================
-- FIX 3: Create user_whatsapp_preferences table
-- ================================================

CREATE TABLE IF NOT EXISTS public.user_whatsapp_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  active_session_id INTEGER REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL,
  auto_select_session BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_whatsapp_prefs_user ON public.user_whatsapp_preferences(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_whatsapp_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_whatsapp_preferences_updated_at ON public.user_whatsapp_preferences;
CREATE TRIGGER trigger_update_user_whatsapp_preferences_updated_at
BEFORE UPDATE ON public.user_whatsapp_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_whatsapp_preferences_updated_at();

-- ================================================
-- FIX 4: Create whatsapp_session_logs table (optional)
-- ================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_session_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_session ON public.whatsapp_session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_event ON public.whatsapp_session_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_created ON public.whatsapp_session_logs(created_at DESC);

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- Created/verified tables:
-- 1. ✅ whatsapp_antiban_settings
-- 2. ✅ whatsapp_sessions
-- 3. ✅ user_whatsapp_preferences
-- 4. ✅ whatsapp_session_logs
-- 
-- The 500 errors and "Invalid URL structure" errors should now be fixed!
-- ================================================
