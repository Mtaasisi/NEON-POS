-- ============================================================================
-- FIX REMAINING ERRORS (Points & Appointments)
-- ============================================================================
-- Run this in your Neon SQL Editor to fix the remaining issues

-- ============================================================================
-- FIX 1: Add priority column to appointments table
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '🔧 Fixing appointments table...';
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'priority'
    ) THEN
        ALTER TABLE appointments ADD COLUMN priority TEXT DEFAULT 'normal';
        RAISE NOTICE '✅ Added priority column to appointments table';
    ELSE
        RAISE NOTICE '✅ priority column already exists';
    END IF;
    
    -- Add other potentially missing columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'notes'
    ) THEN
        ALTER TABLE appointments ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes column to appointments table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE appointments ADD COLUMN created_by UUID;
        RAISE NOTICE '✅ Added created_by column to appointments table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to appointments table';
    END IF;
    
END $$;

-- ============================================================================
-- FIX 2: Create or fix customer_points_history table
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '🔧 Fixing customer points history...';
    
    -- Create customer_points_history table if it doesn't exist
    CREATE TABLE IF NOT EXISTS customer_points_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        points_change INTEGER NOT NULL,
        reason TEXT,
        transaction_type TEXT DEFAULT 'manual',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ customer_points_history table verified/created';
    
    -- Add index for faster queries
    CREATE INDEX IF NOT EXISTS idx_points_history_customer_id 
        ON customer_points_history(customer_id);
    
    RAISE NOTICE '✅ Added index on customer_id';
    
END $$;

-- ============================================================================
-- FIX 3: Test fixes
-- ============================================================================

DO $$ 
DECLARE
    test_customer_id UUID;
    test_appointment_id UUID;
    test_points_id UUID;
BEGIN
    RAISE NOTICE '🧪 Testing fixes...';
    
    -- Use existing customer for testing
    SELECT id INTO test_customer_id FROM customers LIMIT 1;
    
    IF test_customer_id IS NULL THEN
        RAISE NOTICE '⚠️  No customers found to test with';
        RETURN;
    END IF;
    
    -- Test appointment insert
    BEGIN
        test_appointment_id := gen_random_uuid();
        INSERT INTO appointments (
            id, customer_id, title, scheduled_time, priority, status, notes
        ) VALUES (
            test_appointment_id,
            test_customer_id,
            'Test Appointment',
            NOW() + INTERVAL '1 day',
            'normal',
            'scheduled',
            'Test note'
        );
        RAISE NOTICE '✅ Test appointment created';
        
        -- Clean up
        DELETE FROM appointments WHERE id = test_appointment_id;
        RAISE NOTICE '✅ Test appointment deleted';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Appointment test failed: %', SQLERRM;
    END;
    
    -- Test points history insert
    BEGIN
        test_points_id := gen_random_uuid();
        INSERT INTO customer_points_history (
            id, customer_id, points_change, reason, created_at
        ) VALUES (
            test_points_id,
            test_customer_id,
            10,
            'Test points',
            NOW()
        );
        RAISE NOTICE '✅ Test points history created';
        
        -- Clean up
        DELETE FROM customer_points_history WHERE id = test_points_id;
        RAISE NOTICE '✅ Test points history deleted';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Points history test failed: %', SQLERRM;
    END;
    
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '🎉 FIX COMPLETE! Verifying...' as status;

-- Check appointments table
SELECT 'Appointments table columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointments'
ORDER BY ordinal_position;

-- Check points history table
SELECT 'Customer points history table columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_points_history'
ORDER BY ordinal_position;

SELECT '✅ All fixes applied successfully!' as final_status;

