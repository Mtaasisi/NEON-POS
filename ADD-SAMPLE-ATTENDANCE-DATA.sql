-- ===================================================================
-- Add Sample Attendance Data for Testing
-- ===================================================================
-- This script adds sample attendance records for the care@care.com user
-- to test the History tab and Statistics functionality
-- ===================================================================

DO $$
DECLARE
    v_employee_id UUID;
    v_date DATE;
    v_attendance_id UUID;
BEGIN
    -- Get the employee ID for care@care.com
    SELECT id INTO v_employee_id
    FROM employees
    WHERE email = 'care@care.com';
    
    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION '❌ Employee record not found for care@care.com';
    END IF;
    
    RAISE NOTICE '✅ Found employee ID: %', v_employee_id;
    RAISE NOTICE 'Creating sample attendance records...';
    
    -- Delete existing attendance records for this employee (clean slate)
    DELETE FROM attendance_records WHERE employee_id = v_employee_id;
    RAISE NOTICE '🗑️  Cleared existing attendance records';
    
    -- Create attendance records for the last 10 days
    FOR i IN 1..10 LOOP
        v_date := CURRENT_DATE - (i || ' days')::INTERVAL;
        
        -- Create attendance record with varying times and statuses
        INSERT INTO attendance_records (
            employee_id,
            attendance_date,
            check_in_time,
            check_out_time,
            status,
            total_hours,
            break_hours,
            overtime_hours,
            notes,
            created_at,
            updated_at
        ) VALUES (
            v_employee_id,
            v_date,
            -- Check in time: varies between 8:00 AM and 9:30 AM
            (v_date::TEXT || ' ' || 
                CASE 
                    WHEN i % 3 = 0 THEN '09:15:00'
                    WHEN i % 3 = 1 THEN '08:45:00'
                    ELSE '08:00:00'
                END)::TIMESTAMP,
            -- Check out time: varies between 5:00 PM and 6:30 PM
            (v_date::TEXT || ' ' || 
                CASE 
                    WHEN i % 4 = 0 THEN '18:30:00'
                    WHEN i % 4 = 1 THEN '17:00:00'
                    WHEN i % 4 = 2 THEN '17:30:00'
                    ELSE '18:00:00'
                END)::TIMESTAMP,
            -- Status: varies
            CASE 
                WHEN i % 7 = 0 THEN 'late'::TEXT
                WHEN i % 11 = 0 THEN 'half-day'::TEXT
                ELSE 'present'::TEXT
            END,
            -- Total hours: calculated based on check in/out times
            CASE 
                WHEN i % 3 = 0 THEN 9.25
                WHEN i % 3 = 1 THEN 8.25
                ELSE 10.0
            END,
            -- Break hours
            1.0,
            -- Overtime hours
            CASE WHEN i % 4 = 0 THEN 1.5 ELSE 0.0 END,
            -- Notes
            CASE 
                WHEN i % 7 = 0 THEN 'Arrived late due to traffic'
                WHEN i % 11 = 0 THEN 'Left early for medical appointment'
                ELSE NULL
            END,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_attendance_id;
        
        RAISE NOTICE '  ✅ Created attendance for % (ID: %)', v_date, v_attendance_id;
    END LOOP;
    
    -- Create today's check-in (no check-out yet)
    INSERT INTO attendance_records (
        employee_id,
        attendance_date,
        check_in_time,
        check_out_time,
        status,
        total_hours,
        break_hours,
        overtime_hours,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_employee_id,
        CURRENT_DATE,
        (CURRENT_DATE::TEXT || ' 08:30:00')::TIMESTAMP,
        NULL, -- Not checked out yet
        'present',
        0, -- Will be calculated when checking out
        0,
        0,
        'Currently working',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_attendance_id;
    
    RAISE NOTICE '  ✅ Created today''s check-in (ID: %)', v_attendance_id;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Successfully created 11 attendance records (10 past + 1 today)';
    
END $$;

-- Display summary of created records
SELECT 
    '📊 Attendance Records Summary' AS summary;

SELECT 
    attendance_date,
    TO_CHAR(check_in_time, 'HH24:MI') AS check_in,
    TO_CHAR(check_out_time, 'HH24:MI') AS check_out,
    status,
    total_hours,
    notes
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE e.email = 'care@care.com'
ORDER BY attendance_date DESC;

-- Calculate and display statistics
SELECT 
    '📈 Statistics' AS stats,
    COUNT(*) AS total_days,
    SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_days,
    SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late_days,
    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_days,
    ROUND(AVG(total_hours), 2) AS avg_hours,
    ROUND(SUM(total_hours), 2) AS total_hours
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE e.email = 'care@care.com';

