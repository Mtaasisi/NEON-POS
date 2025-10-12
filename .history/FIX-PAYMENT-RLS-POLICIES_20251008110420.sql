-- ============================================
-- FIX RLS POLICIES FOR PURCHASE ORDER PAYMENTS
-- ============================================
-- This ensures users can read payment records they create
-- Run this in your Neon Database SQL Editor
-- ============================================

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'purchase_order_payments';

-- Disable RLS temporarily to check current policies
ALTER TABLE purchase_order_payments DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can insert purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can update their purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can view all purchase order payments" ON purchase_order_payments;

-- Re-enable RLS
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
-- Policy 1: Allow all authenticated users to view all payment records
CREATE POLICY "Allow authenticated users to view all payments"
  ON purchase_order_payments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Allow authenticated users to insert payment records
CREATE POLICY "Allow authenticated users to create payments"
  ON purchase_order_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: Allow authenticated users to update payment records
CREATE POLICY "Allow authenticated users to update payments"
  ON purchase_order_payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

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

