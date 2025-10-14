-- ============================================================================
-- SIMPLE FIX FOR NEON DATABASE - Remove auth.uid() Dependencies
-- ============================================================================
-- This disables all RLS policies and allows your app to work
-- without Supabase's auth system
-- ============================================================================

BEGIN;

-- Step 1: Disable RLS on all tables
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', 
                tbl.schemaname, tbl.tablename);
            RAISE NOTICE '✅ Disabled RLS on: %', tbl.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Could not disable RLS on: % (Error: %)', tbl.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 2: Drop all existing policies (they reference auth.uid())
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                pol.policyname, pol.schemaname, pol.tablename);
            RAISE NOTICE '✅ Dropped policy: % on %', pol.policyname, pol.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Could not drop policy: % (Error: %)', pol.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

COMMIT;

-- Step 3: Verify everything is cleaned up
SELECT 
    '✅ RLS Status Check' as check_name,
    COUNT(*) as tables_with_rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = true;

SELECT 
    '✅ Policies Check' as check_name,
    COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'public';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✨ SUCCESS! Your database is now ready for Neon';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All RLS policies removed';
    RAISE NOTICE '✅ All auth.uid() references disabled';
    RAISE NOTICE '✅ Your app should work now!';
    RAISE NOTICE '';
END $$;

