-- ================================================
-- QUICK FIX: Add Missing Columns to Customers Table
-- ================================================
-- Run this in your Neon SQL Editor to fix all
-- "column does not exist" errors
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Add all missing columns
-- ================================================

DO $$ 
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '🔧 Adding missing columns to customers table...';
    RAISE NOTICE '================================================';
END $$;

-- Core identity column (if table doesn't have it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'id'
    ) THEN
        ALTER TABLE customers ADD COLUMN id UUID DEFAULT gen_random_uuid();
        ALTER TABLE customers ADD PRIMARY KEY (id);
        RAISE NOTICE '✅ Added id column';
    ELSE
        RAISE NOTICE '✓ id column already exists';
    END IF;
END $$;

-- Critical columns that are causing errors
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS branch_id UUID,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS joined_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS loyalty_level TEXT DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS color_tag TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_visit TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS birth_month TEXT,
ADD COLUMN IF NOT EXISTS birth_day TEXT,
ADD COLUMN IF NOT EXISTS customer_tag TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS total_returns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_notes TEXT,
ADD COLUMN IF NOT EXISTS location_description TEXT,
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Profile and contact fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Purchase tracking
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Referral tracking
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS referred_by UUID,
ADD COLUMN IF NOT EXISTS referrals JSONB DEFAULT '[]'::jsonb;

-- Call analytics fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_call_duration_minutes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS incoming_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS outgoing_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS missed_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_call_duration_minutes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_loyalty_level TEXT DEFAULT 'Basic',
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ DEFAULT now();

-- Branch management fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS preferred_branch_id UUID,
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[],
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated',
ADD COLUMN IF NOT EXISTS created_by_branch_id UUID,
ADD COLUMN IF NOT EXISTS created_by_branch_name TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- ================================================
-- STEP 2: Add constraints
-- ================================================

DO $$
BEGIN
    -- Add sharing mode constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_sharing_mode_check'
    ) THEN
        ALTER TABLE customers 
        ADD CONSTRAINT customers_sharing_mode_check 
        CHECK (sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text]));
        RAISE NOTICE '✅ Added sharing_mode constraint';
    ELSE
        RAISE NOTICE '✓ sharing_mode constraint already exists';
    END IF;
END $$;

-- Add foreign keys if tables exist
DO $$
BEGIN
    -- Branch foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_branches') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'customers_branch_id_fkey'
        ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_branch_id_fkey 
            FOREIGN KEY (branch_id) REFERENCES lats_branches(id);
            RAISE NOTICE '✅ Added branch_id foreign key';
        ELSE
            RAISE NOTICE '✓ branch_id foreign key already exists';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'customers_preferred_branch_id_fkey'
        ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_preferred_branch_id_fkey 
            FOREIGN KEY (preferred_branch_id) REFERENCES lats_branches(id);
            RAISE NOTICE '✅ Added preferred_branch_id foreign key';
        ELSE
            RAISE NOTICE '✓ preferred_branch_id foreign key already exists';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'customers_created_by_branch_id_fkey'
        ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_created_by_branch_id_fkey 
            FOREIGN KEY (created_by_branch_id) REFERENCES lats_branches(id);
            RAISE NOTICE '✅ Added created_by_branch_id foreign key';
        ELSE
            RAISE NOTICE '✓ created_by_branch_id foreign key already exists';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ lats_branches table not found - skipping branch foreign keys';
    END IF;
    
    -- Self-referencing foreign key for referrals
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_referred_by_fkey'
    ) THEN
        ALTER TABLE customers 
        ADD CONSTRAINT customers_referred_by_fkey 
        FOREIGN KEY (referred_by) REFERENCES customers(id);
        RAISE NOTICE '✅ Added referred_by foreign key';
    ELSE
        RAISE NOTICE '✓ referred_by foreign key already exists';
    END IF;
    
    -- User foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'customers_created_by_fkey'
        ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id);
            RAISE NOTICE '✅ Added created_by foreign key';
        ELSE
            RAISE NOTICE '✓ created_by foreign key already exists';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ users table not found - skipping created_by foreign key';
    END IF;
END $$;

-- ================================================
-- STEP 3: Create indexes for performance
-- ================================================

DO $$ 
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '🚀 Creating indexes for performance...';
    RAISE NOTICE '================================================';
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_id ON customers(id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_level ON customers(loyalty_level);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit);
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers(birthday);
CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON customers(referred_by);
CREATE INDEX IF NOT EXISTS idx_customers_is_shared ON customers(is_shared);
CREATE INDEX IF NOT EXISTS idx_customers_sharing_mode ON customers(sharing_mode);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- ================================================
-- STEP 4: Add helpful comments
-- ================================================

COMMENT ON COLUMN customers.id IS 'Unique customer identifier';
COMMENT ON COLUMN customers.branch_id IS 'Primary branch where customer was registered';
COMMENT ON COLUMN customers.is_active IS 'Whether customer account is active';
COMMENT ON COLUMN customers.total_spent IS 'Total amount customer has spent';
COMMENT ON COLUMN customers.is_shared IS 'Whether customer is shared across all branches';
COMMENT ON COLUMN customers.preferred_branch_id IS 'Customer''s preferred branch for services';
COMMENT ON COLUMN customers.visible_to_branches IS 'Array of branch IDs that can see this customer';
COMMENT ON COLUMN customers.sharing_mode IS 'How customer is shared: isolated, shared, or custom';
COMMENT ON COLUMN customers.created_by_branch_id IS 'Branch that originally created this customer';
COMMENT ON COLUMN customers.created_by_branch_name IS 'Branch name for display purposes';

-- ================================================
-- STEP 5: Summary
-- ================================================

DO $$
DECLARE
    column_count INTEGER;
    index_count INTEGER;
    constraint_count INTEGER;
BEGIN
    -- Count columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'customers' AND table_schema = 'public';
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'customers' AND schemaname = 'public';
    
    -- Count constraints
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conrelid = 'customers'::regclass;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ CUSTOMERS TABLE MIGRATION COMPLETED!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Table: customers';
    RAISE NOTICE '  ├─ Columns: %', column_count;
    RAISE NOTICE '  ├─ Indexes: %', index_count;
    RAISE NOTICE '  └─ Constraints: %', constraint_count;
    RAISE NOTICE '';
    RAISE NOTICE '✓ All required columns added';
    RAISE NOTICE '✓ Foreign keys configured';
    RAISE NOTICE '✓ Indexes created for performance';
    RAISE NOTICE '✓ Comments added for documentation';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Your customers table is ready to use!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Refresh your application';
    RAISE NOTICE '  2. Clear browser cache if needed';
    RAISE NOTICE '  3. Test customer operations';
    RAISE NOTICE '================================================';
END $$;

COMMIT;

-- ================================================
-- VERIFICATION QUERY
-- ================================================
-- Run this to verify all columns were added:

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customers'
  AND table_schema = 'public'
  AND column_name IN (
    'id', 'branch_id', 'is_active', 'total_spent', 'is_shared',
    'name', 'email', 'phone', 'whatsapp', 'total_purchases'
  )
ORDER BY column_name;

