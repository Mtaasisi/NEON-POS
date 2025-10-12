-- ============================================================================
-- DISABLE RLS ON CUSTOMERS TABLE
-- ============================================================================
-- This ensures the customers table is accessible without authentication issues

-- Drop all existing RLS policies on customers
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'customers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON customers', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Disable RLS completely
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ❌'
        ELSE 'RLS DISABLED ✅'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'customers';

SELECT '✅ Customers table is now fully accessible!' as status;

