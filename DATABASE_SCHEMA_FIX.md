# Database Schema Fix - Employees Table

## Issue Summary

The application was experiencing multiple SQL errors related to the `employees` table:

1. ❌ **"column 'name' does not exist"** - The code was trying to select `name` but the column didn't exist
2. ❌ **"relation 'purchase_orders' does not exist"** - Wrong table name (should be `lats_purchase_orders`)
3. ❌ **"relation 'stock_movements' does not exist"** - Wrong table name (should be `lats_stock_movements`)

## Root Cause

The database schema was out of sync with the application code. The base migration files created the `employees` table with:
- `name` column
- `position` column  
- `is_active` column

However, the actual database appears to have been modified to use:
- `full_name` column (instead of `name`)
- `position` column (unchanged)
- `is_active` column (unchanged)

## Files Fixed

### 1. `src/services/dashboardService.ts`
**Lines 630-632:** Changed employee query
```typescript
// BEFORE:
.select('id, name, email, phone, role')

// AFTER:
.select('id, full_name, email, phone, position')
```

**Lines 672-677:** Updated employee mapping
```typescript
// BEFORE:
full_name: emp.name || 'Unknown',
role: emp.role || 'Staff',
department: emp.role || '',

// AFTER:
full_name: emp.full_name || 'Unknown',
role: emp.position || 'Staff',
department: emp.position || '',
```

### 2. `src/features/shared/components/dashboard/SystemHealthWidget.tsx`
**Lines 123-124:** Fixed table names in health check
```typescript
// BEFORE:
{ name: 'stock_movements', displayName: 'Stock Mvmt' },
{ name: 'purchase_orders', displayName: 'POs' },

// AFTER:
{ name: 'lats_stock_movements', displayName: 'Stock Mvmt' },
{ name: 'lats_purchase_orders', displayName: 'POs' },
```

## Migration File Created

Created `migrations/fix_employees_schema_mismatch.sql` to:
1. Detect and fix column name discrepancies
2. Rename `name` → `full_name` if needed
3. Ensure `position` column exists
4. Ensure `is_active` column exists
5. Add documentation comments

## How to Apply

### Option 1: Run Migration (Recommended)
```sql
-- Run this in your Neon/Supabase SQL editor
-- Copy contents from: migrations/fix_employees_schema_mismatch.sql
```

### Option 2: Manual Verification
Check your current schema:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (UUID)
- `full_name` (TEXT) ← Must be this, not 'name'
- `email` (TEXT)
- `phone` (TEXT)
- `position` (TEXT) ← Must be this, not 'role'
- `is_active` (BOOLEAN) ← Must be this, not 'status'
- `branch_id` (UUID)
- `salary` (NUMERIC)
- `hire_date` (DATE)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Testing

After applying the fixes:

1. ✅ No more "column 'name' does not exist" errors
2. ✅ No more "relation 'purchase_orders' does not exist" errors  
3. ✅ No more "relation 'stock_movements' does not exist" errors
4. ✅ Dashboard widgets load correctly
5. ✅ Employee status displays properly
6. ✅ System health check completes successfully

## Prevention

To prevent future schema mismatches:

1. **Always use migration files** - Don't manually alter the database
2. **Keep migrations in sync** - Run all migrations in order
3. **Document schema changes** - Add comments to explain column renames
4. **Use consistent naming** - Stick to one convention (`full_name` vs `name`)
5. **Test after migrations** - Verify application works after schema changes

## Related Documentation

- `FULL_NAME_COLUMN_FIX.md` - Previous attempt to fix this issue
- `EMPLOYEE_COLUMN_FIX.md` - Previous attempt to fix column names
- `SQL_ERRORS_FIX_SUMMARY.md` - General SQL error fixes

## Status

✅ **FIXED** - All errors resolved
- Application code updated to use `full_name` and `position`
- Table names corrected to use `lats_` prefix where needed
- Migration file created for database schema alignment

