-- ============================================================================
-- VERIFY BRANCH ISOLATION IN DATABASE
-- ============================================================================
-- This script checks if all necessary columns, tables, and functions exist
-- for proper branch isolation functionality.
-- Run this in your Supabase SQL Editor to verify everything is set up correctly.
-- ============================================================================

-- ============================================================================
-- 1. CHECK store_locations TABLE
-- ============================================================================
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col TEXT;
  required_columns TEXT[] := ARRAY[
    'data_isolation_mode',
    'share_products', 'share_inventory', 'share_customers', 'share_suppliers',
    'share_categories', 'share_employees', 'share_accounts',
    'share_sales', 'share_purchase_orders', 'share_devices', 'share_payments',
    'share_appointments', 'share_reminders', 'share_expenses',
    'share_trade_ins', 'share_special_orders', 'share_attendance',
    'share_loyalty_points', 'share_gift_cards', 'share_quality_checks',
    'share_recurring_expenses', 'share_communications', 'share_reports',
    'share_finance_transfers'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. CHECKING store_locations TABLE';
  RAISE NOTICE '========================================';
  
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'store_locations') THEN
    RAISE EXCEPTION '❌ Table store_locations does not exist!';
  ELSE
    RAISE NOTICE '✅ Table store_locations exists';
  END IF;
  
  -- Check for required columns
  FOREACH col IN ARRAY required_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'store_locations' 
      AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing columns in store_locations: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All required isolation columns exist in store_locations';
  END IF;
  
  -- Check data_isolation_mode constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name LIKE '%data_isolation_mode%'
  ) THEN
    RAISE NOTICE '✅ data_isolation_mode constraint exists';
  ELSE
    RAISE WARNING '⚠️ data_isolation_mode constraint may be missing';
  END IF;
END $$;

-- ============================================================================
-- 2. CHECK TABLES FOR branch_id COLUMN
-- ============================================================================
DO $$
DECLARE
  missing_branch_id TEXT[] := ARRAY[]::TEXT[];
  tbl TEXT;
  required_tables TEXT[] := ARRAY[
    'lats_products', 'lats_product_variants', 'customers', 'lats_customers',
    'lats_suppliers', 'lats_categories', 'lats_sales', 'lats_purchase_orders',
    'devices', 'finance_accounts', 'customer_special_orders',
    'purchase_order_quality_checks', 'lats_trade_in_prices', 'lats_trade_in_transactions',
    'appointments', 'reminders', 'account_transactions', 'lats_spare_parts',
    'employees', 'attendance_records', 'loyalty_points'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '2. CHECKING branch_id COLUMNS';
  RAISE NOTICE '========================================';
  
  FOREACH tbl IN ARRAY required_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = tbl 
        AND column_name = 'branch_id'
      ) THEN
        missing_branch_id := array_append(missing_branch_id, tbl);
        RAISE WARNING '⚠️ Table % is missing branch_id column', tbl;
      ELSE
        RAISE NOTICE '✅ Table % has branch_id column', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'ℹ️ Table % does not exist (may be optional)', tbl;
    END IF;
  END LOOP;
  
  IF array_length(missing_branch_id, 1) > 0 THEN
    RAISE WARNING '⚠️ Tables missing branch_id: %', array_to_string(missing_branch_id, ', ');
  ELSE
    RAISE NOTICE '✅ All required tables have branch_id column';
  END IF;
END $$;

-- ============================================================================
-- 3. CHECK TABLES FOR is_shared COLUMN
-- ============================================================================
DO $$
DECLARE
  missing_is_shared TEXT[] := ARRAY[]::TEXT[];
  tbl TEXT;
  tables_that_should_have_is_shared TEXT[] := ARRAY[
    'lats_products', 'lats_product_variants', 'customers', 'lats_customers',
    'lats_suppliers', 'customer_special_orders', 'purchase_order_quality_checks',
    'lats_trade_in_transactions', 'appointments', 'reminders', 'lats_spare_parts'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '3. CHECKING is_shared COLUMNS';
  RAISE NOTICE '========================================';
  
  FOREACH tbl IN ARRAY tables_that_should_have_is_shared
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = tbl 
        AND column_name = 'is_shared'
      ) THEN
        missing_is_shared := array_append(missing_is_shared, tbl);
        RAISE WARNING '⚠️ Table % is missing is_shared column', tbl;
      ELSE
        RAISE NOTICE '✅ Table % has is_shared column', tbl;
      END IF;
    END IF;
  END LOOP;
  
  IF array_length(missing_is_shared, 1) > 0 THEN
    RAISE WARNING '⚠️ Tables missing is_shared: %', array_to_string(missing_is_shared, ', ');
  ELSE
    RAISE NOTICE '✅ All required tables have is_shared column';
  END IF;
