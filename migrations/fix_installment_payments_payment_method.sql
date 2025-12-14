-- ============================================
-- FIX MISSING payment_method COLUMN IN installment_payments
-- ============================================
-- This script ensures the payment_method column exists in installment_payments
-- ============================================

DO $$ 
BEGIN
    -- Check if payment_method column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'installment_payments' 
        AND column_name = 'payment_method'
    ) THEN
        -- Add the column if missing
        ALTER TABLE installment_payments 
        ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';
        
        RAISE NOTICE 'Added payment_method column to installment_payments';
    ELSE
        RAISE NOTICE 'payment_method column already exists in installment_payments';
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
AND column_name = 'payment_method';

-- ============================================
-- VERIFICATION COMPLETE
-- ============================================

