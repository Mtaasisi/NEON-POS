-- ===================================================================
-- LINK USERS TO EMPLOYEES
-- ===================================================================
-- This script helps link user accounts to employee records by matching
-- email addresses. This ensures the attendance system can properly
-- identify employees based on their logged-in user accounts.
-- ===================================================================

-- Step 1: Show current state of user-employee links
-- This helps you see which users are already linked
SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    e.email as employee_email,
    e.user_id,
    u.id as user_id_from_users,
    u.email as user_email,
    CASE 
        WHEN e.user_id IS NOT NULL THEN 'Linked'
        WHEN u.id IS NOT NULL THEN 'Can be linked'
        ELSE 'No matching user'
    END as status
FROM employees e
LEFT JOIN users u ON LOWER(e.email) = LOWER(u.email)
ORDER BY e.created_at DESC;

-- Step 2: Automatically link users to employees by matching email addresses
-- This will update employee records to point to their corresponding user accounts
UPDATE employees e
SET 
    user_id = u.id,
    updated_at = NOW()
FROM users u
WHERE 
    LOWER(e.email) = LOWER(u.email)
    AND e.user_id IS NULL;

-- Step 3: Verify the links were created successfully
SELECT 
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.email as employee_email,
    u.id as user_id,
    u.email as user_email,
    u.role as user_role
FROM employees e
INNER JOIN users u ON e.user_id = u.id
ORDER BY e.first_name, e.last_name;

-- Step 4: Show employees without user accounts (need manual creation)
-- These employees don't have matching user accounts and may need one created
SELECT 
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.email as employee_email,
    e.position,
    e.department,
    e.status
FROM employees e
WHERE e.user_id IS NULL
ORDER BY e.first_name, e.last_name;

-- ===================================================================
-- MANUAL LINKING EXAMPLES
-- ===================================================================
-- If you need to manually link a specific employee to a user:
-- 
-- UPDATE employees 
-- SET user_id = 'USER_UUID_HERE', updated_at = NOW()
-- WHERE id = 'EMPLOYEE_UUID_HERE';
--
-- Example:
-- UPDATE employees 
-- SET user_id = '123e4567-e89b-12d3-a456-426614174000', updated_at = NOW()
-- WHERE email = 'john.doe@company.com';
-- ===================================================================

-- ===================================================================
-- CREATE USER ACCOUNTS FOR EMPLOYEES
-- ===================================================================
-- If an employee doesn't have a user account, you can create one:
--
-- INSERT INTO users (email, password_hash, role, full_name, is_active)
-- VALUES (
--     'employee@company.com',
--     crypt('temporary_password', gen_salt('bf')), -- Use proper password hashing
--     'employee', -- or 'technician', 'admin', etc.
--     'Employee Full Name',
--     true
-- )
-- RETURNING id;
--
-- Then link the employee to the newly created user using the returned ID
-- ===================================================================

-- ===================================================================
-- FETCH REAL USER DATA FROM LIVE DATABASE
-- Employee ID: fa708e58-942c-4c5b-8969-d0a941f12764
-- ===================================================================

-- First, check if this employee exists and get their details
SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    e.email as employee_email,
    e.phone,
    e.position,
    e.department,
    e.status as employee_status,
    e.hire_date,
    e.user_id,
    e.created_at,
    e.updated_at
FROM employees e
WHERE e.id = 'fa708e58-942c-4c5b-8969-d0a941f12764';

-- Get the linked user data (if user_id exists)
-- Try with 'users' table first
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.created_at,
    u.updated_at
FROM users u
WHERE u.id = (SELECT user_id FROM employees WHERE id = 'fa708e58-942c-4c5b-8969-d0a941f12764');

-- If the above doesn't work, try 'auth_users' table
SELECT 
    au.id,
    au.email,
    au.role,
    au.created_at,
    au.updated_at
FROM auth_users au
WHERE au.id = (SELECT user_id FROM employees WHERE id = 'fa708e58-942c-4c5b-8969-d0a941f12764');

-- Complete join with employee and user data
SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    e.email as employee_email,
    e.phone,
    e.position,
    e.department,
    e.status as employee_status,
    e.hire_date,
    e.user_id,
    COALESCE(u.id, au.id) as user_id,
    COALESCE(u.email, au.email) as user_email,
    u.full_name as user_full_name,
    COALESCE(u.role, au.role) as user_role,
    u.is_active as user_is_active
FROM employees e
LEFT JOIN users u ON e.user_id = u.id
LEFT JOIN auth_users au ON e.user_id = au.id
WHERE e.id = 'fa708e58-942c-4c5b-8969-d0a941f12764';

-- ===================================================================
-- SHOW ALL REAL USERS IN THE SYSTEM
-- ===================================================================
-- View all users from auth_users table
SELECT 
    id,
    email,
    role,
    created_at,
    updated_at
FROM auth_users
ORDER BY created_at DESC
LIMIT 20;

-- View all users from users table (if it exists)
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
FROM users
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 20;

-- ===================================================================

