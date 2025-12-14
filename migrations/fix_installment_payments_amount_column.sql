-- ============================================
-- FIX MISSING AMOUNT COLUMN IN INSTALLMENT_PAYMENTS
-- ============================================
-- This script ensures the amount column exists in installment_payments
-- ============================================

DO $$ 
BEGIN
    -- Check if amount column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'installment_payments' 
        AND column_name = 'amount'
    ) THEN
        -- Add the column if missing
        ALTER TABLE installment_payments 
        ADD COLUMN amount NUMERIC NOT NULL DEFAULT 0;
        
        RAISE NOTICE 'Added amount column to installment_payments';
    ELSE
        RAISE NOTICE 'amount column already exists in installment_payments';
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
AND column_name = 'amount';

-- ============================================
-- VERIFICATION COMPLETE
-- ============================================

