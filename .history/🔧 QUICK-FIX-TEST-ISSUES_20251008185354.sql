-- 🔧 QUICK FIX FOR AUTOMATED TEST ISSUES
-- Run this to fix all database schema issues found during testing
-- Date: October 8, 2025

-- ==========================================
-- FIX 1: Add missing columns to devices table
-- ==========================================
DO $$ 
BEGIN
    -- Add expected_completion_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'expected_completion_date'
    ) THEN
        ALTER TABLE devices ADD COLUMN expected_completion_date TIMESTAMP;
        RAISE NOTICE '✅ Added expected_completion_date column to devices table';
    ELSE
        RAISE NOTICE 'ℹ️  expected_completion_date already exists in devices table';
    END IF;
END $$;

-- ==========================================
-- FIX 2: Add/fix appointment_time column
-- ==========================================
DO $$ 
BEGIN
    -- Check if appointments table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        -- Add appointment_time if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'appointment_time'
        ) THEN
            -- Check if there's a similar column we should rename
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'appointments' AND column_name IN ('appointment_date', 'scheduled_time', 'date')
            ) THEN
                -- Rename existing date/time column
                ALTER TABLE appointments RENAME COLUMN appointment_date TO appointment_time;
                RAISE NOTICE '✅ Renamed appointment_date to appointment_time';
            ELSE
                -- Add new column
                ALTER TABLE appointments ADD COLUMN appointment_time TIMESTAMP DEFAULT NOW();
                RAISE NOTICE '✅ Added appointment_time column to appointments table';
            END IF;
        ELSE
            RAISE NOTICE 'ℹ️  appointment_time already exists in appointments table';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  appointments table does not exist - skipping';
    END IF;
END $$;

-- ==========================================
-- FIX 3: Create daily_sales_closures table
-- ==========================================
-- This table is required for POS day-end operations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_sales_closures') THEN
        CREATE TABLE daily_sales_closures (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            date DATE NOT NULL UNIQUE,
            closed_at TIMESTAMP NOT NULL DEFAULT NOW(),
            closed_by UUID REFERENCES auth_users(id),
            total_sales DECIMAL(10, 2) DEFAULT 0,
            total_cash DECIMAL(10, 2) DEFAULT 0,
            total_card DECIMAL(10, 2) DEFAULT 0,
            total_mobile DECIMAL(10, 2) DEFAULT 0,
            total_transactions INTEGER DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Add index for faster queries
        CREATE INDEX idx_daily_sales_closures_date ON daily_sales_closures(date DESC);
        CREATE INDEX idx_daily_sales_closures_closed_by ON daily_sales_closures(closed_by);

        -- Enable RLS
        ALTER TABLE daily_sales_closures ENABLE ROW LEVEL SECURITY;

        -- Create policy for all users to view their closures
        CREATE POLICY "Users can view daily closures"
            ON daily_sales_closures FOR SELECT
            USING (true);

        -- Create policy for managers/admins to create closures
        CREATE POLICY "Managers can create daily closures"
            ON daily_sales_closures FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM auth_users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'manager')
                )
            );

        RAISE NOTICE '✅ Created daily_sales_closures table with RLS policies';
    ELSE
        RAISE NOTICE 'ℹ️  daily_sales_closures table already exists';
    END IF;
END $$;

-- ==========================================
-- FIX 4: Update dashboard queries to use customer_payments
-- ==========================================
-- Note: This is informational - you need to update your frontend code
-- to use 'customer_payments' instead of 'payments' table

-- Verify customer_payments table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_payments') THEN
        RAISE NOTICE '✅ customer_payments table exists - use this instead of payments';
        RAISE NOTICE 'ℹ️  Update frontend queries from "payments" to "customer_payments"';
    ELSE
        RAISE NOTICE '⚠️  customer_payments table not found';
    END IF;
END $$;

-- ==========================================
-- FIX 5: Verify and report on other tables
-- ==========================================
DO $$ 
DECLARE
    product_count INTEGER;
    supplier_count INTEGER;
    category_count INTEGER;
BEGIN
    -- Check products
    SELECT COUNT(*) INTO product_count FROM lats_products;
    RAISE NOTICE '📊 Products in database: %', product_count;

    -- Check suppliers
    SELECT COUNT(*) INTO supplier_count FROM lats_suppliers;
    RAISE NOTICE '📊 Suppliers in database: %', supplier_count;

    -- Check categories
    SELECT COUNT(*) INTO category_count FROM lats_categories;
    RAISE NOTICE '📊 Categories in database: %', category_count;

    -- Recommend supplier assignment
    IF product_count > 0 AND supplier_count > 0 THEN
        RAISE NOTICE '💡 Recommendation: Assign suppliers to products for better tracking';
    END IF;
END $$;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify all fixes
SELECT 
    'Devices expected_completion_date' as fix_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'devices' AND column_name = 'expected_completion_date'
        ) THEN '✅ FIXED'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Appointments appointment_time' as fix_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'appointment_time'
        ) THEN '✅ FIXED'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'daily_sales_closures table' as fix_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'daily_sales_closures'
        ) THEN '✅ FIXED'
        ELSE '❌ MISSING'
    END as status;

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ AUTOMATED TEST FIXES APPLIED SUCCESSFULLY';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. ✅ Database schema issues fixed';
    RAISE NOTICE '2. 📝 Update frontend to use customer_payments instead of payments';
    RAISE NOTICE '3. 🔗 Assign suppliers to products (optional but recommended)';
    RAISE NOTICE '4. 🧪 Re-run automated tests to verify fixes';
    RAISE NOTICE '';
END $$;

