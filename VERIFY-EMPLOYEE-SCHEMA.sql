-- ===================================================================
-- EMPLOYEE MANAGEMENT SCHEMA VERIFICATION SCRIPT
-- ===================================================================
-- Run this script after migration to verify everything is working
-- ===================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'EMPLOYEE MANAGEMENT SYSTEM - VERIFICATION SCRIPT'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''

-- ===================================================================
-- TEST 1: Check if all required tables exist
-- ===================================================================
\echo '📋 TEST 1: Checking if all required tables exist...'
\echo ''

SELECT 
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ PASS: All 5 tables exist'
        ELSE '❌ FAIL: Missing tables. Found ' || COUNT(*) || ' out of 5'
    END as result
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates');

\echo ''
\echo 'Tables found:'
SELECT '  ✓ ' || table_name as tables
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates')
ORDER BY table_name;

-- ===================================================================
-- TEST 2: Check employees table structure
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 2: Verifying employees table structure...'
\echo ''

DO $$
DECLARE
    col_count INTEGER;
    required_cols TEXT[] := ARRAY[
        'id', 'first_name', 'last_name', 'email', 'phone', 'position', 
        'department', 'salary', 'status', 'performance_rating', 'skills',
        'hire_date', 'created_at', 'updated_at'
    ];
    col TEXT;
    found_cols TEXT[];
BEGIN
    SELECT array_agg(column_name) INTO found_cols
    FROM information_schema.columns
    WHERE table_name = 'employees' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Required columns check:';
    FOREACH col IN ARRAY required_cols
    LOOP
        IF col = ANY(found_cols) THEN
            RAISE NOTICE '  ✓ %', col;
        ELSE
            RAISE NOTICE '  ✗ % (MISSING)', col;
        END IF;
    END LOOP;
END $$;

-- ===================================================================
-- TEST 3: Check if indexes are created
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 3: Checking indexes...'
\echo ''

SELECT 
    CASE 
        WHEN COUNT(*) >= 13 THEN '✅ PASS: All indexes created (' || COUNT(*) || ' found)'
        ELSE '⚠️  WARNING: Expected at least 13 indexes, found ' || COUNT(*)
    END as result
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts');

\echo ''
\echo 'Indexes found:'
SELECT '  ✓ ' || indexname || ' on ' || tablename as indexes
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ===================================================================
-- TEST 4: Check if views are created
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 4: Checking views...'
\echo ''

SELECT 
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ PASS: All views created'
        ELSE '❌ FAIL: Missing views. Found ' || COUNT(*) || ' out of 2'
    END as result
FROM pg_views
WHERE schemaname = 'public' 
AND viewname IN ('employee_attendance_summary', 'todays_attendance');

\echo ''
\echo 'Views found:'
SELECT '  ✓ ' || viewname as views
FROM pg_views
WHERE schemaname = 'public' 
AND viewname IN ('employee_attendance_summary', 'todays_attendance')
ORDER BY viewname;

-- ===================================================================
-- TEST 5: Check if triggers are created
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 5: Checking triggers...'
\echo ''

SELECT 
    CASE 
        WHEN COUNT(*) >= 7 THEN '✅ PASS: All triggers created (' || COUNT(*) || ' found)'
        ELSE '⚠️  WARNING: Expected at least 7 triggers, found ' || COUNT(*)
    END as result
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
AND event_object_table IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates');

\echo ''
\echo 'Triggers found:'
SELECT '  ✓ ' || trigger_name || ' on ' || event_object_table as triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
AND event_object_table IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates')
ORDER BY event_object_table, trigger_name;

-- ===================================================================
-- TEST 6: Check if RLS policies are enabled
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 6: Checking Row Level Security...'
\echo ''

DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates')
    AND rowsecurity = true;
    
    IF rls_count = 5 THEN
        RAISE NOTICE '✅ PASS: RLS enabled on all tables';
    ELSE
        RAISE NOTICE '❌ FAIL: RLS not enabled on all tables (% out of 5)', rls_count;
    END IF;
END $$;

\echo ''
\echo 'RLS Policies:'
SELECT '  ✓ ' || policyname || ' on ' || tablename as policies
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates')
ORDER BY tablename, policyname;

-- ===================================================================
-- TEST 7: Test data operations
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 7: Testing CRUD operations...'
\echo ''

-- Test INSERT
DO $$
DECLARE
    test_id UUID;
