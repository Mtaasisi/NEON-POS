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

-- ===================
-- FIX PURCHASE ORDER ITEMS TABLE (Optional)
-- ===================
DO $$ 
BEGIN
    -- Add subtotal column to items table if missing (optional for calculations)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_order_items' 
        AND column_name = 'subtotal'
    ) THEN
        ALTER TABLE lats_purchase_order_items 
        ADD COLUMN subtotal NUMERIC GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED;
        RAISE NOTICE '✅ Added subtotal column (auto-calculated)';
    ELSE
        RAISE NOTICE 'ℹ️  subtotal column already exists';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Purchase order items table updated!';
END $$;

-- ===================
-- VERIFICATION
-- ===================
-- Verify lats_purchase_orders table structure
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 PURCHASE ORDERS TABLE:';
END $$;

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'lats_purchase_orders'
ORDER BY ordinal_position;

-- Verify lats_purchase_order_items table structure
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 PURCHASE ORDER ITEMS TABLE:';
END $$;

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'lats_purchase_order_items'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ All purchase order fixes applied successfully!';
    RAISE NOTICE 'ℹ️  Refresh your browser to test PO creation';
END $$;

