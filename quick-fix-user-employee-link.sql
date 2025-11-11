-- ============================================================================
-- QUICK FIX: Link User Account to Employee Record
-- ============================================================================
-- This script helps you diagnose and fix the "Employee Record Not Found" error
-- Run each section sequentially and review the results
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSIS - Check Current Status
-- ============================================================================

-- 1.1 Check if you have a user account (replace with your email)
SELECT 
    id as user_id,
    email,
    full_name,
    role,
    is_active,
    'User account found ✓' as status
FROM users
WHERE email = 'your.email@example.com';  -- REPLACE THIS WITH YOUR ACTUAL EMAIL

-- 1.2 Check if you have an employee record (replace with your email)
SELECT 
    id as employee_id,
    email,
    first_name,
    last_name,
    position,
    department,
    user_id,
    CASE 
        WHEN user_id IS NULL THEN 'NOT LINKED ✗ - This is the problem!'
        ELSE 'Already linked ✓'
    END as link_status
FROM employees
WHERE email = 'your.email@example.com';  -- REPLACE THIS WITH YOUR ACTUAL EMAIL

-- 1.3 Check your current link status
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.full_name,
    e.id as employee_id,
    e.email as employee_email,
    e.first_name || ' ' || e.last_name as employee_name,
    e.position,
    e.user_id as linked_user_id,
    CASE 
        WHEN e.id IS NULL THEN '❌ NO EMPLOYEE RECORD - Need to create one'
        WHEN e.user_id IS NULL THEN '⚠️  NOT LINKED - Need to link'
        WHEN e.user_id = u.id THEN '✅ PROPERLY LINKED - No action needed'
        ELSE '⛔ LINKED TO DIFFERENT USER - Conflict!'
    END as status
FROM users u
LEFT JOIN employees e ON LOWER(u.email) = LOWER(e.email)
WHERE u.email = 'your.email@example.com';  -- REPLACE THIS WITH YOUR ACTUAL EMAIL


-- ============================================================================
-- STEP 2: FIX - Choose ONE of the following options based on Step 1 results
-- ============================================================================

-- ----------------------------------------------------------------------------
-- OPTION A: Link existing user to existing employee (by email match)
-- Use this if Step 1 shows you have both user and employee records
-- ----------------------------------------------------------------------------
UPDATE employees
SET 
    user_id = (
        SELECT u.id 
        FROM users u 
        WHERE LOWER(u.email) = LOWER(employees.email)
        LIMIT 1
    ),
    updated_at = NOW()
WHERE LOWER(email) = LOWER('your.email@example.com')  -- REPLACE THIS
  AND user_id IS NULL;

-- Check if it worked
SELECT 
    'Link created successfully! ✅' as result,
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.user_id,
    u.email as user_email
FROM employees e
JOIN users u ON e.user_id = u.id
WHERE LOWER(e.email) = LOWER('your.email@example.com');  -- REPLACE THIS


-- ----------------------------------------------------------------------------
-- OPTION B: Bulk auto-link ALL users to employees (by matching emails)
-- Use this if you want to fix ALL unlinked users at once
-- ----------------------------------------------------------------------------
-- First, see what would be linked
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.full_name,
    e.id as employee_id,
    e.email as employee_email,
    e.first_name || ' ' || e.last_name as employee_name,
    'Will be linked' as action
FROM users u
JOIN employees e ON LOWER(u.email) = LOWER(e.email)
WHERE e.user_id IS NULL
  AND u.is_active = true;

-- If the above looks correct, run this to link them:
UPDATE employees e
SET 
    user_id = u.id,
    updated_at = NOW()
FROM users u
WHERE LOWER(e.email) = LOWER(u.email)
  AND e.user_id IS NULL
  AND u.is_active = true;

-- Check results
SELECT 
    COUNT(*) as total_linked,
    'Users linked successfully! ✅' as status
FROM employees
WHERE user_id IS NOT NULL;


