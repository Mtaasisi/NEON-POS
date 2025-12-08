-- ================================================
-- COMPLETE FIX: All Schema Errors in Supabase Database
-- ================================================
-- Fixes these errors:
-- 1. column "type" of relation "lats_stock_movements" does not exist
-- 2. there is no unique or exclusion constraint matching the ON CONFLICT specification
-- 3. column "images" does not exist (application code issue - images in product_images table)
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- FIX 1: Add 'type' column to lats_stock_movements
-- ================================================
-- The code inserts 'type' but table only has 'movement_type'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_stock_movements' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.lats_stock_movements 
    ADD COLUMN type TEXT;
    
    -- Copy existing movement_type to type for backward compatibility
    UPDATE public.lats_stock_movements 
    SET type = movement_type 
    WHERE type IS NULL;
    
    RAISE NOTICE '✅ Added type column to lats_stock_movements';
  ELSE
    RAISE NOTICE '✅ type column already exists';
  END IF;
END $$;

-- ================================================
-- FIX 2: Fix daily_opening_sessions unique constraint
-- ================================================
-- The upsert uses ON CONFLICT (date, is_active) but no unique constraint exists
-- We need to add a unique constraint on (date, is_active) for the upsert to work

-- First ensure table exists with all required columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'daily_opening_sessions'
  ) THEN
    CREATE TABLE public.daily_opening_sessions (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        date date NOT NULL,
        opened_at timestamp with time zone DEFAULT now() NOT NULL,
        opened_by character varying(255),
        opened_by_user_id uuid,
        is_active boolean DEFAULT true,
        notes text,
        created_at timestamp with time zone DEFAULT now()
    );
    RAISE NOTICE '✅ Created daily_opening_sessions table';
  END IF;
END $$;

-- Add PRIMARY KEY if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_opening_sessions_pkey'
    AND conrelid = 'public.daily_opening_sessions'::regclass
  ) THEN
    -- Check if id column exists first
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'daily_opening_sessions' 
      AND column_name = 'id'
    ) THEN
      ALTER TABLE public.daily_opening_sessions
      ADD CONSTRAINT daily_opening_sessions_pkey PRIMARY KEY (id);
      RAISE NOTICE '✅ Added primary key to daily_opening_sessions';
    END IF;
  END IF;
END $$;

-- Clean up duplicate active sessions (keep only the most recent one per day)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT date, is_active, COUNT(*) as cnt
    FROM public.daily_opening_sessions
    WHERE is_active = true
    GROUP BY date, is_active
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    -- Delete duplicate active sessions, keep only the most recent one
    DELETE FROM public.daily_opening_sessions
    WHERE id IN (
      SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY date, is_active ORDER BY opened_at DESC) as rn
        FROM public.daily_opening_sessions
        WHERE is_active = true
      ) ranked
      WHERE rn > 1
    );
    RAISE NOTICE '✅ Cleaned up % duplicate active sessions', duplicate_count;
  END IF;
END $$;

-- Drop existing constraint/index if exists (to recreate properly)
DO $$
BEGIN
  -- Drop constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_active_session_per_day'
  ) THEN
    ALTER TABLE public.daily_opening_sessions
    DROP CONSTRAINT unique_active_session_per_day;
  END IF;
  
  -- Drop index if exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_unique_active_session_per_day'
  ) THEN
    DROP INDEX IF EXISTS idx_unique_active_session_per_day;
  END IF;
END $$;

-- Create unique constraint on (date, is_active) for upsert to work
-- This allows one active session per day, and one inactive session per day
ALTER TABLE public.daily_opening_sessions
ADD CONSTRAINT unique_active_session_per_day 
UNIQUE (date, is_active);

DO $$
BEGIN
  RAISE NOTICE '✅ Created unique constraint on (date, is_active) for daily_opening_sessions';
END $$;

-- ================================================
-- FIX 3: Fix user_settings unique constraint
-- ================================================
-- The upsert uses ON CONFLICT (user_id) but no unique constraint exists

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing constraint if exists
ALTER TABLE public.user_settings
DROP CONSTRAINT IF EXISTS user_settings_user_id_key;

-- Add unique constraint on user_id for upsert to work
ALTER TABLE public.user_settings
ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings(updated_at);

DO $$
BEGIN
  RAISE NOTICE '✅ Created unique constraint on user_id for user_settings';
END $$;

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- Schema fixes applied:
-- 1. ✅ Added 'type' column to lats_stock_movements
-- 2. ✅ Created unique constraint on (date, is_active) for daily_opening_sessions
-- 3. ✅ Created unique constraint on user_id for user_settings
-- 
-- NOTE: The 'images' column error is in application code:
-- - Code queries: SELECT images FROM lats_products
-- - Should query: SELECT * FROM product_images WHERE product_id = ...
-- - This needs a code fix, not a database fix
-- ================================================
