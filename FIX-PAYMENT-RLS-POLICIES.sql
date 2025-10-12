-- ============================================
-- FIX RLS POLICIES FOR PURCHASE ORDER PAYMENTS
-- ============================================
-- This ensures users can read payment records they create
-- Run this in your Neon Database SQL Editor
-- ============================================

-- First, check if table exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'purchase_order_payments'
  ) THEN
    RAISE EXCEPTION 'Table purchase_order_payments does not exist!';
  END IF;
END $$;

-- Check current RLS status and policies
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'purchase_order_payments';

-- Show existing policies
SELECT 
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename = 'purchase_order_payments'
ORDER BY policyname;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'purchase_order_payments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON purchase_order_payments', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
-- Policy 1: Allow all authenticated users to view all payment records
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_order_payments' 
      AND policyname = 'Allow authenticated users to view all payments'
  ) THEN
    CREATE POLICY "Allow authenticated users to view all payments"
      ON purchase_order_payments
      FOR SELECT
      TO authenticated
      USING (true);
    RAISE NOTICE '✓ Created policy: Allow authenticated users to view all payments';
  END IF;
END $$;

-- Policy 2: Allow authenticated users to insert payment records
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_order_payments' 
      AND policyname = 'Allow authenticated users to create payments'
  ) THEN
    CREATE POLICY "Allow authenticated users to create payments"
      ON purchase_order_payments
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
    RAISE NOTICE '✓ Created policy: Allow authenticated users to create payments';
  END IF;
END $$;

-- Policy 3: Allow authenticated users to update payment records
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_order_payments' 
      AND policyname = 'Allow authenticated users to update payments'
  ) THEN
    CREATE POLICY "Allow authenticated users to update payments"
      ON purchase_order_payments
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE '✓ Created policy: Allow authenticated users to update payments';
  END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON purchase_order_payments TO authenticated;

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'purchase_order_payments'
ORDER BY policyname;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ RLS policies for purchase_order_payments updated successfully!';
  RAISE NOTICE '📋 Policies created:';
  RAISE NOTICE '   1. Allow authenticated users to view all payments';
  RAISE NOTICE '   2. Allow authenticated users to create payments';
  RAISE NOTICE '   3. Allow authenticated users to update payments';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 You should now be able to read payment records after creation!';
END $$;

