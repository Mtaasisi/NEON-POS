-- Fix installment_payments table constraints
-- Remove NOT NULL constraint from columns that should be nullable

-- Make total_amount nullable (this column shouldn't even be required)
ALTER TABLE installment_payments 
ALTER COLUMN total_amount DROP NOT NULL;

-- Set default value for total_amount
ALTER TABLE installment_payments 
ALTER COLUMN total_amount SET DEFAULT 0;

-- Also ensure remaining_amount is nullable
ALTER TABLE installment_payments 
ALTER COLUMN remaining_amount DROP NOT NULL;

-- Set default for remaining_amount
ALTER TABLE installment_payments 
ALTER COLUMN remaining_amount SET DEFAULT 0;

-- Verify changes
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'installment_payments'
AND column_name IN ('total_amount', 'remaining_amount', 'installment_amount', 'amount')
ORDER BY column_name;


