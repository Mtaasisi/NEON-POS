-- ============================================================
-- FIX PURCHASE ORDER DASHBOARD 400 ERRORS
-- This fixes missing columns and table structure issues
-- Run this in your Neon SQL Editor
-- ============================================================

-- ============================================
-- 1. ADD MISSING COLUMNS TO lats_purchase_orders
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '🔧 Adding missing columns to lats_purchase_orders...';

    -- Add order_number as alias/alternative to po_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'order_number'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN order_number TEXT;
        RAISE NOTICE '✅ Added order_number column';
    END IF;

    -- Add currency column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN currency TEXT DEFAULT 'TZS';
        RAISE NOTICE '✅ Added currency column';
    END IF;

    -- Add total_paid column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'total_paid'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN total_paid NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added total_paid column';
    END IF;

    -- Add payment_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
        RAISE NOTICE '✅ Added payment_status column';
    END IF;

    -- Add expected_delivery as alias/alternative to expected_delivery_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_orders' 
        AND column_name = 'expected_delivery'
    ) THEN
        ALTER TABLE lats_purchase_orders 
        ADD COLUMN expected_delivery TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added expected_delivery column';
    END IF;
END $$;

-- ============================================
-- 2. SYNC DATA BETWEEN COLUMNS
-- ============================================

-- Copy po_number to order_number for existing records
UPDATE lats_purchase_orders 
SET order_number = po_number 
WHERE order_number IS NULL;

-- Copy expected_delivery_date to expected_delivery for existing records
UPDATE lats_purchase_orders 
SET expected_delivery = expected_delivery_date 
WHERE expected_delivery IS NULL AND expected_delivery_date IS NOT NULL;

-- Set default currency for existing records
UPDATE lats_purchase_orders 
SET currency = 'TZS' 
WHERE currency IS NULL;

-- ============================================
-- 3. CREATE/FIX purchase_order_payments TABLE
-- ============================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TZS',
  payment_method TEXT NOT NULL,
  payment_method_id UUID,
  payment_account_id UUID,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_po_payments_order ON purchase_order_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_date ON purchase_order_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_po_payments_status ON purchase_order_payments(status);

-- ============================================
-- 4. CREATE TRIGGER TO UPDATE total_paid
-- ============================================

-- Function to update total_paid and payment_status
CREATE OR REPLACE FUNCTION update_purchase_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_paid for the purchase order
    UPDATE lats_purchase_orders
    SET 
        total_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM purchase_order_payments
            WHERE purchase_order_id = NEW.purchase_order_id
            AND status = 'completed'
        ),
        payment_status = CASE
            WHEN (
                SELECT COALESCE(SUM(amount), 0)
                FROM purchase_order_payments
                WHERE purchase_order_id = NEW.purchase_order_id
                AND status = 'completed'
            ) = 0 THEN 'unpaid'
            WHEN (
                SELECT COALESCE(SUM(amount), 0)
                FROM purchase_order_payments
                WHERE purchase_order_id = NEW.purchase_order_id
                AND status = 'completed'
            ) >= total_amount THEN 'paid'
            ELSE 'partial'
        END,
        updated_at = NOW()
    WHERE id = NEW.purchase_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_po_payment_status ON purchase_order_payments;

-- Create trigger
CREATE TRIGGER trigger_update_po_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_payment_status();

-- ============================================
-- 5. ENABLE RLS AND CREATE POLICIES
-- ============================================

-- Enable RLS on lats_purchase_orders if not already enabled
ALTER TABLE lats_purchase_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read purchase orders" ON lats_purchase_orders;
DROP POLICY IF EXISTS "Allow authenticated users to insert purchase orders" ON lats_purchase_orders;
DROP POLICY IF EXISTS "Allow authenticated users to update purchase orders" ON lats_purchase_orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete purchase orders" ON lats_purchase_orders;

-- Create permissive policies for authenticated users
CREATE POLICY "Allow authenticated users to read purchase orders"
    ON lats_purchase_orders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert purchase orders"
    ON lats_purchase_orders FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update purchase orders"
    ON lats_purchase_orders FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete purchase orders"
    ON lats_purchase_orders FOR DELETE
    TO authenticated
    USING (true);

-- Enable RLS on purchase_order_payments
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Allow authenticated users to update payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Allow authenticated users to delete payments" ON purchase_order_payments;

-- Create permissive policies for authenticated users
CREATE POLICY "Allow authenticated users to read payments"
    ON purchase_order_payments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert payments"
    ON purchase_order_payments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payments"
    ON purchase_order_payments FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete payments"
    ON purchase_order_payments FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 6. VERIFY STRUCTURE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Verifying lats_purchase_orders columns:';
END $$;

SELECT 
    column_name, 
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lats_purchase_orders'
AND column_name IN ('id', 'order_number', 'po_number', 'currency', 'total_amount', 'total_paid', 'payment_status', 'expected_delivery', 'expected_delivery_date')
ORDER BY ordinal_position;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Verifying purchase_order_payments table:';
END $$;

SELECT 
    column_name, 
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns 
WHERE table_name = 'purchase_order_payments'
ORDER BY ordinal_position;

-- ============================================
-- 7. COUNT DATA
-- ============================================

DO $$
DECLARE
    po_count INTEGER;
    payment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO po_count FROM lats_purchase_orders;
    SELECT COUNT(*) INTO payment_count FROM purchase_order_payments;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 DATA SUMMARY:';
    RAISE NOTICE '   Purchase Orders: %', po_count;
    RAISE NOTICE '   Payments: %', payment_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database is ready! Refresh your app to test.';
END $$;