BEGIN
    BEGIN
        INSERT INTO employees (
            first_name, last_name, email, phone, position, department, 
            salary, status, performance_rating, skills
        ) VALUES (
            'Test', 'Employee', 'test.employee@verify.com', '+255999999999',
            'Test Developer', 'IT', 1000000, 'active', 4.5,
            ARRAY['Testing', 'Verification']
        )
        RETURNING id INTO test_id;
        
        RAISE NOTICE '✅ INSERT: Successfully created test employee (ID: %)', test_id;
        
        -- Test UPDATE
        UPDATE employees 
        SET performance_rating = 5.0 
        WHERE id = test_id;
        
        RAISE NOTICE '✅ UPDATE: Successfully updated test employee';
        
        -- Test SELECT
        IF EXISTS (SELECT 1 FROM employees WHERE id = test_id AND performance_rating = 5.0) THEN
            RAISE NOTICE '✅ SELECT: Successfully retrieved updated data';
        END IF;
        
        -- Test DELETE
        DELETE FROM employees WHERE id = test_id;
        
        RAISE NOTICE '✅ DELETE: Successfully deleted test employee';
        RAISE NOTICE '';
        RAISE NOTICE '✅ PASS: All CRUD operations working correctly';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ FAIL: CRUD operations failed - %', SQLERRM;
        -- Clean up if test employee was created
        DELETE FROM employees WHERE email = 'test.employee@verify.com';
    END;
END $$;

-- ===================================================================
-- TEST 8: Test attendance record with automatic hour calculation
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 8: Testing attendance triggers (automatic hour calculation)...'
\echo ''

DO $$
DECLARE
    test_emp_id UUID;
    test_att_id UUID;
    calculated_hours DECIMAL;
BEGIN
    BEGIN
        -- Create test employee
        INSERT INTO employees (
            first_name, last_name, email, position, department, salary
        ) VALUES (
            'Attendance', 'Test', 'attendance.test@verify.com', 'Tester', 'IT', 500000
        )
        RETURNING id INTO test_emp_id;
        
        -- Create attendance record
        INSERT INTO attendance_records (
            employee_id, attendance_date, 
            check_in_time, check_out_time,
            status
        ) VALUES (
            test_emp_id, CURRENT_DATE,
            CURRENT_DATE + TIME '08:00:00',
            CURRENT_DATE + TIME '17:00:00',
            'present'
        )
        RETURNING id, total_hours INTO test_att_id, calculated_hours;
        
        IF calculated_hours = 9.0 THEN
            RAISE NOTICE '✅ PASS: Attendance hours calculated correctly (% hours)', calculated_hours;
        ELSE
            RAISE NOTICE '⚠️  WARNING: Calculated hours unexpected (% hours, expected 9.0)', calculated_hours;
        END IF;
        
        -- Clean up
        DELETE FROM attendance_records WHERE id = test_att_id;
        DELETE FROM employees WHERE id = test_emp_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ FAIL: Attendance trigger test failed - %', SQLERRM;
        -- Clean up
        DELETE FROM employees WHERE email = 'attendance.test@verify.com';
    END;
END $$;

-- ===================================================================
-- TEST 9: Check current data
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 9: Current data summary...'
\echo ''

DO $$
DECLARE
    emp_count INTEGER;
    att_count INTEGER;
    leave_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO emp_count FROM employees;
    SELECT COUNT(*) INTO att_count FROM attendance_records;
    SELECT COUNT(*) INTO leave_count FROM leave_requests;
    
    RAISE NOTICE 'Current Data:';
    RAISE NOTICE '  👥 Employees: %', emp_count;
    RAISE NOTICE '  📅 Attendance Records: %', att_count;
    RAISE NOTICE '  🏖️  Leave Requests: %', leave_count;
    
    IF emp_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE 'Employee Status Breakdown:';
    END IF;
END $$;

SELECT 
    '  ' || status || ': ' || COUNT(*) as status_count
FROM employees
GROUP BY status
ORDER BY status;

-- ===================================================================
-- TEST 10: Test views
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '📋 TEST 10: Testing views...'
\echo ''

DO $$
DECLARE
    view1_works BOOLEAN;
    view2_works BOOLEAN;
BEGIN
    BEGIN
        PERFORM * FROM employee_attendance_summary LIMIT 1;
        view1_works := true;
        RAISE NOTICE '✅ employee_attendance_summary view is working';
    EXCEPTION WHEN OTHERS THEN
        view1_works := false;
        RAISE NOTICE '❌ employee_attendance_summary view failed: %', SQLERRM;
    END;
    
    BEGIN
        PERFORM * FROM todays_attendance LIMIT 1;
        view2_works := true;
        RAISE NOTICE '✅ todays_attendance view is working';
    EXCEPTION WHEN OTHERS THEN
        view2_works := false;
        RAISE NOTICE '❌ todays_attendance view failed: %', SQLERRM;
    END;
    
    IF view1_works AND view2_works THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ PASS: All views are working correctly';
    END IF;
END $$;

-- ===================================================================
-- FINAL SUMMARY
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'VERIFICATION SUMMARY'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''

DO $$
BEGIN
    RAISE NOTICE '✅ Database schema verification complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Test the application at /employees route';
    RAISE NOTICE '2. Try creating a new employee';
    RAISE NOTICE '3. Try marking attendance';
    RAISE NOTICE '4. Check for any errors in the browser console';
    RAISE NOTICE '';
    RAISE NOTICE 'If all tests passed, your Employee Management system is ready! 🎉';
    RAISE NOTICE '';
END $$;

