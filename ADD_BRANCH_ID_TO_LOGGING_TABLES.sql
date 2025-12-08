-- ============================================================================
-- ADD BRANCH_ID TO LOGGING AND AUDIT TABLES
-- ============================================================================
-- This script adds branch_id columns to audit, logging, and tracking tables
-- to ensure complete branch isolation for all system activities.
-- ============================================================================

-- Add branch_id to audit_logs (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id ON public.audit_logs(branch_id);
    RAISE NOTICE '✅ Added branch_id to audit_logs';
  ELSE
    RAISE NOTICE 'ℹ️ audit_logs already has branch_id column';
  END IF;
END $$;

-- Add branch_id to email_logs (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_logs' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.email_logs ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
    CREATE INDEX IF NOT EXISTS idx_email_logs_branch_id ON public.email_logs(branch_id);
    RAISE NOTICE '✅ Added branch_id to email_logs';
  ELSE
    RAISE NOTICE 'ℹ️ email_logs already has branch_id column';
  END IF;
END $$;

-- Add branch_id to whatsapp_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_logs' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.whatsapp_logs ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_branch_id ON public.whatsapp_logs(branch_id);
    RAISE NOTICE '✅ Added branch_id to whatsapp_logs';
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_logs already has branch_id column';
  END IF;
END $$;

-- Add branch_id to whatsapp_incoming_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_incoming_messages' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.whatsapp_incoming_messages ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_messages_branch_id ON public.whatsapp_incoming_messages(branch_id);
    RAISE NOTICE '✅ Added branch_id to whatsapp_incoming_messages';
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_incoming_messages already has branch_id column';
  END IF;
END $$;

-- Add branch_id to whatsapp_reactions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_reactions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_reactions' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_reactions ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_reactions_branch_id ON public.whatsapp_reactions(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_reactions';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_reactions already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_reactions table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_calls
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_calls') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_calls' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_calls ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_branch_id ON public.whatsapp_calls(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_calls';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_calls already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_calls table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_poll_results
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_poll_results') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_poll_results' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_poll_results ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_poll_results_branch_id ON public.whatsapp_poll_results(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_poll_results';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_poll_results already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_poll_results table does not exist';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.audit_logs.branch_id IS 'Branch ID for data isolation - references store_locations.id';
COMMENT ON COLUMN public.email_logs.branch_id IS 'Branch ID for data isolation - references store_locations.id';
COMMENT ON COLUMN public.whatsapp_logs.branch_id IS 'Branch ID for data isolation - references store_locations.id';
COMMENT ON COLUMN public.whatsapp_incoming_messages.branch_id IS 'Branch ID for data isolation - references store_locations.id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ BRANCH_ID ADDED TO LOGGING TABLES';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update application code to set branch_id when creating logs';
  RAISE NOTICE '2. Add branch filtering to all log queries';
  RAISE NOTICE '3. Populate existing records with branch_id (if needed)';
  RAISE NOTICE '';
END $$;
