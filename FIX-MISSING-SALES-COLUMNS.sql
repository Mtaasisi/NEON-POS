-- ============================================================
-- FIX MISSING COLUMNS IN LATS_SALES TABLE
-- ============================================================
-- This adds all the missing columns that the app expects
-- Run this in your Neon database console

-- Add branch_id for multi-branch support
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Add user_id if missing (for tracking who made the sale)
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add payment_status if missing
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'completed';

-- Add sold_by if missing (cashier name/email)
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS sold_by TEXT;

-- Add subtotal if missing
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;

-- Add discount if missing
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;

-- Add tax if missing
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;

-- Add customer fields if missing
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add notes if missing
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add status if missing
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lats_sales_branch_id ON lats_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_sales_user_id ON lats_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_sales_customer_id ON lats_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_lats_sales_created_at ON lats_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lats_sales_status ON lats_sales(status);

-- Add comments for documentation
COMMENT ON COLUMN lats_sales.branch_id IS 'Branch where the sale was made (for multi-branch support)';
COMMENT ON COLUMN lats_sales.user_id IS 'User ID of the cashier who made the sale';
COMMENT ON COLUMN lats_sales.sold_by IS 'Email or name of the cashier';

-- Show success message
SELECT '✅ All missing columns added to lats_sales table successfully!' as status;

-- Show current column list
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lats_sales'
ORDER BY ordinal_position;

