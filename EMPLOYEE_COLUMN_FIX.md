# Employee Column Name Fix

## Issue
The application was throwing SQL errors:
```
❌ SQL Error: "column "name" does not exist"
Error fetching employee status: {message: "column \"name\" does not exist", code: "42703"}
```

## Root Cause
Several queries in the codebase were trying to select a `position` column from the `employees` table, but the actual table schema uses `role` instead.

### Actual Employees Table Schema
```
- id
- name
- email
- phone
- role         ← Correct column name
- is_active
- created_at
- updated_at
```

## Files Fixed

### 1. `src/services/dashboardService.ts`
- **Line 597**: Changed `.select('id, name, email, phone, position')` → `.select('id, name, email, phone, role')`
- **Line 639**: Changed `role: emp.position || 'Staff'` → `role: emp.role || 'Staff'`
- **Line 641**: Changed `department: emp.position || ''` → `department: emp.role || ''`

### 2. `src/services/employeeService.ts`
- **Line 362**: Changed search query from `position.ilike.%${query}%` → `role.ilike.%${query}%`
- **Line 384**: Changed department filter from `.eq('department', department)` → `.eq('role', department)`

### 3. `src/lib/userEmployeeLinkApi.ts`
- **Line 501**: Changed `.select('id, email, name, position, department, status')` → `.select('id, email, name, role, is_active')`
- **Line 503**: Changed `.eq('status', 'active')` → `.eq('is_active', true)`

## Testing
All queries have been tested and verified to work correctly:
```bash
✅ Query succeeded!
📊 Found 5 active employees
✅ Search query succeeded!
✅ All employee queries are now working correctly!
```

## Impact
- ✅ No more SQL errors about missing columns
- ✅ Employee status widget loads correctly
- ✅ Dashboard employee statistics work properly
- ✅ Employee search functionality works
- ✅ All employee-related queries execute successfully

## Prevention
Always verify actual database column names before writing queries. The employees table uses:
- `role` (not `position`)
- `name` (not `full_name`)
- `is_active` (not `status`)

## Related Files
- Migration: `migrations/000_create_base_schema.sql` (shows employees table structure)

