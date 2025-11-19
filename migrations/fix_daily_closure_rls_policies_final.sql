-- ============================================================================
-- COMPREHENSIVE FIX FOR DAILY CLOSURE & SESSION RLS POLICIES
-- ============================================================================
-- This migration fixes the RLS policies that are causing the error:
-- "No data returned from insert. Check RLS policies and database triggers."
--
-- The problem: RLS policies were using auth.role() = 'authenticated' which
-- doesn't work correctly with Supabase/Neon authentication.
--
-- The solution: Use proper RLS policies with 'TO authenticated' or auth.uid()
-- ============================================================================

-- ============================================================================
-- PART 1: FIX DAILY_SALES_CLOSURES TABLE
-- ============================================================================

-- Drop ALL existing RLS policies on daily_sales_closures
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'daily_sales_closures' 
        AND schemaname = 'public'
    )
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.daily_sales_closures CASCADE';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Disable and re-enable RLS for clean slate
ALTER TABLE public.daily_sales_closures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales_closures ENABLE ROW LEVEL SECURITY;

-- Create new WORKING policies using proper Supabase/Neon authentication

-- Policy 1: Allow authenticated users to SELECT (view) all closures
CREATE POLICY "authenticated_select_closures" 
ON public.daily_sales_closures
FOR SELECT 
TO authenticated
USING (true);

-- Policy 2: Allow authenticated users to INSERT (create) new closures
CREATE POLICY "authenticated_insert_closures" 
ON public.daily_sales_closures
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Policy 3: Allow authenticated users to UPDATE existing closures
CREATE POLICY "authenticated_update_closures" 
ON public.daily_sales_closures
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Allow authenticated users to DELETE closures (if needed)
CREATE POLICY "authenticated_delete_closures" 
ON public.daily_sales_closures
FOR DELETE 
TO authenticated
USING (true);

-- Add helpful comment
COMMENT ON TABLE public.daily_sales_closures IS 
  'Tracks daily sales closures for the POS system. ' ||
  'RLS policies allow all authenticated users full access since closures are system-wide. ' ||
  'The closed_by_user_id column tracks who closed each day for audit purposes.';

RAISE NOTICE '✅ Fixed RLS policies for daily_sales_closures';

-- ============================================================================
-- PART 2: FIX DAILY_OPENING_SESSIONS TABLE
-- ============================================================================

-- Drop ALL existing RLS policies on daily_opening_sessions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'daily_opening_sessions' 
        AND schemaname = 'public'
    )
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.daily_opening_sessions CASCADE';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Disable and re-enable RLS for clean slate
ALTER TABLE public.daily_opening_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_opening_sessions ENABLE ROW LEVEL SECURITY;

-- Create new WORKING policies

-- Policy 1: Allow authenticated users to SELECT (view) all sessions
CREATE POLICY "authenticated_select_sessions" 
ON public.daily_opening_sessions
FOR SELECT 
TO authenticated
USING (true);

-- Policy 2: Allow authenticated users to INSERT (create) new sessions
CREATE POLICY "authenticated_insert_sessions" 
ON public.daily_opening_sessions
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Policy 3: Allow authenticated users to UPDATE existing sessions
CREATE POLICY "authenticated_update_sessions" 
ON public.daily_opening_sessions
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Allow authenticated users to DELETE sessions (if needed)
CREATE POLICY "authenticated_delete_sessions" 
ON public.daily_opening_sessions
FOR DELETE 
TO authenticated
USING (true);

-- Add helpful comment
COMMENT ON TABLE public.daily_opening_sessions IS 
  'Tracks daily opening sessions for the POS system. ' ||
  'RLS policies allow all authenticated users full access since sessions are system-wide. ' ||
  'The opened_by_user_id column tracks who created each session for audit purposes.';

RAISE NOTICE '✅ Fixed RLS policies for daily_opening_sessions';

-- ============================================================================
-- PART 3: GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Ensure authenticated users have the necessary table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_sales_closures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_opening_sessions TO authenticated;

-- Ensure sequence permissions (for UUID generation, though using gen_random_uuid())
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

RAISE NOTICE '✅ Granted table permissions to authenticated users';

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

-- Verify the new policies were created
DO $$
DECLARE
    closure_policy_count INTEGER;
    session_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO closure_policy_count
    FROM pg_policies 
    WHERE tablename = 'daily_sales_closures' 
    AND schemaname = 'public';
    
    SELECT COUNT(*) INTO session_policy_count
    FROM pg_policies 
    WHERE tablename = 'daily_opening_sessions' 
    AND schemaname = 'public';
    
    RAISE NOTICE '📊 Verification Results:';
    RAISE NOTICE '  - daily_sales_closures policies: %', closure_policy_count;
    RAISE NOTICE '  - daily_opening_sessions policies: %', session_policy_count;
    
    IF closure_policy_count >= 4 AND session_policy_count >= 4 THEN
        RAISE NOTICE '✅ All RLS policies created successfully!';
    ELSE
        RAISE WARNING '⚠️ Expected at least 4 policies per table, but found fewer';
    END IF;
END $$;

-- Display the new policies
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
WHERE tablename IN ('daily_sales_closures', 'daily_opening_sessions')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- ✅ Fixed RLS policies for daily_sales_closures
-- ✅ Fixed RLS policies for daily_opening_sessions
-- ✅ Granted necessary permissions to authenticated users
-- ✅ Verified all policies were created
--
-- The error "No data returned from insert. Check RLS policies" should now be resolved!
-- ============================================================================

