-- ============================================================================
-- FIX MISSING BRANCH COLUMNS FOR ALL ENTITY TABLES
-- ============================================================================
-- This script adds branch_id and is_shared columns to all tables that need
-- branch isolation but may be missing these columns.
-- Run this in your Supabase SQL Editor to ensure all tables have proper
-- branch isolation support.
-- ============================================================================

-- ============================================================================
-- 1. ADD branch_id AND is_shared TO QUALITY CHECKS
-- ============================================================================
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
    RAISE NOTICE '✅ Added branch_id column to purchase_order_quality_checks table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in purchase_order_quality_checks';
  END IF;

  -- Add is_shared to purchase_order_quality_checks if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_quality_checks' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE purchase_order_quality_checks ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared column to purchase_order_quality_checks table';
  ELSE
    RAISE NOTICE 'ℹ️ is_shared column already exists in purchase_order_quality_checks';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add columns to purchase_order_quality_checks: %', SQLERRM;
END $$;

-- ============================================================================
-- 2. ADD branch_id AND is_shared TO TRADE-IN TRANSACTIONS
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to lats_trade_in_transactions if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_trade_in_transactions' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_trade_in_transactions ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_branch_id ON lats_trade_in_transactions(branch_id);
    RAISE NOTICE '✅ Added branch_id column to lats_trade_in_transactions table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in lats_trade_in_transactions';
  END IF;

  -- Add is_shared to lats_trade_in_transactions if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_trade_in_transactions' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_trade_in_transactions ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared column to lats_trade_in_transactions table';
  ELSE
    RAISE NOTICE 'ℹ️ is_shared column already exists in lats_trade_in_transactions';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add columns to lats_trade_in_transactions: %', SQLERRM;
END $$;

-- ============================================================================
-- 3. ADD branch_id AND is_shared TO APPOINTMENTS
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to appointments if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON appointments(branch_id);
    RAISE NOTICE '✅ Added branch_id column to appointments table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in appointments';
  END IF;

  -- Add is_shared to appointments if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE appointments ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared column to appointments table';
  ELSE
    RAISE NOTICE 'ℹ️ is_shared column already exists in appointments';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add columns to appointments: %', SQLERRM;
END $$;

-- ============================================================================
-- 4. ADD branch_id AND is_shared TO REMINDERS
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to reminders if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE reminders ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_reminders_branch_id ON reminders(branch_id);
    RAISE NOTICE '✅ Added branch_id column to reminders table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in reminders';
  END IF;

  -- Add is_shared to reminders if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE reminders ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared column to reminders table';
  ELSE
    RAISE NOTICE 'ℹ️ is_shared column already exists in reminders';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add columns to reminders: %', SQLERRM;
END $$;

-- ============================================================================
-- 5. ADD branch_id AND is_shared TO CUSTOMER SPECIAL ORDERS
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to customer_special_orders if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_special_orders' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE customer_special_orders ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_special_orders_branch_id ON customer_special_orders(branch_id);
    RAISE NOTICE '✅ Added branch_id column to customer_special_orders table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in customer_special_orders';
  END IF;

  -- Add is_shared to customer_special_orders if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_special_orders' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE customer_special_orders ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared column to customer_special_orders table';
  ELSE
    RAISE NOTICE 'ℹ️ is_shared column already exists in customer_special_orders';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add columns to customer_special_orders: %', SQLERRM;
END $$;

-- ============================================================================
-- 6. ADD branch_id TO SPARE PARTS
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to lats_spare_parts if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_spare_parts' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_spare_parts ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_spare_parts_branch_id ON lats_spare_parts(branch_id);
    RAISE NOTICE '✅ Added branch_id column to lats_spare_parts table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in lats_spare_parts';
  END IF;

  -- Add is_shared to lats_spare_parts if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_spare_parts' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_spare_parts ADD COLUMN is_shared BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_shared column to lats_spare_parts table';
  ELSE
    RAISE NOTICE 'ℹ️ is_shared column already exists in lats_spare_parts';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add columns to lats_spare_parts: %', SQLERRM;
END $$;

-- ============================================================================
-- 7. ADD branch_id TO EMPLOYEES (if missing)
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to employees if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
    RAISE NOTICE '✅ Added branch_id column to employees table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in employees';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add branch_id to employees: %', SQLERRM;
END $$;

-- ============================================================================
-- 8. ADD branch_id TO ATTENDANCE RECORDS
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to attendance_records if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_records' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE attendance_records ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_attendance_records_branch_id ON attendance_records(branch_id);
    RAISE NOTICE '✅ Added branch_id column to attendance_records table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in attendance_records';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add branch_id to attendance_records: %', SQLERRM;
END $$;

-- ============================================================================
-- 9. ADD branch_id TO LOYALTY POINTS
-- ============================================================================
DO $$
BEGIN
  -- Add branch_id to loyalty_points if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'loyalty_points' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE loyalty_points ADD COLUMN branch_id UUID;
    CREATE INDEX IF NOT EXISTS idx_loyalty_points_branch_id ON loyalty_points(branch_id);
    RAISE NOTICE '✅ Added branch_id column to loyalty_points table';
  ELSE
    RAISE NOTICE 'ℹ️ branch_id column already exists in loyalty_points';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add branch_id to loyalty_points: %', SQLERRM;
END $$;

-- ============================================================================
-- 10. VERIFY store_locations HAS ALL ISOLATION FLAGS
-- ============================================================================
DO $$
DECLARE
  missing_flags TEXT[] := ARRAY[]::TEXT[];
  flag TEXT;
  required_flags TEXT[] := ARRAY[
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
  RAISE NOTICE '10. VERIFYING store_locations FLAGS';
  RAISE NOTICE '========================================';
  
  FOREACH flag IN ARRAY required_flags
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'store_locations' 
      AND column_name = flag
    ) THEN
      missing_flags := array_append(missing_flags, flag);
      RAISE WARNING '⚠️ Missing flag in store_locations: %', flag;
    END IF;
  END LOOP;
  
  IF array_length(missing_flags, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing flags in store_locations: %', array_to_string(missing_flags, ', ');
    RAISE NOTICE '💡 Run migrations/complete_branch_isolation_schema.sql to add missing flags';
  ELSE
    RAISE NOTICE '✅ All required isolation flags exist in store_locations';
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ BRANCH COLUMNS VERIFICATION COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'All tables have been checked and missing columns have been added.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run VERIFY_BRANCH_ISOLATION_DATABASE.sql to verify everything';
  RAISE NOTICE '2. Run create-missing-database-functions.sql to ensure all functions exist';
  RAISE NOTICE '3. Run migrations/complete_branch_isolation_schema.sql to ensure store_locations has all flags';
  RAISE NOTICE '';
END $$;
