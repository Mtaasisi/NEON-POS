-- ===================================================================
-- FIX MISSING EMPLOYEE LINK FOR USER: care@care.com
-- ===================================================================
-- This script diagnoses and fixes the issue where a user exists
-- but doesn't have a corresponding employee record linked
-- ===================================================================

-- STEP 1: Check if the user exists
-- ===================================================================
SELECT 
    id,
    email,
    role,
    full_name,
    is_active,
    created_at
FROM users
WHERE email = 'care@care.com'
   OR id = '287ec561-d5f2-4113-840e-e9335b9d3f69';

-- STEP 2: Check if an employee record exists with this email
-- ===================================================================
SELECT 
    id as employee_id,
    first_name,
    last_name,
    email,
    user_id,
    position,
    department,
    status,
    hire_date,
    created_at
FROM employees
WHERE email = 'care@care.com';

-- STEP 3: Check all users without employee records
-- ===================================================================
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.full_name as user_name,
    u.role,
    u.is_active,
    CASE 
        WHEN e.id IS NOT NULL THEN 'Has Employee Record (Unlinked)'
        ELSE 'No Employee Record'
    END as employee_status
FROM users u
LEFT JOIN employees e ON LOWER(u.email) = LOWER(e.email)
WHERE NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.user_id = u.id
)
ORDER BY u.created_at DESC;

-- ===================================================================
-- SOLUTION 1: If employee record exists, link it to the user
-- ===================================================================
-- This will link any employee records that have matching email addresses
UPDATE employees e
SET 
    user_id = u.id,
    updated_at = NOW()
FROM users u
WHERE 
    LOWER(e.email) = LOWER(u.email)
    AND e.user_id IS NULL
    AND u.email = 'care@care.com';

-- Verify the link was created
SELECT 
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.email as employee_email,
    e.user_id,
    u.email as user_email,
    u.full_name as user_full_name
FROM employees e
INNER JOIN users u ON e.user_id = u.id
WHERE u.email = 'care@care.com';

-- ===================================================================
-- SOLUTION 2: If no employee record exists, create one
-- ===================================================================
-- Run this only if the above UPDATE didn't find any records to link

-- First, check if we need to create an employee record
DO $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_employee_exists BOOLEAN;
BEGIN
    -- Get user details
    SELECT id, email, full_name
    INTO v_user_id, v_user_email, v_user_name
    FROM users
    WHERE email = 'care@care.com';

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User care@care.com not found!';
        RETURN;
    END IF;

    -- Check if employee record already exists
    SELECT EXISTS(
        SELECT 1 FROM employees WHERE user_id = v_user_id
    ) INTO v_employee_exists;

    IF v_employee_exists THEN
        RAISE NOTICE 'Employee record already exists for user: %', v_user_email;
    ELSE
        -- Create employee record
        INSERT INTO employees (
            user_id,
            first_name,
            last_name,
            email,
            position,
            department,
            hire_date,
            employment_type,
            salary,
            currency,
            status
        )
        VALUES (
            v_user_id,
            SPLIT_PART(COALESCE(v_user_name, 'Care'), ' ', 1), -- First name
            CASE 
                WHEN array_length(string_to_array(COALESCE(v_user_name, 'User'), ' '), 1) > 1 
                THEN array_to_string((string_to_array(COALESCE(v_user_name, 'User'), ' '))[2:], ' ')
                ELSE 'User'
            END, -- Last name
            v_user_email,
            'Staff', -- Default position
            'General', -- Default department
            CURRENT_DATE, -- Hire date
            'full-time', -- Employment type
            0, -- Salary (to be updated later)
            'TZS', -- Currency
            'active' -- Status
        );
        
        RAISE NOTICE 'Created employee record for user: %', v_user_email;
    END IF;
END $$;

-- ===================================================================
-- STEP 4: Verify the fix
-- ===================================================================
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.full_name as user_name,
    u.role,
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.position,
    e.department,
    e.status as employee_status,
    CASE 
        WHEN e.user_id = u.id THEN '✅ Linked'
        WHEN e.id IS NOT NULL THEN '⚠️ Unlinked'
        ELSE '❌ No Employee Record'
    END as link_status
FROM users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.email = 'care@care.com';

-- ===================================================================
-- BONUS: Link ALL users to employees by email (if needed)
-- ===================================================================
-- This will automatically link all users to employees by matching emails
-- Uncomment to run for all users

-- UPDATE employees e
-- SET 
--     user_id = u.id,
--     updated_at = NOW()
-- FROM users u
-- WHERE 
--     LOWER(e.email) = LOWER(u.email)
--     AND e.user_id IS NULL
--     AND u.is_active = true;

-- Show results
-- SELECT COUNT(*) as linked_count
-- FROM employees
-- WHERE user_id IS NOT NULL;

-- ===================================================================

