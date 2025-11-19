-- Add reference_number column to installment_payments table
-- This column stores payment reference numbers for tracking

-- Check if column exists first, then add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'installment_payments' 
        AND column_name = 'reference_number'
    ) THEN
        -- Add reference_number column
        ALTER TABLE installment_payments 
        ADD COLUMN reference_number TEXT;
        
        RAISE NOTICE 'Column reference_number added to installment_payments table';
    ELSE
        RAISE NOTICE 'Column reference_number already exists in installment_payments table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'installment_payments'
AND column_name = 'reference_number';

