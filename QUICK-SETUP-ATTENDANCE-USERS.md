# Quick Setup Guide: Link Users to Attendance

## What Was Fixed
The attendance system now properly fetches real user data from the database using a direct link between users and employees.

## Quick Setup (3 Steps)

### Step 1: Run the SQL Script
Execute this in your Neon database console:

```sql
-- Automatically link users to employees by matching email addresses
UPDATE employees e
SET user_id = u.id, updated_at = NOW()
FROM users u
WHERE LOWER(e.email) = LOWER(u.email)
AND e.user_id IS NULL;
```

### Step 2: Verify the Links
Check which users are now linked:

```sql
SELECT 
    e.first_name || ' ' || e.last_name as employee_name,
    e.email as employee_email,
    u.email as user_email,
    u.role
FROM employees e
INNER JOIN users u ON e.user_id = u.id
ORDER BY e.first_name;
```

### Step 3: Test in the App
1. Log in with a user account
2. Go to the Attendance page
3. Should see: ✅ Employee name, attendance history, check-in/out buttons

## If You See "Employee record not found"

This means the user is not linked to an employee. Fix it by:

### Option A: Link Existing Employee
```sql
UPDATE employees 
SET user_id = 'USER_ID_HERE', updated_at = NOW()
WHERE email = 'employee@company.com';
```

### Option B: Create New Employee for User
Go to Employee Management page → Create New Employee → Fill in the details including the user's email.

## Files Created/Modified

### New Files:
- ✅ `LINK-USERS-TO-EMPLOYEES.sql` - Comprehensive SQL script for linking
- ✅ `ATTENDANCE-REAL-USER-FIX.md` - Detailed documentation
- ✅ `QUICK-SETUP-ATTENDANCE-USERS.md` - This quick guide

### Modified Files:
- ✅ `src/services/employeeService.ts` - Added `getEmployeeByUserId()` method
- ✅ `src/features/employees/pages/EmployeeAttendancePage.tsx` - Uses direct user lookup

## How It Works Now

**Before:** 
```
User logs in → Fetch ALL employees → Filter to find match → Use that employee
```
❌ Slow, inefficient, could fail

**After:**
```
User logs in → Direct database query by user_id → Use that employee
```
✅ Fast, reliable, scalable

## Benefits

✅ **Faster** - Single database query instead of fetch-all-then-filter  
✅ **Reliable** - Proper database relationships  
✅ **Scalable** - Works with thousands of employees  
✅ **Better errors** - Clear messages when user not linked  
✅ **Debuggable** - Added console logging for troubleshooting

## Common Issues

| Issue | Solution |
|-------|----------|
| "Employee record not found" | Run the SQL script in Step 1 |
| User sees wrong employee data | Check user_id in employees table |
| Can't check in/out | Verify employee status is 'active' |
| No attendance history | Check attendance_records table for that employee_id |

## Next Steps

1. ✅ Run Step 1 SQL script to link existing users
2. ✅ Test with a few user accounts
3. ✅ Create employee records for any users who don't have one
4. 🎉 Attendance system now uses real user data!

## Support

If you need help:
1. Check browser console (F12) for `[Attendance]` log messages
2. Run the SQL queries in `LINK-USERS-TO-EMPLOYEES.sql` to diagnose
3. Verify user_id is set in the employees table

