-- ============================================================================
-- ADD BRANCH_ID TO ADDITIONAL OPERATIONAL TABLES
-- ============================================================================
-- This script adds branch_id columns to important operational tables that
-- were identified during verification but weren't in the initial migration scripts.
-- ============================================================================

-- Add branch_id to daily_opening_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_opening_sessions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'daily_opening_sessions' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.daily_opening_sessions ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_branch_id ON public.daily_opening_sessions(branch_id);
      RAISE NOTICE '✅ Added branch_id to daily_opening_sessions';
    ELSE
      RAISE NOTICE 'ℹ️ daily_opening_sessions already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ daily_opening_sessions table does not exist';
  END IF;
END $$;

-- Add branch_id to daily_sales_closures
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_sales_closures') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'daily_sales_closures' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.daily_sales_closures ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_branch_id ON public.daily_sales_closures(branch_id);
      RAISE NOTICE '✅ Added branch_id to daily_sales_closures';
    ELSE
      RAISE NOTICE 'ℹ️ daily_sales_closures already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ daily_sales_closures table does not exist';
  END IF;
END $$;

-- Add branch_id to lats_spare_parts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_spare_parts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'lats_spare_parts' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.lats_spare_parts ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_lats_spare_parts_branch_id ON public.lats_spare_parts(branch_id);
      RAISE NOTICE '✅ Added branch_id to lats_spare_parts';
    ELSE
      RAISE NOTICE 'ℹ️ lats_spare_parts already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ lats_spare_parts table does not exist';
  END IF;
END $$;

-- Add branch_id to purchase_order_quality_checks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_quality_checks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'purchase_order_quality_checks' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.purchase_order_quality_checks ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_quality_checks_branch_id ON public.purchase_order_quality_checks(branch_id);
      RAISE NOTICE '✅ Added branch_id to purchase_order_quality_checks';
    ELSE
      RAISE NOTICE 'ℹ️ purchase_order_quality_checks already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ purchase_order_quality_checks table does not exist';
  END IF;
END $$;

-- Add branch_id to scheduled_transfers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_transfers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_transfers' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.scheduled_transfers ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_branch_id ON public.scheduled_transfers(branch_id);
      RAISE NOTICE '✅ Added branch_id to scheduled_transfers';
    ELSE
      RAISE NOTICE 'ℹ️ scheduled_transfers already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ scheduled_transfers table does not exist';
  END IF;
END $$;

-- Add branch_id to scheduled_transfer_executions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_transfer_executions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_transfer_executions' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.scheduled_transfer_executions ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_transfer_executions_branch_id ON public.scheduled_transfer_executions(branch_id);
      RAISE NOTICE '✅ Added branch_id to scheduled_transfer_executions';
    ELSE
      RAISE NOTICE 'ℹ️ scheduled_transfer_executions already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ scheduled_transfer_executions table does not exist';
  END IF;
END $$;

-- Add branch_id to lats_purchase_order_audit_log
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_purchase_order_audit_log') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'lats_purchase_order_audit_log' 
      AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE public.lats_purchase_order_audit_log ADD COLUMN branch_id UUID REFERENCES public.store_locations(id);
      CREATE INDEX IF NOT EXISTS idx_lats_purchase_order_audit_log_branch_id ON public.lats_purchase_order_audit_log(branch_id);
      RAISE NOTICE '✅ Added branch_id to lats_purchase_order_audit_log';
    ELSE
      RAISE NOTICE 'ℹ️ lats_purchase_order_audit_log already has branch_id column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ lats_purchase_order_audit_log table does not exist';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.daily_opening_sessions.branch_id IS 'Branch ID for daily opening sessions - references store_locations.id';
COMMENT ON COLUMN public.daily_sales_closures.branch_id IS 'Branch ID for daily sales closures - references store_locations.id';
COMMENT ON COLUMN public.lats_spare_parts.branch_id IS 'Branch ID for spare parts isolation - references store_locations.id';
COMMENT ON COLUMN public.purchase_order_quality_checks.branch_id IS 'Branch ID for quality checks isolation - references store_locations.id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ BRANCH_ID ADDED TO OPERATIONAL TABLES';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update application code to set branch_id when creating records';
  RAISE NOTICE '2. Add branch filtering to all operational queries';
  RAISE NOTICE '3. Populate existing records with branch_id (if needed)';
  RAISE NOTICE '';
END $$;
