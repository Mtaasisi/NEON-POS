-- ============================================================================
-- ADD BRANCH_ID TO COMMUNICATION AND CAMPAIGN TABLES
-- ============================================================================
-- This script adds branch_id columns to WhatsApp campaign, message, and
-- communication tables to ensure branch-specific communication isolation.
-- ============================================================================

-- Add branch_id to scheduled_bulk_messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_bulk_messages') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_bulk_messages' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.scheduled_bulk_messages ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_bulk_messages_branch_id ON public.scheduled_bulk_messages(branch_id);
      RAISE NOTICE '✅ Added branch_id to scheduled_bulk_messages';
    ELSE
      RAISE NOTICE 'ℹ️ scheduled_bulk_messages already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ scheduled_bulk_messages table does not exist';
  END IF;
END $$;

-- Add branch_id to scheduled_message_executions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_message_executions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_message_executions' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.scheduled_message_executions ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_message_executions_branch_id ON public.scheduled_message_executions(branch_id);
      RAISE NOTICE '✅ Added branch_id to scheduled_message_executions';
    ELSE
      RAISE NOTICE 'ℹ️ scheduled_message_executions already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ scheduled_message_executions table does not exist';
  END IF;
END $$;

-- Add branch_id to bulk_message_templates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bulk_message_templates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'bulk_message_templates' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.bulk_message_templates ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_bulk_message_templates_branch_id ON public.bulk_message_templates(branch_id);
      RAISE NOTICE '✅ Added branch_id to bulk_message_templates';
    ELSE
      RAISE NOTICE 'ℹ️ bulk_message_templates already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ bulk_message_templates table does not exist';
  END IF;
END $$;

-- Add branch_id to message_recipient_lists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_recipient_lists') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'message_recipient_lists' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.message_recipient_lists ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_message_recipient_lists_branch_id ON public.message_recipient_lists(branch_id);
      RAISE NOTICE '✅ Added branch_id to message_recipient_lists';
    ELSE
      RAISE NOTICE 'ℹ️ message_recipient_lists already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ message_recipient_lists table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_campaigns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_campaigns') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_campaigns' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_campaigns ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_branch_id ON public.whatsapp_campaigns(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_campaigns';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_campaigns already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_campaigns table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_scheduled_campaigns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_scheduled_campaigns') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_scheduled_campaigns' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_scheduled_campaigns ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_campaigns_branch_id ON public.whatsapp_scheduled_campaigns(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_scheduled_campaigns';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_scheduled_campaigns already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_scheduled_campaigns table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_customer_segments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_customer_segments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_customer_segments' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_customer_segments ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_customer_segments_branch_id ON public.whatsapp_customer_segments(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_customer_segments';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_customer_segments already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_customer_segments table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_campaign_metrics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_campaign_metrics') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_campaign_metrics' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_campaign_metrics ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_metrics_branch_id ON public.whatsapp_campaign_metrics(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_campaign_metrics';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_campaign_metrics already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_campaign_metrics table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_failed_queue
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_failed_queue') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_failed_queue' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_failed_queue ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_failed_queue_branch_id ON public.whatsapp_failed_queue(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_failed_queue';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_failed_queue already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_failed_queue table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_blacklist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_blacklist') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_blacklist' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_blacklist ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_blacklist_branch_id ON public.whatsapp_blacklist(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_blacklist';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_blacklist already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_blacklist table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_media_library
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_media_library') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_media_library' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_media_library ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_media_library_branch_id ON public.whatsapp_media_library(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_media_library';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_media_library already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_media_library table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_reply_templates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_reply_templates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_reply_templates' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_reply_templates ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_reply_templates_branch_id ON public.whatsapp_reply_templates(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_reply_templates';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_reply_templates already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_reply_templates table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_ab_tests
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_ab_tests') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_ab_tests' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_ab_tests ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_ab_tests_branch_id ON public.whatsapp_ab_tests(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_ab_tests';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_ab_tests already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_ab_tests table does not exist';
  END IF;
END $$;

-- Add branch_id to whatsapp_bulk_campaigns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_bulk_campaigns') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_bulk_campaigns' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.whatsapp_bulk_campaigns ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_bulk_campaigns_branch_id ON public.whatsapp_bulk_campaigns(branch_id);
      RAISE NOTICE '✅ Added branch_id to whatsapp_bulk_campaigns';
    ELSE
      RAISE NOTICE 'ℹ️ whatsapp_bulk_campaigns already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ whatsapp_bulk_campaigns table does not exist';
  END IF;
END $$;

-- Add branch_id to campaign_notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaign_notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'campaign_notifications' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.campaign_notifications ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_campaign_notifications_branch_id ON public.campaign_notifications(branch_id);
      RAISE NOTICE '✅ Added branch_id to campaign_notifications';
    ELSE
      RAISE NOTICE 'ℹ️ campaign_notifications already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ campaign_notifications table does not exist';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ BRANCH_ID ADDED TO COMMUNICATION TABLES';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update WhatsApp service to set branch_id when creating campaigns/messages';
  RAISE NOTICE '2. Add branch filtering to all communication queries';
  RAISE NOTICE '3. Populate existing records with branch_id (if needed)';
  RAISE NOTICE '';
END $$;
