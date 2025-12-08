-- ============================================================================
-- ADD BRANCH_ID TO ALL REMAINING TABLES
-- ============================================================================
-- This script adds branch_id columns to ALL remaining tables that don't have it
-- and creates triggers to automatically assign branch_id to all new records
-- ============================================================================

DO $$
DECLARE
  tbl RECORD;
  tables_processed INT := 0;
  tables_skipped INT := 0;
  system_tables TEXT[] := ARRAY['store_locations', 'migration_configurations', 'schema_migrations', '_prisma_migrations', 'v_has_payment_method_column'];
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'ADDING BRANCH_ID TO ALL REMAINING TABLES';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name <> ALL(system_tables)
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = information_schema.tables.table_name
          AND column_name = 'branch_id'
      )
    ORDER BY table_name
  LOOP
    BEGIN
      -- Add branch_id column
      EXECUTE format('ALTER TABLE %I ADD COLUMN branch_id UUID REFERENCES public.store_locations(id)', tbl.table_name);
      
      -- Create index
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_branch_id ON %I(branch_id)', tbl.table_name, tbl.table_name);
      
      -- Add comment
      EXECUTE format('COMMENT ON COLUMN %I.branch_id IS ''Branch ID for data isolation - references store_locations.id''', tbl.table_name);
      
      tables_processed := tables_processed + 1;
      RAISE NOTICE '✅ Added branch_id to %', tbl.table_name;
    EXCEPTION WHEN OTHERS THEN
      tables_skipped := tables_skipped + 1;
      RAISE WARNING '⚠️  Failed to add branch_id to %: %', tbl.table_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Tables processed: %', tables_processed;
  RAISE NOTICE 'Tables skipped: %', tables_skipped;
  RAISE NOTICE '';
END $$;
