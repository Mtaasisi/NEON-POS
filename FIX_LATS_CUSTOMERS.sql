-- ================================================
-- FIX: Add Missing Columns to lats_customers Table
-- ================================================
-- This adds all the missing columns your POS app needs
-- ================================================

BEGIN;

-- Add all missing columns
ALTER TABLE lats_customers 
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS color_tag TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS loyalty_level TEXT DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_visit TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS birth_month TEXT,
ADD COLUMN IF NOT EXISTS birth_day TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS initial_notes TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS customer_tag TEXT,
ADD COLUMN IF NOT EXISTS location_description TEXT,
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS joined_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referred_by UUID,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_returns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_call_duration_minutes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS incoming_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS outgoing_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS missed_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_call_duration_minutes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_loyalty_level TEXT DEFAULT 'Basic',
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS referrals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_branch_id UUID,
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[],
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated',
ADD COLUMN IF NOT EXISTS created_by_branch_id UUID,
ADD COLUMN IF NOT EXISTS created_by_branch_name TEXT;

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'lats_customers_sharing_mode_check'
    ) THEN
        ALTER TABLE lats_customers 
        ADD CONSTRAINT lats_customers_sharing_mode_check 
        CHECK (sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text]));
    END IF;
END $$;

-- Add foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'lats_customers_referred_by_fkey'
    ) THEN
        ALTER TABLE lats_customers 
        ADD CONSTRAINT lats_customers_referred_by_fkey 
        FOREIGN KEY (referred_by) REFERENCES lats_customers(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'lats_customers_preferred_branch_id_fkey'
    ) THEN
        ALTER TABLE lats_customers 
        ADD CONSTRAINT lats_customers_preferred_branch_id_fkey 
        FOREIGN KEY (preferred_branch_id) REFERENCES lats_branches(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'lats_customers_created_by_branch_id_fkey'
    ) THEN
        ALTER TABLE lats_customers 
        ADD CONSTRAINT lats_customers_created_by_branch_id_fkey 
        FOREIGN KEY (created_by_branch_id) REFERENCES lats_branches(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'lats_customers_created_by_fkey'
        ) THEN
            ALTER TABLE lats_customers 
            ADD CONSTRAINT lats_customers_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_lats_customers_whatsapp ON lats_customers(whatsapp);
CREATE INDEX IF NOT EXISTS idx_lats_customers_is_active ON lats_customers(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_customers_loyalty_level ON lats_customers(loyalty_level);
CREATE INDEX IF NOT EXISTS idx_lats_customers_created_at ON lats_customers(created_at);
CREATE INDEX IF NOT EXISTS idx_lats_customers_last_visit ON lats_customers(last_visit);
CREATE INDEX IF NOT EXISTS idx_lats_customers_birthday ON lats_customers(birthday);
CREATE INDEX IF NOT EXISTS idx_lats_customers_referred_by ON lats_customers(referred_by);
CREATE INDEX IF NOT EXISTS idx_lats_customers_is_shared ON lats_customers(is_shared);
CREATE INDEX IF NOT EXISTS idx_lats_customers_sharing_mode ON lats_customers(sharing_mode);

-- Summary
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'lats_customers' AND table_schema = 'public';
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Table: lats_customers';
    RAISE NOTICE 'Total columns: %', column_count;
    RAISE NOTICE '✓ All POS customer columns added';
    RAISE NOTICE '✓ Constraints configured';
    RAISE NOTICE '✓ Indexes created';
    RAISE NOTICE '================================================';
END $$;

COMMIT;

