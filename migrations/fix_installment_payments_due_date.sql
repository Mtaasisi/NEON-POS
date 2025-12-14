-- ================================================
-- FIX MISSING due_date COLUMN IN installment_payments
-- ================================================
-- This script ensures the due_date column exists in installment_payments

DO $$
BEGIN
    -- Check if due_date column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'installment_payments' 
        AND column_name = 'due_date'
    ) THEN
        -- Add due_date column
        ALTER TABLE installment_payments 
        ADD COLUMN due_date DATE NOT NULL DEFAULT CURRENT_DATE;
        
        RAISE NOTICE 'Added due_date column to installment_payments';
    ELSE
        RAISE NOTICE 'due_date column already exists in installment_payments';
    END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'installment_payments' 
AND column_name = 'due_date';