-- ----------------------------------------------------------------------------
-- OPTION C: Create employee record for user (if employee doesn't exist)
-- Use this ONLY if Step 1 shows you have NO employee record
-- ----------------------------------------------------------------------------
-- NOTE: Replace ALL the placeholder values below with actual data!

INSERT INTO employees (
    id,
    user_id,
    first_name,
    last_name,
    email,
    position,
    department,
    hire_date,
    salary,
    status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    'FirstName',                    -- REPLACE WITH ACTUAL FIRST NAME
    'LastName',                     -- REPLACE WITH ACTUAL LAST NAME
    u.email,
    'Employee',                     -- REPLACE WITH ACTUAL POSITION
    'General',                      -- REPLACE WITH ACTUAL DEPARTMENT
    CURRENT_DATE,
    0,
    'active',
    NOW(),
    NOW()
FROM users u
WHERE u.email = 'your.email@example.com'  -- REPLACE THIS
  AND NOT EXISTS (
    SELECT 1 FROM employees e WHERE e.user_id = u.id
  );

-- Verify the new employee was created
SELECT 
    'Employee created and linked! ✅' as result,
    *
FROM employees
WHERE user_id = (SELECT id FROM users WHERE email = 'your.email@example.com');


-- ============================================================================
-- STEP 3: VERIFICATION - Run this after applying a fix
-- ============================================================================

-- 3.1 Verify your specific link
SELECT 
    u.email as user_email,
    u.full_name as user_name,
    u.role,
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.position,
    e.department,
    CASE 
        WHEN e.user_id = u.id THEN '✅ SUCCESS! You can now access My Attendance'
        ELSE '❌ STILL NOT LINKED - Try another option'
    END as final_status
FROM users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.email = 'your.email@example.com';  -- REPLACE THIS

-- 3.2 List all properly linked accounts
SELECT 
    u.email as user_email,
    u.full_name,
    e.first_name || ' ' || e.last_name as employee_name,
    e.position,
    e.department,
    '✅ Linked' as status
FROM users u
JOIN employees e ON e.user_id = u.id
WHERE u.is_active = true
ORDER BY u.email;


-- ============================================================================
-- STEP 4: TROUBLESHOOTING
-- ============================================================================

-- 4.1 Find ALL unlinked users
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    '⚠️ No employee record' as issue
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM employees e WHERE e.user_id = u.id
)
AND u.is_active = true
ORDER BY u.email;

-- 4.2 Find ALL unlinked employees
SELECT 
    e.id,
    e.email,
    e.first_name || ' ' || e.last_name as name,
    e.position,
    '⚠️ No user account linked' as issue
FROM employees e
WHERE e.user_id IS NULL
ORDER BY e.email;

-- 4.3 Find email mismatches (user exists but employee has different email)
SELECT 
    u.id as user_id,
    u.email as user_email,
    e.id as employee_id,
    e.email as employee_email,
    'Emails don''t match - manual link needed' as issue
FROM users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.is_active = true
  AND e.id IS NOT NULL
  AND LOWER(u.email) != LOWER(e.email);

-- 4.4 Find conflicts (employee linked to different user than expected)
SELECT 
    e.email as employee_email,
    e.first_name || ' ' || e.last_name as employee_name,
    u1.email as linked_user_email,
    u2.email as expected_user_email,
    'Conflict: linked to wrong user' as issue
FROM employees e
JOIN users u1 ON e.user_id = u1.id
LEFT JOIN users u2 ON LOWER(e.email) = LOWER(u2.email)
WHERE u1.id != u2.id;


-- ============================================================================
-- STEP 5: ADVANCED - Unlink and Relink (if needed)
-- ============================================================================

-- 5.1 Unlink a specific employee (use with caution!)
-- Uncomment and replace the email to unlink
/*
UPDATE employees
SET user_id = NULL, updated_at = NOW()
WHERE email = 'employee.email@example.com';
*/

-- 5.2 Force link to specific IDs (use when emails don't match)
-- Uncomment and replace the IDs
/*
UPDATE employees
SET user_id = 'user-uuid-here', updated_at = NOW()
WHERE id = 'employee-uuid-here';
*/


-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. Always replace 'your.email@example.com' with your actual email address
-- 2. Run Step 1 (Diagnosis) first to understand the problem
-- 3. Choose ONE fix option from Step 2 based on what Step 1 showed
-- 4. Run Step 3 (Verification) to confirm the fix worked
-- 5. After successful linking, refresh your browser and log back in
-- 6. Navigate to "My Attendance" page - it should work now!
-- 
-- If you're still having issues, check the main documentation:
-- See FIX-USER-EMPLOYEE-LINK.md for detailed instructions
-- 
-- ============================================================================

