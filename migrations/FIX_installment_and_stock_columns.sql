-- ============================================
-- FIX MISSING COLUMNS
-- ============================================
-- This script fixes the missing columns identified during testing
-- ============================================

-- Fix 1: Ensure installment_plan_id column exists in installment_payments
-- (It should exist from create_special_orders_and_installments.sql, but this ensures it)
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'installment_payments' 
        AND column_name = 'installment_plan_id'
    ) THEN
        -- Add the column if missing
        ALTER TABLE installment_payments 
        ADD COLUMN installment_plan_id UUID REFERENCES customer_installment_plans(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added installment_plan_id column to installment_payments';
    ELSE
        RAISE NOTICE 'installment_plan_id column already exists in installment_payments';
    END IF;
END $$;

-- Fix 2: Ensure previous_quantity column exists in lats_stock_movements
-- This column is used to track the quantity before a stock movement
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_stock_movements' 
        AND column_name = 'previous_quantity'
    ) THEN
        -- Add the column if missing
        ALTER TABLE lats_stock_movements 
        ADD COLUMN previous_quantity NUMERIC DEFAULT 0;
        
        RAISE NOTICE 'Added previous_quantity column to lats_stock_movements';
    ELSE
        RAISE NOTICE 'previous_quantity column already exists in lats_stock_movements';
    END IF;
END $$;

-- Verify the fixes
SELECT 
    'installment_payments' as table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'installment_payments' 
AND column_name = 'installment_plan_id'
UNION ALL
SELECT 
    'lats_stock_movements', 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'lats_stock_movements' 
AND column_name = 'previous_quantity';

-- ============================================
-- VERIFICATION COMPLETE
-- ============================================

