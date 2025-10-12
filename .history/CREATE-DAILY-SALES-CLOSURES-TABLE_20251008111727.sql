-- =============================================================================
-- CREATE DAILY SALES CLOSURES TABLE
-- =============================================================================
-- This table tracks daily sales closures for the POS system
-- Used to record when a day's sales are closed and by whom
-- =============================================================================

-- Drop table if exists (optional - comment out if you want to preserve data)
-- DROP TABLE IF EXISTS daily_sales_closures CASCADE;

-- Create the daily_sales_closures table
CREATE TABLE IF NOT EXISTS daily_sales_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_sales NUMERIC(12, 2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_by TEXT NOT NULL,
    closed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

-- Policy: Allow authenticated users to read all closures
CREATE POLICY "Allow authenticated users to read daily closures"
    ON daily_sales_closures
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert closures
CREATE POLICY "Allow authenticated users to create daily closures"
    ON daily_sales_closures
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update closures
CREATE POLICY "Allow authenticated users to update daily closures"
    ON daily_sales_closures
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Only admins can delete closures (optional - adjust based on your needs)
CREATE POLICY "Allow admins to delete daily closures"
    ON daily_sales_closures
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'owner')
        )
    );

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

-- Grant permissions
GRANT ALL ON daily_sales_closures TO authenticated;
GRANT ALL ON daily_sales_closures TO service_role;

-- Add helpful comment
COMMENT ON TABLE daily_sales_closures IS 'Tracks daily sales closures in the POS system, including who closed the day and sales summary';
COMMENT ON COLUMN daily_sales_closures.date IS 'Unique date for the closure (one closure per day)';
COMMENT ON COLUMN daily_sales_closures.sales_data IS 'JSONB field containing payment summaries and other closure details';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Daily sales closures table created successfully!';
    RAISE NOTICE '📊 Table: daily_sales_closures';
    RAISE NOTICE '🔒 RLS policies enabled';
    RAISE NOTICE '📈 Indexes created for optimal performance';
END $$;

