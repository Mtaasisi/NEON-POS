-- ============================================
-- FIX SESSION & CLOSURE TABLES RLS POLICIES - FINAL FIX
-- ============================================
-- This migration ensures the correct RLS policies are in place for:
-- 1. daily_opening_sessions
-- 2. daily_sales_closures
--
-- These tables need permissive policies since they are system-wide,
-- not user-specific. Any authenticated user should be able to
-- create, read, update sessions and closures.
-- ============================================

BEGIN;

-- ============================================
-- FIX daily_opening_sessions TABLE
-- ============================================

-- First, ensure the table exists with correct structure
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_opening_sessions') THEN
    CREATE TABLE public.daily_opening_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      opened_by TEXT NOT NULL,
      opened_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      closed_at TIMESTAMPTZ,
      opening_cash DECIMAL(12, 2),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_active_session_per_day UNIQUE(date, is_active)
    );

    -- Create indexes
    CREATE INDEX idx_daily_opening_sessions_date ON daily_opening_sessions(date DESC);
    CREATE INDEX idx_daily_opening_sessions_active ON daily_opening_sessions(is_active) WHERE is_active = TRUE;
    CREATE INDEX idx_daily_opening_sessions_opened_by ON daily_opening_sessions(opened_by_user_id);
    
    RAISE NOTICE 'Created daily_opening_sessions table';
  END IF;
END $$;

-- Drop ALL existing RLS policies (to start fresh)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'daily_opening_sessions' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.daily_opening_sessions';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Disable and re-enable RLS to ensure clean state
ALTER TABLE public.daily_opening_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_opening_sessions ENABLE ROW LEVEL SECURITY;

-- Create new permissive policies for authenticated users
-- SELECT policy
CREATE POLICY "authenticated_users_select_sessions" 
ON public.daily_opening_sessions
FOR SELECT 
TO authenticated
USING (true);

-- INSERT policy
CREATE POLICY "authenticated_users_insert_sessions" 
ON public.daily_opening_sessions
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- UPDATE policy
CREATE POLICY "authenticated_users_update_sessions" 
ON public.daily_opening_sessions
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE policy
CREATE POLICY "authenticated_users_delete_sessions" 
ON public.daily_opening_sessions
FOR DELETE 
TO authenticated
USING (true);

-- Update table comment
COMMENT ON TABLE public.daily_opening_sessions IS 
  'Tracks daily POS session openings. RLS policies allow all authenticated users to access since sessions are system-wide. The opened_by_user_id column tracks who opened each session for audit purposes.';

-- ============================================
-- FIX daily_sales_closures TABLE
-- ============================================

-- Ensure the table exists with correct structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_sales_closures') THEN
    CREATE TABLE public.daily_sales_closures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL UNIQUE,
      total_sales NUMERIC(12,2) DEFAULT 0,
      total_transactions INTEGER DEFAULT 0,
      closed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      closed_by TEXT NOT NULL,
      closed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      sales_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      session_id UUID REFERENCES daily_opening_sessions(id) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE INDEX idx_daily_sales_closures_date ON daily_sales_closures(date DESC);
    CREATE INDEX idx_daily_sales_closures_closed_by ON daily_sales_closures(closed_by_user_id);
    CREATE INDEX idx_daily_sales_closures_session ON daily_sales_closures(session_id);
    
    RAISE NOTICE 'Created daily_sales_closures table';
  END IF;
END $$;

-- Drop ALL existing RLS policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'daily_sales_closures' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.daily_sales_closures';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Disable and re-enable RLS
ALTER TABLE public.daily_sales_closures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales_closures ENABLE ROW LEVEL SECURITY;

-- Create new permissive policies
-- SELECT policy
CREATE POLICY "authenticated_users_select_closures" 
ON public.daily_sales_closures
FOR SELECT 
TO authenticated
USING (true);

-- INSERT policy
CREATE POLICY "authenticated_users_insert_closures" 
ON public.daily_sales_closures
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- UPDATE policy
CREATE POLICY "authenticated_users_update_closures" 
ON public.daily_sales_closures
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE policy
CREATE POLICY "authenticated_users_delete_closures" 
ON public.daily_sales_closures
FOR DELETE 
TO authenticated
USING (true);

-- Update table comment
COMMENT ON TABLE public.daily_sales_closures IS 
  'Tracks daily sales closures for the POS system. RLS policies allow all authenticated users to access since closures are system-wide. The closed_by_user_id column tracks who closed each day for audit purposes.';

-- ============================================
-- VERIFICATION - List all policies
-- ============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICATION: Current RLS Policies';
    RAISE NOTICE '============================================';
    
    RAISE NOTICE 'daily_opening_sessions policies:';
    FOR r IN (
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'daily_opening_sessions' AND schemaname = 'public'
        ORDER BY policyname
    )
    LOOP
        RAISE NOTICE '  - %: % (USING: %, WITH CHECK: %)', r.policyname, r.cmd, r.qual, r.with_check;
    END LOOP;
    
    RAISE NOTICE 'daily_sales_closures policies:';
    FOR r IN (
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'daily_sales_closures' AND schemaname = 'public'
        ORDER BY policyname
    )
    LOOP
        RAISE NOTICE '  - %: % (USING: %, WITH CHECK: %)', r.policyname, r.cmd, r.qual, r.with_check;
    END LOOP;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ RLS policies fixed successfully!';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================
-- TEST QUERIES (optional - run manually if needed)
-- ============================================
-- These queries can be used to test if the policies work correctly
-- Run them as an authenticated user

-- Test 1: Check if you can select from daily_opening_sessions
-- SELECT * FROM daily_opening_sessions LIMIT 1;

-- Test 2: Try to insert a test session (will fail if unique constraint violated, which is ok)
-- INSERT INTO daily_opening_sessions (date, opened_by, opened_by_user_id, is_active)
-- VALUES (CURRENT_DATE + INTERVAL '1 day', 'test', auth.uid(), false)
-- RETURNING *;

-- Test 3: Check if you can select from daily_sales_closures
-- SELECT * FROM daily_sales_closures LIMIT 1;

-- Test 4: Check current policies
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('daily_opening_sessions', 'daily_sales_closures')
-- ORDER BY tablename, policyname;

