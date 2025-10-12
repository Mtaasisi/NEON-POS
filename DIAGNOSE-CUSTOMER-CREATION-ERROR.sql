-- ============================================================================
-- DIAGNOSE CUSTOMER CREATION ERROR
-- ============================================================================
-- Run this in your Neon SQL Editor to diagnose the exact problem
-- This will tell you what's wrong and what needs to be fixed

-- ============================================================================
-- DIAGNOSTIC SECTION 1: Check customer_notes table structure
-- ============================================================================

DO $$ 
DECLARE
    has_id_column BOOLEAN;
    id_column_type TEXT;
    has_primary_key BOOLEAN;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 DIAGNOSTIC 1: Checking customer_notes table...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Check if customer_notes table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_notes') THEN
        RAISE NOTICE '❌ PROBLEM FOUND: customer_notes table does not exist!';
        RAISE NOTICE '💡 FIX: Run the complete fix script to create the table';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ customer_notes table exists';
    
    -- Check if id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_notes' AND column_name = 'id'
    ) INTO has_id_column;
    
    IF NOT has_id_column THEN
        RAISE NOTICE '❌ PROBLEM FOUND: customer_notes table is missing id column!';
        RAISE NOTICE '💡 FIX: Add id column with: ALTER TABLE customer_notes ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ id column exists';
    
    -- Check id column type
    SELECT data_type INTO id_column_type
    FROM information_schema.columns 
    WHERE table_name = 'customer_notes' AND column_name = 'id';
    
    RAISE NOTICE '   Column type: %', id_column_type;
    
    -- Check if id is primary key
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'customer_notes' 
            AND tc.constraint_type = 'PRIMARY KEY'
            AND kcu.column_name = 'id'
    ) INTO has_primary_key;
    
    IF has_primary_key THEN
        RAISE NOTICE '✅ id column is primary key';
    ELSE
        RAISE NOTICE '⚠️  WARNING: id column is not a primary key';
    END IF;
    
    RAISE NOTICE '✅ DIAGNOSTIC 1: customer_notes table structure is OK';
    
END $$;

-- ============================================================================
-- DIAGNOSTIC SECTION 2: Check RLS status
-- ============================================================================

DO $$ 
DECLARE
    customers_rls BOOLEAN;
    customer_notes_rls BOOLEAN;
    policy_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 DIAGNOSTIC 2: Checking Row Level Security (RLS)...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Check customers RLS
    SELECT relrowsecurity INTO customers_rls
    FROM pg_class
    WHERE relname = 'customers';
    
    IF customers_rls THEN
        RAISE NOTICE '❌ PROBLEM FOUND: RLS is ENABLED on customers table!';
        RAISE NOTICE '💡 FIX: Disable with: ALTER TABLE customers DISABLE ROW LEVEL SECURITY;';
    ELSE
        RAISE NOTICE '✅ RLS is disabled on customers table';
    END IF;
    
    -- Check customer_notes RLS
    SELECT relrowsecurity INTO customer_notes_rls
    FROM pg_class
    WHERE relname = 'customer_notes';
    
    IF customer_notes_rls THEN
        RAISE NOTICE '❌ PROBLEM FOUND: RLS is ENABLED on customer_notes table!';
        RAISE NOTICE '💡 FIX: Disable with: ALTER TABLE customer_notes DISABLE ROW LEVEL SECURITY;';
    ELSE
        RAISE NOTICE '✅ RLS is disabled on customer_notes table';
    END IF;
    
    -- Count active policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
        AND tablename IN ('customers', 'customer_notes');
    
    IF policy_count > 0 THEN
        RAISE NOTICE '⚠️  WARNING: Found % active RLS policies', policy_count;
        RAISE NOTICE '   These may block inserts even with RLS disabled';
    ELSE
        RAISE NOTICE '✅ No RLS policies found';
    END IF;
    
    IF customers_rls OR customer_notes_rls THEN
        RAISE NOTICE '❌ DIAGNOSTIC 2: RLS is blocking operations';
    ELSE
        RAISE NOTICE '✅ DIAGNOSTIC 2: RLS check passed';
    END IF;
    