END $$;

-- ============================================================================
-- 4. CHECK DATABASE FUNCTIONS
-- ============================================================================
DO $$
DECLARE
  missing_functions TEXT[] := ARRAY[]::TEXT[];
  func TEXT;
  required_functions TEXT[] := ARRAY[
    'log_purchase_order_audit',
    'process_purchase_order_payment',
    'add_imei_to_parent_variant',
    'complete_purchase_order_receive',
    'get_purchase_order_receive_summary'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '4. CHECKING DATABASE FUNCTIONS';
  RAISE NOTICE '========================================';
  
  FOREACH func IN ARRAY required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = func
    ) THEN
      missing_functions := array_append(missing_functions, func);
      RAISE WARNING '⚠️ Function % does not exist', func;
    ELSE
      RAISE NOTICE '✅ Function % exists', func;
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing functions: %', array_to_string(missing_functions, ', ');
    RAISE NOTICE '💡 Run create-missing-database-functions.sql to create missing functions';
  ELSE
    RAISE NOTICE '✅ All required functions exist';
  END IF;
END $$;

-- ============================================================================
-- 5. CHECK BRANCH SETTINGS DATA
-- ============================================================================
DO $$
DECLARE
  branch_count INT;
  branches_with_hybrid INT;
  branches_with_isolated INT;
  branches_with_shared INT;
  branch_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '5. CHECKING BRANCH SETTINGS DATA';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO branch_count FROM store_locations WHERE is_active = true;
  RAISE NOTICE '📊 Active branches: %', branch_count;
  
  SELECT COUNT(*) INTO branches_with_hybrid 
  FROM store_locations 
  WHERE is_active = true AND data_isolation_mode = 'hybrid';
  RAISE NOTICE '📊 Branches in hybrid mode: %', branches_with_hybrid;
  
  SELECT COUNT(*) INTO branches_with_isolated 
  FROM store_locations 
  WHERE is_active = true AND data_isolation_mode = 'isolated';
  RAISE NOTICE '📊 Branches in isolated mode: %', branches_with_isolated;
  
  SELECT COUNT(*) INTO branches_with_shared 
  FROM store_locations 
  WHERE is_active = true AND data_isolation_mode = 'shared';
  RAISE NOTICE '📊 Branches in shared mode: %', branches_with_shared;
  
  -- Show sample branch settings
  RAISE NOTICE '';
  RAISE NOTICE 'Sample branch settings:';
  FOR branch_record IN 
    SELECT id, name, data_isolation_mode, 
           share_products, share_customers, share_suppliers, share_accounts
    FROM store_locations 
    WHERE is_active = true 
    LIMIT 3
  LOOP
    RAISE NOTICE '  Branch: % (ID: %)', branch_record.name, branch_record.id;
    RAISE NOTICE '    Mode: %, Products: %, Customers: %, Suppliers: %, Accounts: %',
      branch_record.data_isolation_mode,
      branch_record.share_products,
      branch_record.share_customers,
      branch_record.share_suppliers,
      branch_record.share_accounts;
  END LOOP;
END $$;

