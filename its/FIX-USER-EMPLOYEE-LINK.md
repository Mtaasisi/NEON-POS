# Fix: User Account Not Linked to Employee Record

## Problem Description
When accessing the "My Attendance" page, you're seeing this error:
```
Employee Record Not Found
Your user account is not linked to an employee record.
Please contact your HR department to link your account.
```

## Root Cause
Your user account in the `users` table is not connected to a record in the `employees` table. The system requires a `user_id` field in the `employees` table to link the two records.

---

## Solution Options

### Option 1: Link via Admin UI (Recommended - Easy)

If you have admin access:

1. **Navigate to User Management**
   - Go to the Admin Dashboard
   - Click on "User Management" or navigate to `/users`

2. **Open the Link Manager**
   - Look for a button with a "Link" icon (🔗)
   - Click "Link users to employee records" button
   - This opens the User-Employee Link Modal

3. **Auto-Link by Email**
   - In the modal, click the "Auto-Link All" button
   - This automatically links all users to employees with matching emails
   - It will show you results: X linked, Y skipped, Z errors

4. **Manual Link (if auto-link doesn't work)**
   - Go to the "Unlinked" tab in the modal
   - Select your user account from the dropdown
   - Select your employee record from the dropdown
   - Click "Link Selected"

5. **Verify the Link**
   - Go back to "My Attendance" page
   - You should now see your attendance dashboard

---

### Option 2: SQL Script to Manually Link (Advanced)

Use this if you need to manually link via SQL:

#### Step 1: Check Current Status

```sql
-- Find your user ID and email
SELECT id, email, full_name 
FROM users 
WHERE email = 'your.email@example.com';

-- Find your employee record
SELECT id, email, first_name, last_name, user_id 
FROM employees 
WHERE email = 'your.email@example.com';
```

#### Step 2: Link User to Employee

Replace the placeholders with actual IDs:

```sql
-- Link by matching emails (safest method)
UPDATE employees
SET user_id = (
  SELECT u.id 
  FROM users u 
  WHERE LOWER(u.email) = LOWER(employees.email)
),
updated_at = NOW()
WHERE email = 'your.email@example.com'
AND user_id IS NULL;

-- Or link specific user to specific employee by ID
UPDATE employees
SET user_id = 'your-user-id-here',
    updated_at = NOW()
WHERE id = 'your-employee-id-here';
```

#### Step 3: Verify the Link

```sql
-- Check if link was successful
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.email as employee_email,
  e.user_id,
  u.id as user_id,
  u.email as user_email,
  u.full_name
FROM employees e
LEFT JOIN users u ON e.user_id = u.id
WHERE e.email = 'your.email@example.com';
```

---

### Option 3: Bulk Auto-Link All Users (System-Wide Fix)

This links ALL users to employees with matching emails:

```sql
-- Auto-link all users to employees by matching email addresses
UPDATE employees e
SET user_id = u.id,
    updated_at = NOW()
FROM users u
WHERE LOWER(e.email) = LOWER(u.email)
  AND e.user_id IS NULL
  AND u.is_active = true;

-- Check results
SELECT COUNT(*) as newly_linked_count
FROM employees
WHERE user_id IS NOT NULL;
```

---

### Option 4: Create Employee Record for Existing User

If you have a user account but NO employee record exists:

```sql
-- First, get your user details
SELECT * FROM users WHERE email = 'your.email@example.com';

-- Create a new employee record linked to your user
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
VALUES (
  gen_random_uuid(),
  'your-user-id-here',           -- Replace with your user ID
  'YourFirstName',                -- Replace with your first name
  'YourLastName',                 -- Replace with your last name
  'your.email@example.com',      -- Replace with your email
  'Your Position',                -- Replace with your position
  'Your Department',              -- Replace with your department
  CURRENT_DATE,                   -- Hire date (today)
  0,                              -- Salary (set to 0 or actual amount)
  'active',
  NOW(),
  NOW()
);
```

---

## Verification Steps

After applying any of the solutions above:

1. **Clear your browser cache** or do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

2. **Log out and log back in**

3. **Navigate to "My Attendance"**
   - Go to `/my-attendance` or click "My Attendance" from the navigation menu

4. **You should now see**:
   - Your name and position
   - Check-in/Check-out buttons
   - Your attendance statistics
   - Your attendance history

---

## Troubleshooting

### Issue: "Employee not found with this email"
**Solution**: Make sure the email in your user account EXACTLY matches the email in the employee record (including case).

```sql
-- Check email mismatches
SELECT 
  u.email as user_email,
  e.email as employee_email
FROM users u
FULL OUTER JOIN employees e ON LOWER(u.email) = LOWER(e.email)
WHERE u.email IS NULL OR e.email IS NULL;
```

### Issue: "Employee already linked to another user"
**Solution**: First unlink the employee, then link to the correct user:

```sql
-- Check who is currently linked
SELECT 
  e.id,
  e.email,
  e.first_name,
  e.last_name,
  e.user_id,
  u.email as linked_user_email
FROM employees e
LEFT JOIN users u ON e.user_id = u.id
WHERE e.email = 'your.email@example.com';

-- Unlink (only if you're certain!)
UPDATE employees
SET user_id = NULL,
    updated_at = NOW()
WHERE id = 'employee-id-here';

-- Then relink to correct user
UPDATE employees
SET user_id = 'correct-user-id-here',
    updated_at = NOW()
WHERE id = 'employee-id-here';
```

### Issue: Still getting error after linking
**Possible causes**:
1. Browser cache - Clear cache and refresh
2. Session issue - Log out and log back in
3. Database didn't commit - Check if the update actually saved:

```sql
SELECT * FROM employees WHERE user_id = 'your-user-id';
```

---

## Quick Reference: Find Your IDs

```sql
-- Get your user ID
SELECT id, email, full_name, role, is_active
FROM users
WHERE email ILIKE '%your-email%';

-- Get your employee ID
SELECT id, email, first_name, last_name, position, user_id
FROM employees
WHERE email ILIKE '%your-email%';

-- Get all unlinked employees
SELECT id, email, first_name, last_name, position, department
FROM employees
WHERE user_id IS NULL
ORDER BY email;

-- Get all unlinked users
SELECT u.id, u.email, u.full_name, u.role
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.user_id = u.id
)
AND u.is_active = true
ORDER BY u.email;
```

---

## Need Help?

If none of these solutions work:

1. **Check the browser console** for specific error messages:
   - Press F12 to open Developer Tools
   - Go to the Console tab
   - Look for errors related to employees or attendance

2. **Check the database logs** for permission errors

3. **Verify your user role** - you may need elevated permissions:
   ```sql
   SELECT role, is_active FROM users WHERE id = 'your-user-id';
   ```

4. **Contact your system administrator** with:
   - Your user email
   - The exact error message
   - Your browser console logs
   - This document for reference

