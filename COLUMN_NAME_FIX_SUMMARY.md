# Column Name Fix - "name" → "full_name" in employees table

## Issue Summary
The application was throwing SQL errors:
```
❌ SQL Error: "column 'name' does not exist"
```

This occurred because several parts of the codebase were still trying to query the `name` column from the `employees` table, but the database schema had been migrated to use `full_name` instead (as documented in previous fixes).

## Root Cause
The `employees` table was migrated from using a `name` column to using a `full_name` column (to match the `users` table schema), but not all code references were updated.

## Files Fixed

### 1. **src/features/shared/components/dashboard/StaffPerformanceWidget.tsx**
**Changes:**
- Line 87: Changed `.select('id, email, name')` → `.select('id, email, full_name')`
- Line 117: Changed `.select('id, email, name')` → `.select('id, email, full_name')`
- Updated comments to reflect the migration

**Note:** The code already had fallback logic that checks both `full_name` and `name`, so the display logic didn't need changes.

### 2. **src/lib/userEmployeeLinkApi.ts**
**Changes:**
- Line 216: Changed `.select('id, email, user_id, name')` → `.select('id, email, user_id, full_name')`
- Line 239: Changed `employee.name` → `employee.full_name` in toast message
- Line 501: Changed `.select('id, email, name, role, is_active')` → `.select('id, email, full_name, position, is_active')`

**Note:** Also fixed `role` → `position` since the employees table uses `position` column.

### 3. **src/features/employees/pages/AttendanceManagementPage.tsx**
**Changes:**
- Line 8: Updated interface: `name: string` → `full_name: string`
- Line 41: Changed `.order('name')` → `.order('full_name')`
- Line 194: Changed `{emp.name}` → `{emp.full_name}`
- Line 232: Changed `{employee.name}` → `{employee.full_name}`

### 4. **src/lib/appointmentService.ts**
**Changes:**
- Line 151: Changed `.select('name')` → `.select('full_name')`
- Line 154: Changed `technician?.name` → `technician?.full_name`
- Line 204: Changed `.select('name')` → `.select('full_name')`
- Line 207: Changed `technician?.name` → `technician?.full_name`

### 5. **src/services/employeeService.ts**
**Changes:**
- Line 261: Changed `.order('name', { ascending: true })` → `.order('full_name', { ascending: true })`
- Line 362: Changed `.or('name.ilike.%${query}%,...)` → `.or('full_name.ilike.%${query}%,...)`
- Line 363: Changed `.order('name', { ascending: true })` → `.order('full_name', { ascending: true })`
- Line 385: Changed `.order('name', { ascending: true })` → `.order('full_name', { ascending: true })`
- Line 419: Changed `.order('name', { ascending: true })` → `.order('full_name', { ascending: true })`

## Database Schema Reference

### employees Table (Current)
```sql
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,  -- ✅ Migrated from 'name'
    email TEXT,
    phone TEXT,
    position TEXT,            -- ✅ NOT 'role'
    salary NUMERIC DEFAULT 0,
    hire_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    user_id UUID,             -- ✅ Links to users table
    branch_id UUID,           -- ✅ Links to store_locations table
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### users Table (For Reference)
```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,  -- ✅ Uses 'full_name' (NOT 'first_name'/'last_name')
    role TEXT DEFAULT 'customer-care',
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    phone TEXT,
    branch_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Testing Checklist

After these fixes, verify:
- ✅ No SQL errors about missing `name` column
- ✅ Staff Performance Widget loads without errors
- ✅ Attendance Management page displays employee names correctly
- ✅ Employee search functionality works
- ✅ Appointment creation with technicians works
- ✅ User-employee linking shows correct names
- ✅ Employee lists are sorted by name correctly

## Prevention

**Key Points to Remember:**
1. The `users` table uses `full_name` (NOT `first_name` + `last_name`)
2. The `employees` table uses `full_name` (NOT `name`) - migrated to match `users` table
3. The `employees` table uses `position` (NOT `role`) - only `users` table has `role`
4. Always check the actual database schema before writing queries
5. Refer to migration files in the `/migrations` directory for schema changes

## Related Documentation
- `SQL_ERRORS_FIX_SUMMARY.md` - Previous SQL error fixes
- `DATABASE_SCHEMA_FIX.md` - Original employees table schema fix
- `FULL_NAME_COLUMN_FIX.md` - Full name column standardization
- `migrations/fix_employees_schema_mismatch.sql` - Migration that renamed `name` to `full_name`

---

**Status:** ✅ All fixes applied successfully
**Linter Status:** ✅ No errors
**Date Fixed:** October 22, 2025