-- ============================================================================
-- 6. CHECK INDEXES ON branch_id COLUMNS
-- ============================================================================
DO $$
DECLARE
  tables_without_index TEXT[] := ARRAY[]::TEXT[];
  tbl TEXT;
  required_tables TEXT[] := ARRAY[
    'lats_products', 'lats_product_variants', 'customers', 'lats_sales',
    'lats_purchase_orders', 'devices', 'finance_accounts'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '6. CHECKING branch_id INDEXES';
  RAISE NOTICE '========================================';
  
  FOREACH tbl IN ARRAY required_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = tbl 
        AND indexname LIKE '%branch_id%'
      ) THEN
        tables_without_index := array_append(tables_without_index, tbl);
        RAISE WARNING '⚠️ Table % may benefit from a branch_id index', tbl;
      ELSE
        RAISE NOTICE '✅ Table % has branch_id index', tbl;
      END IF;
    END IF;
  END LOOP;
  
  IF array_length(tables_without_index, 1) > 0 THEN
    RAISE NOTICE '💡 Consider adding indexes: CREATE INDEX idx_%_branch_id ON %(branch_id);';
  END IF;
END $$;

-- ============================================================================
-- 7. SUMMARY REPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If you see any warnings above, you may need to:';
  RAISE NOTICE '1. Run migrations to add missing columns';
  RAISE NOTICE '2. Run create-missing-database-functions.sql';
  RAISE NOTICE '3. Update branch settings in store_locations table';
  RAISE NOTICE '';
  RAISE NOTICE 'For detailed fixes, check:';
  RAISE NOTICE '- migrations/complete_branch_isolation_schema.sql';
  RAISE NOTICE '- fix-all-isolation-issues.sql';
  RAISE NOTICE '- create-missing-database-functions.sql';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 8. QUICK FIXES (Optional - uncomment to apply)
-- ============================================================================
-- Uncomment the sections below to automatically fix common issues

-- Add missing branch_id columns (if needed)
/*
DO $$
BEGIN
  -- Add branch_id to purchase_order_quality_checks if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_quality_checks' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE purchase_order_quality_checks ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_po_quality_checks_branch_id ON purchase_order_quality_checks(branch_id);
    RAISE NOTICE '✅ Added branch_id to purchase_order_quality_checks';
  END IF;
  
  -- Add branch_id to lats_trade_in_transactions if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_trade_in_transactions' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_trade_in_transactions ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_branch_id ON lats_trade_in_transactions(branch_id);
    RAISE NOTICE '✅ Added branch_id to lats_trade_in_transactions';
  END IF;
  
  -- Add branch_id to appointments if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON appointments(branch_id);
    RAISE NOTICE '✅ Added branch_id to appointments';
  END IF;
  
  -- Add branch_id to reminders if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE reminders ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_reminders_branch_id ON reminders(branch_id);
    RAISE NOTICE '✅ Added branch_id to reminders';
  END IF;
  
  -- Add branch_id to lats_spare_parts if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_spare_parts' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_spare_parts ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_spare_parts_branch_id ON lats_spare_parts(branch_id);
    RAISE NOTICE '✅ Added branch_id to lats_spare_parts';
  END IF;
  
  -- Add branch_id to employees if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
    RAISE NOTICE '✅ Added branch_id to employees';
  END IF;
  
  -- Add branch_id to attendance_records if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_records' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE attendance_records ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_attendance_records_branch_id ON attendance_records(branch_id);
    RAISE NOTICE '✅ Added branch_id to attendance_records';
  END IF;
  
  -- Add branch_id to loyalty_points if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'loyalty_points' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE loyalty_points ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_loyalty_points_branch_id ON loyalty_points(branch_id);
    RAISE NOTICE '✅ Added branch_id to loyalty_points';
  END IF;
END $$;
*/

-- Add missing is_shared columns (if needed)
/*
DO $$
BEGIN
  -- Add is_shared to purchase_order_quality_checks if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_quality_checks' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE purchase_order_quality_checks ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared to purchase_order_quality_checks';
  END IF;
  
  -- Add is_shared to lats_trade_in_transactions if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_trade_in_transactions' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_trade_in_transactions ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared to lats_trade_in_transactions';
  END IF;
  
  -- Add is_shared to appointments if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE appointments ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared to appointments';
  END IF;
  
  -- Add is_shared to reminders if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE reminders ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared to reminders';
  END IF;
  
  -- Add is_shared to customer_special_orders if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_special_orders' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE customer_special_orders ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared to customer_special_orders';
  END IF;
END $$;
*/

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================
