-- ================================================
-- FIX: user_settings table unique constraint
-- ================================================
-- Fixes: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- 
-- The code uses upsert which requires a unique constraint on user_id
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- Ensure user_settings table exists
-- ================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- Add unique constraint on user_id (required for upsert)
-- ================================================

-- Drop existing constraint if it exists with wrong name
ALTER TABLE public.user_settings
DROP CONSTRAINT IF EXISTS user_settings_user_id_key;

ALTER TABLE public.user_settings
DROP CONSTRAINT IF EXISTS unique_user_settings;

-- Add unique constraint on user_id for upsert to work
ALTER TABLE public.user_settings
ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);

-- ================================================
-- Create indexes for performance
-- ================================================

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings(updated_at);

-- ================================================
-- Create trigger for updated_at
-- ================================================

CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- Added unique constraint on user_id for user_settings table
-- The upsert with ON CONFLICT will now work!
-- ================================================
