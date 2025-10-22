-- ============================================
-- ADD MISSING INSTALLMENT_NUMBER COLUMN
-- ============================================
-- This migration adds the installment_number column if it's missing
-- ============================================

DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'installment_payments' 
        AND column_name = 'installment_number'
    ) THEN
        -- Add the column if missing
        ALTER TABLE installment_payments 
        ADD COLUMN installment_number INTEGER NOT NULL DEFAULT 1;
        
        RAISE NOTICE 'Added installment_number column to installment_payments';
    ELSE
        RAISE NOTICE 'installment_number column already exists in installment_payments';
    END IF;
END $$;

-- Verify the fix
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'installment_payments' 
AND column_name = 'installment_number';

