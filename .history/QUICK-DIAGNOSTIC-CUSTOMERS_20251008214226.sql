-- ============================================================================
-- QUICK DIAGNOSTIC - Check Customers Table
-- ============================================================================

-- Check if customers table exists and what columns it has
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Check RLS status on customers table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'customers';

-- Try to select from customers (should work if RLS is off or policies allow)
SELECT COUNT(*) as total_customers FROM customers;

-- List all RLS policies on customers table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'customers';

