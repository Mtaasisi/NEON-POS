-- ============================================================================
-- FIX CUSTOMER STATUS FUNCTIONS AND MISSING TABLES
-- ============================================================================
-- This script creates all missing customer-related functions and tables
-- Run this on your Neon Database to fix customer status errors

DO $$ 
BEGIN
    RAISE NOTICE '🚀 Starting customer status system fix...';
END $$;

-- ============================================================================
-- 1. CREATE MISSING TABLES
-- ============================================================================

-- Create customer_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    preferred_contact_method VARCHAR(50), -- 'phone', 'email', 'whatsapp', 'sms'
    communication_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'never'
    marketing_opt_in BOOLEAN DEFAULT true,
    sms_opt_in BOOLEAN DEFAULT true,
    email_opt_in BOOLEAN DEFAULT true,
    whatsapp_opt_in BOOLEAN DEFAULT true,
    preferred_language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    preferred_branch VARCHAR(255),
    preferred_payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Create returns table if it doesn't exist
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID,
    manual_device_brand VARCHAR(255),
    manual_device_model VARCHAR(255),
    manual_device_serial VARCHAR(255),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    intake_checklist JSONB,
    status VARCHAR(50) DEFAULT 'under-return-review',
    attachments JSONB,
    resolution TEXT,
    staff_signature TEXT,
    customer_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    purchase_date DATE,
    return_type VARCHAR(50), -- 'refund', 'exchange', 'store-credit'
    branch VARCHAR(255),
    staff_name VARCHAR(255),
    contact_confirmed BOOLEAN DEFAULT false,
    accessories JSONB,
    condition_description TEXT,
    customer_reported_issue TEXT,
    staff_observed_issue TEXT,
    customer_satisfaction INTEGER,
    preferred_contact VARCHAR(50),
    return_auth_number VARCHAR(100),
    return_method VARCHAR(50),
    return_shipping_fee NUMERIC(10, 2),
    expected_pickup_date DATE,
    geo_location JSONB,
    policy_acknowledged BOOLEAN DEFAULT false,
    device_locked VARCHAR(50),
    privacy_wiped BOOLEAN DEFAULT false,
    internal_notes TEXT,
    escalation_required BOOLEAN DEFAULT false,
    additional_docs JSONB,
    refund_amount NUMERIC(10, 2),
    exchange_device_id UUID,
    restocking_fee NUMERIC(10, 2),
    refund_method VARCHAR(50), -- 'cash', 'card', 'transfer', 'store-credit'
    user_ip VARCHAR(50),
    user_location VARCHAR(255)
);

-- Update customer_checkins table (it already exists, just add missing columns)
DO $$ 
BEGIN
    -- Add staff_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_checkins' AND column_name = 'staff_id'
    ) THEN
        ALTER TABLE customer_checkins ADD COLUMN staff_id UUID;
        RAISE NOTICE '✅ Added staff_id column to customer_checkins';
    END IF;
    
    -- Note: customer_checkins already has checkin_date, created_at, notes columns
    RAISE NOTICE 'ℹ️  customer_checkins table already exists with proper structure';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_preferences_customer_id ON customer_preferences(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_checkins_customer_id ON customer_checkins(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_checkins_checkin_date ON customer_checkins(checkin_date DESC);

-- Add foreign key constraints if the referenced tables exist
DO $$ 
BEGIN
    -- Add foreign key for returns.device_id if devices table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_returns_device_id'
        ) THEN
            ALTER TABLE returns ADD CONSTRAINT fk_returns_device_id 
            FOREIGN KEY (device_id) REFERENCES devices(id);
            RAISE NOTICE '✅ Added foreign key for returns.device_id';
        END IF;
    END IF;
    
    -- Add foreign key for customer_checkins.staff_id if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_customer_checkins_staff_id'
        ) THEN
            ALTER TABLE customer_checkins ADD CONSTRAINT fk_customer_checkins_staff_id 
            FOREIGN KEY (staff_id) REFERENCES users(id);
            RAISE NOTICE '✅ Added foreign key for customer_checkins.staff_id';
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    RAISE NOTICE '✅ Missing tables created successfully';
END $$;

-- ============================================================================
-- 2. ENSURE REQUIRED COLUMNS EXIST IN CUSTOMERS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add is_active column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added is_active column to customers';
    END IF;
    
    -- Add last_activity_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'last_activity_date'
    ) THEN
        ALTER TABLE customers ADD COLUMN last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added last_activity_date column to customers';
    END IF;
    
    -- Add last_visit column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'last_visit'
    ) THEN
        ALTER TABLE customers ADD COLUMN last_visit TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added last_visit column to customers';
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE CUSTOMER STATUS FUNCTIONS
-- ============================================================================

-- Drop existing functions to allow changing return types
DROP FUNCTION IF EXISTS get_customer_status(UUID);
DROP FUNCTION IF EXISTS get_inactive_customers();

