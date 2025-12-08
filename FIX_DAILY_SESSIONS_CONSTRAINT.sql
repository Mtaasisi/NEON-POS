-- ================================================
-- QUICK FIX: daily_opening_sessions ON CONFLICT Error
-- ================================================
-- This fixes the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- Step 1: Clean up any duplicate active sessions per day
-- Keep only the most recent one
WITH duplicates AS (
  SELECT id, 
         date,
         is_active,
         ROW_NUMBER() OVER (PARTITION BY date, is_active ORDER BY opened_at DESC) as rn
  FROM public.daily_opening_sessions
  WHERE is_active = true
)
DELETE FROM public.daily_opening_sessions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Drop existing constraint if exists
ALTER TABLE public.daily_opening_sessions
DROP CONSTRAINT IF EXISTS unique_active_session_per_day;

DROP INDEX IF EXISTS idx_unique_active_session_per_day;

-- Step 3: Add unique constraint on (date, is_active)
-- This allows one active session per day
ALTER TABLE public.daily_opening_sessions
ADD CONSTRAINT unique_active_session_per_day 
UNIQUE (date, is_active);

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- The unique constraint is now in place.
-- The upsert with ON CONFLICT (date, is_active) will now work!
-- ================================================
