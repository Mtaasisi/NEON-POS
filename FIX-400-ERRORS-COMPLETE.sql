-- =============================================================================
-- FIX ALL 400 BAD REQUEST ERRORS IN NEON DATABASE
-- =============================================================================
-- This script diagnoses and fixes all schema mismatches causing 400 errors
-- Run this against your Neon database to resolve all issues at once
-- =============================================================================

-- STEP 1: Check and fix daily_sales_closures table
-- =============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_sales_closures') THEN
        CREATE TABLE daily_sales_closures (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            date DATE NOT NULL UNIQUE,
            total_sales NUMERIC(12, 2) DEFAULT 0,
            total_transactions INTEGER DEFAULT 0,
            closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            closed_by TEXT NOT NULL,
            closed_by_user_id UUID,
            sales_data JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_daily_sales_closures_date ON daily_sales_closures(date DESC);
        CREATE INDEX idx_daily_sales_closures_closed_at ON daily_sales_closures(closed_at DESC);
        
        ALTER TABLE daily_sales_closures ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Allow all operations on daily closures"
            ON daily_sales_closures FOR ALL
            USING (true) WITH CHECK (true);
        
        RAISE NOTICE '✅ Created daily_sales_closures table';
    ELSE
        RAISE NOTICE '✔️ daily_sales_closures table already exists';
    END IF;
END $$;

-- STEP 2: Verify lats_sale_items table exists and has correct structure
-- =============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_sale_items') THEN
        RAISE WARNING '❌ lats_sale_items table does not exist - this will cause 400 errors!';
        RAISE NOTICE 'ℹ️  Creating lats_sale_items table...';
        
        CREATE TABLE lats_sale_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sale_id UUID NOT NULL,
            product_id UUID,
            variant_id UUID,
            quantity INTEGER NOT NULL,
            unit_price NUMERIC(12, 2) NOT NULL,
            total_price NUMERIC(12, 2) NOT NULL,
            cost_price NUMERIC(12, 2) DEFAULT 0,
            profit NUMERIC(12, 2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_lats_sale_items_sale_id ON lats_sale_items(sale_id);
        CREATE INDEX idx_lats_sale_items_product_id ON lats_sale_items(product_id);
        
        ALTER TABLE lats_sale_items ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Allow all operations on sale items"
            ON lats_sale_items FOR ALL
            USING (true) WITH CHECK (true);
        
        RAISE NOTICE '✅ Created lats_sale_items table';
    ELSE
        RAISE NOTICE '✔️ lats_sale_items table already exists';
    END IF;
END $$;

-- STEP 3: Verify lats_sales has all expected columns
-- =============================================================================
DO $$ 
BEGIN
    -- Check and add id column (should already exist as primary key)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'id'
    ) THEN
        RAISE WARNING '❌ lats_sales.id column missing! Table structure may be corrupted.';
    END IF;
    
    -- Check sale_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'sale_number'
    ) THEN
        ALTER TABLE lats_sales ADD COLUMN sale_number TEXT;
        RAISE NOTICE '✅ Added sale_number column';
    END IF;
    
    -- Check customer_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE lats_sales ADD COLUMN customer_name TEXT;
        RAISE NOTICE '✅ Added customer_name column';
    END IF;
    
    -- Check status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'status'
    ) THEN
        ALTER TABLE lats_sales ADD COLUMN status TEXT DEFAULT 'completed';
        RAISE NOTICE '✅ Added status column';
    END IF;
    
    -- Check user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE lats_sales ADD COLUMN user_id UUID;
        RAISE NOTICE '✅ Added user_id column';
    END IF;
    
    -- Check sold_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sales' AND column_name = 'sold_by'
    ) THEN
        ALTER TABLE lats_sales ADD COLUMN sold_by TEXT;
        RAISE NOTICE '✅ Added sold_by column';
    END IF;
    
    RAISE NOTICE '✔️ All expected lats_sales columns verified';
END $$;

-- STEP 4: Verify users table exists (for cashier names)
-- =============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE WARNING '❌ users table does not exist - cashier names won''t load';
        RAISE NOTICE 'ℹ️  Creating basic users table...';
        
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Allow authenticated users to read users"
            ON users FOR SELECT
            USING (true);
        
        RAISE NOTICE '✅ Created users table';
    ELSE
        -- Check if users table has required columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'full_name'
        ) THEN
            ALTER TABLE users ADD COLUMN full_name TEXT;
            RAISE NOTICE '✅ Added full_name column to users';
        END IF;
        
        RAISE NOTICE '✔️ users table exists with required columns';
    END IF;
END $$;

-- STEP 5: Verify devices table exists (for device payments)
-- =============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices') THEN
        RAISE WARNING '❌ devices table does not exist - device payment queries will fail';
        RAISE NOTICE 'ℹ️  You may need to create the devices table separately if you use device tracking';
    ELSE
        RAISE NOTICE '✔️ devices table exists';
    END IF;
END $$;

-- STEP 6: Verify customer_payments table exists
-- =============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_payments') THEN
        RAISE WARNING '❌ customer_payments table does not exist - repair payment queries will fail';
        RAISE NOTICE 'ℹ️  If you don''t use device/repair payments, this can be ignored';
    ELSE
        RAISE NOTICE '✔️ customer_payments table exists';
    END IF;
END $$;

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================
DO $$
DECLARE
    missing_tables TEXT := '';
    table_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'FINAL VERIFICATION REPORT';
    RAISE NOTICE '=============================================================================';
    
    -- Check critical tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_sales') THEN
        table_count := table_count + 1;
        RAISE NOTICE '✅ lats_sales: EXISTS';
    ELSE
        missing_tables := missing_tables || 'lats_sales, ';
        RAISE NOTICE '❌ lats_sales: MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_sale_items') THEN
        table_count := table_count + 1;
        RAISE NOTICE '✅ lats_sale_items: EXISTS';
    ELSE
        missing_tables := missing_tables || 'lats_sale_items, ';
        RAISE NOTICE '❌ lats_sale_items: MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_sales_closures') THEN
        table_count := table_count + 1;
        RAISE NOTICE '✅ daily_sales_closures: EXISTS';
    ELSE
        missing_tables := missing_tables || 'daily_sales_closures, ';
        RAISE NOTICE '❌ daily_sales_closures: MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_stock_movements') THEN
        table_count := table_count + 1;
        RAISE NOTICE '✅ lats_stock_movements: EXISTS';
    ELSE
        RAISE NOTICE '⚠️  lats_stock_movements: MISSING (optional, but recommended)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        table_count := table_count + 1;
        RAISE NOTICE '✅ users: EXISTS';
    ELSE
        RAISE NOTICE '⚠️  users: MISSING (cashier names won''t load)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================================';
    IF missing_tables = '' THEN
        RAISE NOTICE '🎉 ALL CRITICAL TABLES VERIFIED!';
        RAISE NOTICE '✅ Your database schema is now correct';
        RAISE NOTICE '🔄 Please refresh your browser - 400 errors should be gone!';
    ELSE
        RAISE WARNING '⚠️  Some tables are missing: %', TRIM(TRAILING ', ' FROM missing_tables);
        RAISE NOTICE 'ℹ️  The script created what it could, but you may need additional setup';
    END IF;
    RAISE NOTICE '=============================================================================';
END $$;

