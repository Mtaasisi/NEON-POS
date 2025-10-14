-- ============================================================================
-- 🔧 COMPLETE FIX: Add ALL Missing Customer Columns
-- ============================================================================
-- This script adds every column that CustomerDetailModal.tsx expects to display
-- Run this in your Neon database SQL editor
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '🚀 Starting complete customer table fix...';
    RAISE NOTICE '';
    
    -- ========================================================================
    -- 1. CONTACT & IDENTITY FIELDS
    -- ========================================================================
    
    -- Add whatsapp column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE customers ADD COLUMN whatsapp TEXT;
        RAISE NOTICE '✅ Added whatsapp column';
    ELSE
        RAISE NOTICE '✓  whatsapp column already exists';
    END IF;
    
    -- Add whatsapp_opt_out column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'whatsapp_opt_out'
    ) THEN
        ALTER TABLE customers ADD COLUMN whatsapp_opt_out BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added whatsapp_opt_out column';
    ELSE
        RAISE NOTICE '✓  whatsapp_opt_out column already exists';
    END IF;
    
    -- Add profile_image column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'profile_image'
    ) THEN
        ALTER TABLE customers ADD COLUMN profile_image TEXT;
        RAISE NOTICE '✅ Added profile_image column';
    ELSE
        RAISE NOTICE '✓  profile_image column already exists';
    END IF;
    
    -- Add country column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'country'
    ) THEN
        ALTER TABLE customers ADD COLUMN country TEXT;
        RAISE NOTICE '✅ Added country column';
    ELSE
        RAISE NOTICE '✓  country column already exists';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================================================
    -- 2. PURCHASE HISTORY FIELDS
    -- ========================================================================
    
    -- Add last_purchase_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'last_purchase_date'
    ) THEN
        ALTER TABLE customers ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added last_purchase_date column';
    ELSE
        RAISE NOTICE '✓  last_purchase_date column already exists';
    END IF;
    
    -- Add total_purchases column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'total_purchases'
    ) THEN
        ALTER TABLE customers ADD COLUMN total_purchases INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added total_purchases column';
    ELSE
        RAISE NOTICE '✓  total_purchases column already exists';
    END IF;
    
    -- Add birthday column (full date, separate from birth_month/birth_day)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'birthday'
    ) THEN
        ALTER TABLE customers ADD COLUMN birthday DATE;
        RAISE NOTICE '✅ Added birthday column';
    ELSE
        RAISE NOTICE '✓  birthday column already exists';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================================================
    -- 3. REFERRAL SYSTEM FIELDS
    -- ========================================================================
    
    -- Add referred_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'referred_by'
    ) THEN
        ALTER TABLE customers ADD COLUMN referred_by UUID;
        RAISE NOTICE '✅ Added referred_by column';
    ELSE
        RAISE NOTICE '✓  referred_by column already exists';
    END IF;
    
    -- Add referrals column (as JSONB array)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'referrals'
    ) THEN
        ALTER TABLE customers ADD COLUMN referrals JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ Added referrals column (JSONB array)';
    ELSE
        RAISE NOTICE '✓  referrals column already exists';
    END IF;
    
    -- Add created_by column (staff who registered the customer)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE customers ADD COLUMN created_by UUID;
        RAISE NOTICE '✅ Added created_by column';
    ELSE
        RAISE NOTICE '✓  created_by column already exists';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================================================
    -- 4. CALL ANALYTICS FIELDS (for CallAnalyticsCard component)
    -- ========================================================================
    
    -- Total calls
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'total_calls'
    ) THEN
        ALTER TABLE customers ADD COLUMN total_calls INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added total_calls column';
    ELSE
        RAISE NOTICE '✓  total_calls column already exists';
    END IF;
    
    -- Total call duration
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'total_call_duration_minutes'
    ) THEN
        ALTER TABLE customers ADD COLUMN total_call_duration_minutes NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added total_call_duration_minutes column';
    ELSE
        RAISE NOTICE '✓  total_call_duration_minutes column already exists';
    END IF;
    
    -- Incoming calls
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'incoming_calls'
    ) THEN
        ALTER TABLE customers ADD COLUMN incoming_calls INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added incoming_calls column';
    ELSE
        RAISE NOTICE '✓  incoming_calls column already exists';
    END IF;
    
    -- Outgoing calls
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'outgoing_calls'
    ) THEN
        ALTER TABLE customers ADD COLUMN outgoing_calls INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added outgoing_calls column';
    ELSE
        RAISE NOTICE '✓  outgoing_calls column already exists';
    END IF;
    
    -- Missed calls
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'missed_calls'
    ) THEN
        ALTER TABLE customers ADD COLUMN missed_calls INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added missed_calls column';
    ELSE
        RAISE NOTICE '✓  missed_calls column already exists';
    END IF;
    
    -- Average call duration
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'avg_call_duration_minutes'
    ) THEN
        ALTER TABLE customers ADD COLUMN avg_call_duration_minutes NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added avg_call_duration_minutes column';
    ELSE
        RAISE NOTICE '✓  avg_call_duration_minutes column already exists';
    END IF;
    
    -- First call date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'first_call_date'
    ) THEN
        ALTER TABLE customers ADD COLUMN first_call_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added first_call_date column';
    ELSE
        RAISE NOTICE '✓  first_call_date column already exists';
    END IF;
    
    -- Last call date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'last_call_date'
    ) THEN
        ALTER TABLE customers ADD COLUMN last_call_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added last_call_date column';
    ELSE
        RAISE NOTICE '✓  last_call_date column already exists';
    END IF;
    
    -- Call loyalty level
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'call_loyalty_level'
    ) THEN
        ALTER TABLE customers ADD COLUMN call_loyalty_level TEXT DEFAULT 'Basic';
        RAISE NOTICE '✅ Added call_loyalty_level column';
    ELSE
        RAISE NOTICE '✓  call_loyalty_level column already exists';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================================================
    -- 5. BRANCH TRACKING FIELDS (for multi-branch support)
    -- ========================================================================
    
    -- Current branch assignment
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN branch_id UUID;
        RAISE NOTICE '✅ Added branch_id column';
    ELSE
        RAISE NOTICE '✓  branch_id column already exists';
    END IF;
    
    -- Is customer shared across branches
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'is_shared'
    ) THEN
        ALTER TABLE customers ADD COLUMN is_shared BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_shared column';
    ELSE
        RAISE NOTICE '✓  is_shared column already exists';
    END IF;
    
    -- Branch that originally created the customer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'created_by_branch_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN created_by_branch_id UUID;
        RAISE NOTICE '✅ Added created_by_branch_id column';
    ELSE
        RAISE NOTICE '✓  created_by_branch_id column already exists';
    END IF;
    
    -- Branch name for display
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'created_by_branch_name'
    ) THEN
        ALTER TABLE customers ADD COLUMN created_by_branch_name TEXT;
        RAISE NOTICE '✅ Added created_by_branch_name column';
    ELSE
        RAISE NOTICE '✓  created_by_branch_name column already exists';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Customer table fix completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Summary of Added Columns:';
    RAISE NOTICE '   - Contact: whatsapp, whatsapp_opt_out, profile_image, country';
    RAISE NOTICE '   - Purchase: last_purchase_date, total_purchases, birthday';
    RAISE NOTICE '   - Referral: referred_by, referrals, created_by';
    RAISE NOTICE '   - Call Analytics: 9 call tracking columns';
    RAISE NOTICE '   - Branch: branch_id, is_shared, created_by_branch_id, created_by_branch_name';
    RAISE NOTICE '';
    RAISE NOTICE '✨ Next Steps:';
    RAISE NOTICE '   1. Update your customer fetch queries to include these new columns';
    RAISE NOTICE '   2. Test the CustomerDetailModal to verify all fields display';
    RAISE NOTICE '   3. Populate existing customers with default values if needed';
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on whatsapp for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);

-- Index on referred_by for referral queries
CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON customers(referred_by);

-- Index on branch_id for multi-branch filtering
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);

-- Index on last_purchase_date for activity tracking
CREATE INDEX IF NOT EXISTS idx_customers_last_purchase_date ON customers(last_purchase_date DESC);

-- Index on created_by for staff tracking
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

-- ============================================================================
-- 7. VERIFY THE FIX
-- ============================================================================

DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'customers';
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Verification:';
    RAISE NOTICE '   Total columns in customers table: %', column_count;
    RAISE NOTICE '';
    
    IF column_count >= 45 THEN
        RAISE NOTICE '✅ SUCCESS! Customer table has all expected columns';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Customer table may be missing some columns (expected ~45+)';
    END IF;
END $$;

