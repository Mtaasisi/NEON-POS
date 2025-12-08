-- ============================================================================
-- COMPREHENSIVE VERIFICATION OF ALL TABLES FOR BRANCH ISOLATION
-- ============================================================================
-- This script checks ALL tables in the database to identify which ones
-- have branch_id columns and which ones are missing them.
-- ============================================================================

DO $$
DECLARE
  tbl RECORD;
  has_branch_id BOOLEAN;
  has_is_shared BOOLEAN;
  total_tables INT := 0;
  tables_with_branch_id INT := 0;
  tables_without_branch_id INT := 0;
  tables_missing_isolation TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'COMPREHENSIVE BRANCH ISOLATION VERIFICATION';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Get all user tables (exclude system tables)
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE '_prisma%'
    ORDER BY table_name
  LOOP
    total_tables := total_tables + 1;
    
    -- Check for branch_id column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl.table_name
        AND column_name = 'branch_id'
    ) INTO has_branch_id;
    
    -- Check for is_shared column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl.table_name
        AND column_name = 'is_shared'
    ) INTO has_is_shared;
    
    IF has_branch_id THEN
      tables_with_branch_id := tables_with_branch_id + 1;
      IF has_is_shared THEN
        RAISE NOTICE '✅ % (has branch_id, has is_shared)', tbl.table_name;
      ELSE
        RAISE NOTICE '✅ % (has branch_id, no is_shared)', tbl.table_name;
      END IF;
    ELSE
      tables_without_branch_id := tables_without_branch_id + 1;
      tables_missing_isolation := array_append(tables_missing_isolation, tbl.table_name);
      
      -- Determine if this table should have branch_id
      -- System/config tables that might not need it
      IF tbl.table_name IN (
        'store_locations', 'migration_configurations',
        'schema_migrations', '_prisma_migrations'
      ) THEN
        RAISE NOTICE 'ℹ️  % (system table - branch_id not needed)', tbl.table_name;
      ELSE
        RAISE NOTICE '⚠️  % (MISSING branch_id)', tbl.table_name;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total tables checked: %', total_tables;
  RAISE NOTICE 'Tables with branch_id: %', tables_with_branch_id;
  RAISE NOTICE 'Tables without branch_id: %', tables_without_branch_id;
  RAISE NOTICE '';
  
  IF array_length(tables_missing_isolation, 1) > 0 THEN
    RAISE NOTICE 'Tables missing branch_id (excluding system tables):';
    RAISE NOTICE '%', array_to_string(tables_missing_isolation, ', ');
    RAISE NOTICE '';
    RAISE NOTICE '💡 Review these tables to determine if they need branch isolation';
  ELSE
    RAISE NOTICE '✅ All tables have branch_id!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'VERIFICATION COMPLETE';
  RAISE NOTICE '================================================';
END $$;

-- Additional check: Verify critical tables have branch_id
DO $$
DECLARE
  critical_tables TEXT[] := ARRAY[
    'lats_products', 'lats_product_variants', 'customers', 'lats_sales',
    'lats_purchase_orders', 'finance_accounts', 'account_transactions',
    'daily_sales_closures', 'daily_opening_sessions'
  ];
  tbl TEXT;
  missing_critical TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'CRITICAL TABLES VERIFICATION';
  RAISE NOTICE '================================================';
  
  FOREACH tbl IN ARRAY critical_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = tbl
          AND column_name = 'branch_id'
      ) THEN
        missing_critical := array_append(missing_critical, tbl);
        RAISE WARNING '❌ CRITICAL: % is missing branch_id!', tbl;
      ELSE
        RAISE NOTICE '✅ % has branch_id', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'ℹ️  % does not exist', tbl;
    END IF;
  END LOOP;
  
  IF array_length(missing_critical, 1) > 0 THEN
    RAISE WARNING '';
    RAISE WARNING '⚠️  CRITICAL TABLES MISSING BRANCH_ID:';
    RAISE WARNING '%', array_to_string(missing_critical, ', ');
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ All critical tables have branch_id!';
  END IF;
END $$;
