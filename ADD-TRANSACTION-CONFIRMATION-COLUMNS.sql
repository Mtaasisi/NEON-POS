-- ============================================================
-- ADD TRANSACTION CONFIRMATION TRACKING COLUMNS
-- ============================================================
-- This adds columns to track who confirmed transactions and when
-- Run this in your Neon database console

-- Add confirmed_by column (stores user ID who confirmed the transaction)
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS confirmed_by UUID;

-- Add confirmed_at column (stores timestamp when transaction was confirmed)
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN lats_sales.confirmed_by IS 'User ID of admin who confirmed this transaction';
COMMENT ON COLUMN lats_sales.confirmed_at IS 'Timestamp when this transaction was confirmed';

-- Create index for faster queries on confirmed transactions
CREATE INDEX IF NOT EXISTS idx_lats_sales_confirmed_at ON lats_sales(confirmed_at);
CREATE INDEX IF NOT EXISTS idx_lats_sales_status ON lats_sales(status);

-- Show success message
SELECT '✅ Transaction confirmation columns added successfully!' as status;