END $$;

-- ============================================================================
-- DIAGNOSTIC SECTION 3: Check required columns in customers table
-- ============================================================================

DO $$ 
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 DIAGNOSTIC 3: Checking customers table columns...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Check for required columns
    FOREACH col_name IN ARRAY ARRAY['whatsapp', 'created_by', 'referrals', 'referred_by', 'joined_date', 'created_at', 'updated_at']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = col_name
        ) THEN
            missing_columns := array_append(missing_columns, col_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE '❌ PROBLEM FOUND: Missing columns in customers table:';
        FOREACH col_name IN ARRAY missing_columns
        LOOP
            RAISE NOTICE '   - %', col_name;
        END LOOP;
        RAISE NOTICE '💡 FIX: Run the complete fix script to add these columns';
    ELSE
        RAISE NOTICE '✅ All required columns exist';
    END IF;
    
    RAISE NOTICE '✅ DIAGNOSTIC 3: Column check complete';
    
END $$;

-- ============================================================================
-- DIAGNOSTIC SECTION 4: Test customer insert
-- ============================================================================

DO $$ 
DECLARE
    test_customer_id UUID;
    test_note_id UUID;
    error_message TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 DIAGNOSTIC 4: Testing customer creation...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    test_customer_id := gen_random_uuid();
    test_note_id := gen_random_uuid();
    
    -- Try to insert test customer
    BEGIN
        INSERT INTO customers (
            id, name, phone, email, gender, city,
            loyalty_level, color_tag, points, total_spent,
            is_active, joined_date, last_visit, created_at, updated_at
        ) VALUES (
            test_customer_id,
            'TEST_DIAGNOSTIC_DELETE_ME',
            'TEST_' || floor(random() * 1000000)::text,
            '',
            'other',
            'Test City',
            'bronze',
            'new',
            10,
            0,
            true,
            CURRENT_DATE,
            NOW(),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Test customer insert: SUCCESS';
        
        -- Try to insert test note
        BEGIN
            INSERT INTO customer_notes (
                id, customer_id, note, created_by, created_at
            ) VALUES (
                test_note_id,
                test_customer_id,
                'Test diagnostic note',
                NULL,
                NOW()
            );
            
            RAISE NOTICE '✅ Test customer note insert: SUCCESS';
            
            -- Clean up
            DELETE FROM customer_notes WHERE id = test_note_id;
            DELETE FROM customers WHERE id = test_customer_id;
            RAISE NOTICE '✅ Test data cleaned up';
            
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RAISE NOTICE '❌ PROBLEM FOUND: Customer note insert FAILED!';
            RAISE NOTICE '   Error: %', error_message;
            RAISE NOTICE '💡 FIX: Run the complete fix script';
            
            -- Clean up customer if note failed
            DELETE FROM customers WHERE id = test_customer_id;
        END;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE '❌ PROBLEM FOUND: Customer insert FAILED!';
        RAISE NOTICE '   Error: %', error_message;
        RAISE NOTICE '💡 FIX: Run the complete fix script';
    END;
    
    RAISE NOTICE '✅ DIAGNOSTIC 4: Test complete';
    
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 DIAGNOSTIC COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Review the messages above to see what problems were found.';
    RAISE NOTICE '';
    RAISE NOTICE 'If any ❌ PROBLEM FOUND messages appeared:';
    RAISE NOTICE '1. Run the complete fix script: 🔥 FIX-CUSTOMER-CREATION-ERROR.sql';
    RAISE NOTICE '2. Or follow the 💡 FIX suggestions for each problem';
    RAISE NOTICE '';
    RAISE NOTICE 'If all checks showed ✅:';
    RAISE NOTICE '1. Your database is configured correctly';
    RAISE NOTICE '2. The error may be in your application code';
    RAISE NOTICE '3. Check browser console for JavaScript errors';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
