-- ===================================================================
-- Fix Attendance Page: Create Employee Record for care@care.com
-- ===================================================================
-- This script creates an employee record for the care@care.com user
-- so they can access the attendance page
-- ===================================================================

-- First, let's check if the user exists and get their ID
DO $$
DECLARE
    v_user_id UUID;
    v_existing_employee_id UUID;
BEGIN
    -- Get the user_id for care@care.com
    SELECT id INTO v_user_id
    FROM users
    WHERE email = 'care@care.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ User care@care.com not found in users table';
        RAISE NOTICE 'Please create the user first before running this script';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found user care@care.com with ID: %', v_user_id;
    
    -- Check if employee record already exists
    SELECT id INTO v_existing_employee_id
    FROM employees
    WHERE user_id = v_user_id OR email = 'care@care.com';
    
    IF v_existing_employee_id IS NOT NULL THEN
        RAISE NOTICE '⚠️  Employee record already exists with ID: %', v_existing_employee_id;
        RAISE NOTICE 'Updating existing employee record...';
        
        -- Update existing employee record
        UPDATE employees
        SET
            first_name = 'Care',
            last_name = 'Team',
            email = 'care@care.com',
            phone = '+255 700 000 000',
            position = 'Customer Care Specialist',
            department = 'Customer Service',
            hire_date = CURRENT_DATE,
            employment_type = 'full-time',
            salary = 800000.00,
            currency = 'TZS',
            status = 'active',
            performance_rating = 4.0,
            location = 'Main Office',
            updated_at = NOW()
        WHERE id = v_existing_employee_id;
        
        RAISE NOTICE '✅ Updated employee record successfully';
    ELSE
        -- Create new employee record
        INSERT INTO employees (
            user_id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            gender,
            position,
            department,
            hire_date,
            termination_date,
            employment_type,
            salary,
            currency,
            status,
            performance_rating,
            skills,
            location,
            address_line1,
            city,
            country,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            'Care',
            'Team',
            'care@care.com',
            '+255 700 000 000',
            '1990-01-01',
            'other',
            'Customer Care Specialist',
            'Customer Service',
            CURRENT_DATE,
            NULL,
            'full-time',
            800000.00,
            'TZS',
            'active',
            4.0,
            ARRAY['Customer Support', 'Communication', 'Problem Solving']::TEXT[],
            'Main Office',
            'Mwenge',
            'Dar es Salaam',
            'Tanzania',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Created new employee record successfully';
    END IF;
    
    -- Verify the employee record was created/updated
    SELECT id INTO v_existing_employee_id
    FROM employees
    WHERE user_id = v_user_id;
    
    RAISE NOTICE '✅ Final employee ID: %', v_existing_employee_id;
    RAISE NOTICE '✅ Employee record is ready for attendance tracking';
    
END $$;

-- Display the created employee record
SELECT 
    e.id,
    e.user_id,
    e.first_name || ' ' || e.last_name AS full_name,
    e.email,
    e.position,
    e.department,
    e.status,
    u.email AS user_email
FROM employees e
LEFT JOIN users u ON e.user_id = u.id
WHERE e.email = 'care@care.com'
   OR u.email = 'care@care.com';

-- Check attendance settings
SELECT 
    'Attendance Settings:' AS info,
    enabled,
    require_location,
    require_wifi,
    require_photo
FROM attendance_settings
LIMIT 1;

