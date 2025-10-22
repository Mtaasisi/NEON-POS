-- Add account_id column to installment_payments table
-- This column tracks which finance account receives the payment

-- Check if column exists first, then add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'installment_payments' 
        AND column_name = 'account_id'
    ) THEN
        -- Add account_id column
        ALTER TABLE installment_payments 
        ADD COLUMN account_id UUID REFERENCES finance_accounts(id);
        
        RAISE NOTICE 'Column account_id added to installment_payments table';
    ELSE
        RAISE NOTICE 'Column account_id already exists in installment_payments table';
    END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_installment_payments_account 
ON installment_payments(account_id);

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'installment_payments'
AND column_name = 'account_id';

