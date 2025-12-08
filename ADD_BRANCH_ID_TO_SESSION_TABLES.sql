-- ============================================================================
-- ADD BRANCH_ID TO SESSION AND USER ACTIVITY TABLES
-- ============================================================================
-- This script adds branch_id columns to session and user activity tables
-- to track which branch users are active in.
-- ============================================================================

-- Add branch_id to user_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_sessions' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.user_sessions ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_branch_id ON public.user_sessions(branch_id);
      RAISE NOTICE '✅ Added branch_id to user_sessions';
    ELSE
      RAISE NOTICE 'ℹ️ user_sessions already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ user_sessions table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_sessions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_sessions' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_sessions ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_branch_id ON public.whatsapp_sessions(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_sessions';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_sessions already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_sessions table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_session_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_session_logs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_session_logs' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_session_logs ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_branch_id ON public.whatsapp_session_logs(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_session_logs';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_session_logs already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_session_logs table does not exist';
  END IF;
END $$;

-- Add branch_id to user_whatsapp_preferences
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_whatsapp_preferences') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_whatsapp_preferences' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.user_whatsapp_preferences ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_user_whatsapp_preferences_branch_id ON public.user_whatsapp_preferences(branch_id);
      RAISE NOTICE '✅ Added branch_id to user_whatsapp_preferences';
    ELSE
      RAISE NOTICE 'ℹ️ user_whatsapp_preferences already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ user_whatsapp_preferences table does not exist';
  END IF;
END $$;

-- Add branch_id to notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON public.notifications(branch_id);
      RAISE NOTICE '✅ Added branch_id to notifications';
    ELSE
      RAISE NOTICE 'ℹ️ notifications already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ notifications table does not exist';
  END IF;
END $$;

-- Add branch_id to webhook_failures
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_failures') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'webhook_failures' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.webhook_failures ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_webhook_failures_branch_id ON public.webhook_failures(branch_id);
      RAISE NOTICE '✅ Added branch_id to webhook_failures';
    ELSE
      RAISE NOTICE 'ℹ️ webhook_failures already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ webhook_failures table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_api_health
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_api_health') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_api_health' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_api_health ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_api_health_branch_id ON public.whatsapp_api_health(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_api_health';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_api_health already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_api_health table does not exist';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.user_sessions.branch_id IS 'Branch ID where user session is active - references store_locations.id';
COMMENT ON COLUMN public.whatsapp_sessions.branch_id IS 'Branch ID for WhatsApp session context - references store_locations.id';
COMMENT ON COLUMN public.notifications.branch_id IS 'Branch ID for notification context - references store_locations.id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ BRANCH_ID ADDED TO SESSION TABLES';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update session management to set branch_id when creating sessions';
  RAISE NOTICE '2. Add branch filtering to all session queries';
  RAISE NOTICE '3. Update notification service to set branch_id';
  RAISE NOTICE '';
END $$;