-- Function: get_customer_status
-- Returns comprehensive status information for a customer
CREATE OR REPLACE FUNCTION get_customer_status(customer_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    is_active BOOLEAN,
    member_since TIMESTAMP WITH TIME ZONE,
    last_visit TIMESTAMP WITH TIME ZONE,
    days_since_activity INTEGER,
    status_reason TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        COALESCE(c.is_active, true) as is_active,
        c.created_at as member_since,
        c.last_visit,
        CASE 
            WHEN c.last_activity_date IS NOT NULL THEN 
                EXTRACT(DAY FROM (NOW() - c.last_activity_date))::INTEGER
            ELSE 
                EXTRACT(DAY FROM (NOW() - c.created_at))::INTEGER
        END as days_since_activity,
        CASE 
            WHEN c.is_active = false THEN 'Customer marked as inactive'
            WHEN c.last_activity_date IS NULL THEN 'No activity recorded'
            WHEN EXTRACT(DAY FROM (NOW() - c.last_activity_date)) > 60 THEN 'Inactive for 60+ days'
            WHEN EXTRACT(DAY FROM (NOW() - c.last_activity_date)) > 30 THEN 'Low activity (30+ days)'
            ELSE 'Active customer'
        END as status_reason
    FROM customers c
    WHERE c.id = customer_id;
END;
$$;

-- Function: track_customer_activity
-- Tracks customer activity and updates timestamps
CREATE OR REPLACE FUNCTION track_customer_activity(
    customer_id UUID,
    activity_type VARCHAR DEFAULT 'general'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE customers
    SET 
        last_activity_date = NOW(),
        last_visit = CASE 
            WHEN activity_type IN ('visit', 'checkin', 'purchase') THEN NOW()
            ELSE last_visit
        END,
        is_active = true,
        updated_at = NOW()
    WHERE id = customer_id;
    
    -- If customer doesn't exist, raise notice but don't error
    IF NOT FOUND THEN
        RAISE NOTICE 'Customer % not found for activity tracking', customer_id;
    END IF;
END;
$$;

-- Function: update_customer_activity
-- Updates customer activity and reactivates if needed
CREATE OR REPLACE FUNCTION update_customer_activity(customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE customers
    SET 
        last_activity_date = NOW(),
        last_visit = NOW(),
        is_active = true,
        updated_at = NOW()
    WHERE id = customer_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Customer % not found for activity update', customer_id;
    END IF;
END;
$$;

-- Function: deactivate_inactive_customers
-- Automatically deactivates customers with no activity for 60+ days
CREATE OR REPLACE FUNCTION deactivate_inactive_customers()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    WITH deactivated AS (
        UPDATE customers
        SET 
            is_active = false,
            updated_at = NOW()
        WHERE 
            is_active = true
            AND (
                last_activity_date IS NULL 
                OR last_activity_date < NOW() - INTERVAL '60 days'
            )
        RETURNING id
    )
    SELECT COUNT(*) INTO affected_count FROM deactivated;
    
    RETURN affected_count;
END;
$$;

-- Function: get_inactive_customers
-- Returns list of inactive customers with details
CREATE OR REPLACE FUNCTION get_inactive_customers()
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    last_activity_date TIMESTAMP WITH TIME ZONE,
    days_inactive INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.phone,
        c.last_activity_date,
        CASE 
            WHEN c.last_activity_date IS NOT NULL THEN 
                EXTRACT(DAY FROM (NOW() - c.last_activity_date))::INTEGER
            ELSE 
                EXTRACT(DAY FROM (NOW() - c.created_at))::INTEGER
        END as days_inactive,
        c.created_at
    FROM customers c
    WHERE 
        c.is_active = false
        OR c.last_activity_date < NOW() - INTERVAL '60 days'
        OR c.last_activity_date IS NULL
    ORDER BY c.last_activity_date ASC NULLS FIRST;
END;
$$;

-- ============================================================================
-- 4. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update customer_preferences updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_preferences_updated_at ON customer_preferences;
CREATE TRIGGER trigger_update_customer_preferences_updated_at
    BEFORE UPDATE ON customer_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_preferences_updated_at();

-- Trigger to update returns updated_at timestamp
CREATE OR REPLACE FUNCTION update_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_returns_updated_at ON returns;
CREATE TRIGGER trigger_update_returns_updated_at
    BEFORE UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION update_returns_updated_at();

-- ============================================================================
-- 5. INITIALIZE DATA FOR EXISTING CUSTOMERS
-- ============================================================================

-- Update last_activity_date for customers who don't have it set
UPDATE customers
SET last_activity_date = COALESCE(last_visit, last_purchase_date, created_at)
WHERE last_activity_date IS NULL;

-- Ensure all customers have is_active set (default to true)
UPDATE customers
SET is_active = COALESCE(is_active, true)
WHERE is_active IS NULL;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions (adjust roles as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_checkins TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_customer_activity(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_inactive_customers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_inactive_customers() TO authenticated;

-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================

DO $$ 
DECLARE
    func_count INTEGER;
    table_count INTEGER;
BEGIN
    -- Check functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'get_customer_status',
        'track_customer_activity',
        'update_customer_activity',
        'deactivate_inactive_customers',
        'get_inactive_customers'
    );
    
    -- Check tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('customer_preferences', 'returns', 'customer_checkins');
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ CUSTOMER STATUS SYSTEM FIX COMPLETE!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 Functions created: % / 5', func_count;
    RAISE NOTICE '📋 Tables created: % / 3', table_count;
    RAISE NOTICE '';
    RAISE NOTICE '✨ Your customer status system should now work correctly!';
    RAISE NOTICE '🔄 Refresh your application to see the changes.';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

