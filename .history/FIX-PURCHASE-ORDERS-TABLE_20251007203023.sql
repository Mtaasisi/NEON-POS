-- ============================================================
-- FIX PURCHASE ORDERS TABLE - Add missing columns
-- Run this in your Neon SQL Editor (OPTIONAL)
-- ============================================================

-- Add missing columns to lats_purchase_orders table
DO $$ 
BEGIN
    -- Add tax_amount column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'tax_amount'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN tax_amount NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added tax_amount column';
    ELSE
        RAISE NOTICE 'ℹ️  tax_amount column already exists';
    END IF;

    -- Add shipping_cost column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'shipping_cost'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN shipping_cost NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added shipping_cost column';
    ELSE
        RAISE NOTICE 'ℹ️  shipping_cost column already exists';
    END IF;

    -- Add discount_amount column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN discount_amount NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added discount_amount column';
    ELSE
        RAISE NOTICE 'ℹ️  discount_amount column already exists';
    END IF;

    -- Add final_amount column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'final_amount'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN final_amount NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added final_amount column';
    ELSE
        RAISE NOTICE 'ℹ️  final_amount column already exists';
    END IF;

    -- Add received_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'received_date'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN received_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added received_date column';
    ELSE
        RAISE NOTICE 'ℹ️  received_date column already exists';
    END IF;

    -- Add approved_by column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN approved_by UUID;
        RAISE NOTICE '✅ Added approved_by column';
    ELSE
        RAISE NOTICE 'ℹ️  approved_by column already exists';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Purchase orders table updated successfully!';
END $$;

-- Verify the table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'lats_purchase_orders'
ORDER BY ordinal_position;

