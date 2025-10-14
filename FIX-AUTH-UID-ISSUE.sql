-- ============================================================================
-- FIX: Remove auth.uid() dependencies for Neon Database
-- ============================================================================
-- Supabase's auth.uid() doesn't exist in regular PostgreSQL/Neon
-- This script disables RLS policies that depend on it
-- ============================================================================

-- Disable RLS on tables that use auth.uid() in policies
DO $$
DECLARE
    tbl RECORD;
BEGIN
    -- Find all tables with RLS enabled
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- Disable RLS for each table
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl.tablename);
        RAISE NOTICE 'Disabled RLS on table: %', tbl.tablename;
    END LOOP;
END $$;

-- Drop all policies that use auth.uid()
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

COMMIT;

-- Verification
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = true
ORDER BY tablename;

COMMIT;

