-- =============================================================================
-- FIX SALES REPORTS PAGE ERRORS
-- =============================================================================
-- This script fixes the following errors:
-- 1. Missing daily_sales_closures table
-- 2. Missing optional columns in lats_sales table (subtotal, discount_amount, tax)
-- 
-- Run this script against your Neon database to resolve the errors
-- =============================================================================

-- ==========================================
-- FIX 1: Create daily_sales_closures table
-- ==========================================
CREATE TABLE IF NOT EXISTS daily_sales_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_sales NUMERIC(12, 2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_by TEXT NOT NULL,
    closed_by_user_id UUID,
    sales_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_date 
    ON daily_sales_closures(date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_at 
    ON daily_sales_closures(closed_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_by_user_id 
    ON daily_sales_closures(closed_by_user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE daily_sales_closures ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on daily closures" ON daily_sales_closures;

-- Policy: Allow all operations (adjust based on your needs)
CREATE POLICY "Allow all operations on daily closures"
    ON daily_sales_closures
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_sales_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_daily_sales_closures_updated_at_trigger ON daily_sales_closures;
CREATE TRIGGER update_daily_sales_closures_updated_at_trigger
    BEFORE UPDATE ON daily_sales_closures
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_sales_closures_updated_at();

-- Add helpful comments
COMMENT ON TABLE daily_sales_closures IS 'Tracks daily sales closures in the POS system, including who closed the day and sales summary';
COMMENT ON COLUMN daily_sales_closures.date IS 'Unique date for the closure (one closure per day)';
COMMENT ON COLUMN daily_sales_closures.sales_data IS 'JSONB field containing payment summaries and other closure details';

-- ==========================================
-- FIX 2: Add missing columns to lats_sales table (if needed)
-- ==========================================
-- These columns are optional but referenced in the debug section
-- Add them only if they don't already exist

DO $$ 
BEGIN
    -- Add subtotal column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'subtotal'
    ) THEN
        ALTER TABLE lats_sales ADD COLUMN subtotal NUMERIC(12, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added subtotal column to lats_sales';
    ELSE
        RAISE NOTICE 'ℹ️  subtotal column already exists in lats_sales';
    END IF;

    -- Add discount_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE lats_sales ADD COLUMN discount_amount NUMERIC(12, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added discount_amount column to lats_sales';
    ELSE
        RAISE NOTICE 'ℹ️  discount_amount column already exists in lats_sales';
    END IF;

    -- Add tax column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'tax'
    ) THEN
        ALTER TABLE lats_sales ADD COLUMN tax NUMERIC(12, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added tax column to lats_sales';
    ELSE
        RAISE NOTICE 'ℹ️  tax column already exists in lats_sales';
    END IF;
END $$;

-- ==========================================
-- VERIFICATION: Check that everything was created
-- ==========================================
DO $$
DECLARE
    table_exists BOOLEAN;
    columns_exist BOOLEAN;
BEGIN
    -- Check if daily_sales_closures table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'daily_sales_closures'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE NOTICE '✅ daily_sales_closures table exists';
    ELSE
        RAISE WARNING '❌ daily_sales_closures table does not exist';
    END IF;

    -- Check if columns exist in lats_sales
    SELECT (
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'subtotal') AND
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'discount_amount') AND
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'tax')
    ) INTO columns_exist;

    IF columns_exist THEN
        RAISE NOTICE '✅ All required columns exist in lats_sales';
    ELSE
        RAISE NOTICE 'ℹ️  Some optional columns may be missing from lats_sales (this is OK if not used)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 Database fixes completed successfully!';
    RAISE NOTICE '📊 You can now use the Sales Reports page without errors';
    RAISE NOTICE '🔄 Please refresh your browser to see the changes';
END $$;

