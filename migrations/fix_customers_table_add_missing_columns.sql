-- ================================================
-- FIX CUSTOMERS TABLE - ADD MISSING COLUMNS
-- ================================================
-- This migration adds all missing columns to the customers table
-- to match the complete schema definition
-- ================================================

-- Start transaction
BEGIN;

-- ================================================
-- ADD MISSING COLUMNS TO CUSTOMERS TABLE
-- ================================================

-- Profile and contact fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN DEFAULT false;

-- User tracking
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Purchase tracking
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0;

-- Birthday as date field (in addition to birth_month and birth_day)
ALTER TABLE customers 
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

-- Branch management fields (CRITICAL - These are causing the errors)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS branch_id UUID,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_branch_id UUID,
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[],
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated',
ADD COLUMN IF NOT EXISTS created_by_branch_id UUID,
ADD COLUMN IF NOT EXISTS created_by_branch_name TEXT;

-- Location field
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS country TEXT;

-- ================================================
-- ADD CONSTRAINTS
-- ================================================

-- Add sharing mode constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_sharing_mode_check'
    ) THEN
        ALTER TABLE customers 
        ADD CONSTRAINT customers_sharing_mode_check 
        CHECK (sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text]));
    END IF;
END $$;

-- Add foreign key for branch_id if lats_branches table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_branches') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'customers_branch_id_fkey'
        ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_branch_id_fkey 
            FOREIGN KEY (branch_id) REFERENCES lats_branches(id);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'customers_preferred_branch_id_fkey'
        ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_preferred_branch_id_fkey 
            FOREIGN KEY (preferred_branch_id) REFERENCES lats_branches(id);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'customers_created_by_branch_id_fkey'
        ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_created_by_branch_id_fkey 
            FOREIGN KEY (created_by_branch_id) REFERENCES lats_branches(id);
        END IF;
    END IF;
END $$;

-- Add foreign key for referred_by (self-referencing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_referred_by_fkey'
    ) THEN
        ALTER TABLE customers 
        ADD CONSTRAINT customers_referred_by_fkey 
        FOREIGN KEY (referred_by) REFERENCES customers(id);
    END IF;
END $$;

-- Add foreign key for created_by if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'customers_created_by_fkey'
        ) THEN
            ALTER TABLE customers 
            ADD CONSTRAINT customers_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- ================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================

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

-- ================================================
-- ADD COMMENTS
-- ================================================

COMMENT ON COLUMN customers.branch_id IS 'Primary branch where customer was registered';
COMMENT ON COLUMN customers.is_shared IS 'Whether customer is shared across all branches';
COMMENT ON COLUMN customers.preferred_branch_id IS 'Customer''s preferred branch for services';
COMMENT ON COLUMN customers.visible_to_branches IS 'Array of branch IDs that can see this customer';
COMMENT ON COLUMN customers.sharing_mode IS 'How customer is shared: isolated, shared, or custom';
COMMENT ON COLUMN customers.created_by_branch_id IS 'Branch that originally created this customer';
COMMENT ON COLUMN customers.created_by_branch_name IS 'Branch name for display purposes';

-- ================================================
-- SUMMARY
-- ================================================

DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'customers' AND table_schema = 'public';
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ CUSTOMERS TABLE MIGRATION COMPLETED';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total columns in customers table: %', column_count;
    RAISE NOTICE '✓ Branch management columns added';
    RAISE NOTICE '✓ Call analytics columns added';
    RAISE NOTICE '✓ Referral tracking columns added';
    RAISE NOTICE '✓ Profile and contact columns added';
    RAISE NOTICE '✓ Constraints added';
    RAISE NOTICE '✓ Indexes created for performance';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Your customers table is now up to date!';
    RAISE NOTICE '================================================';
END $$;

-- Commit transaction
COMMIT;

