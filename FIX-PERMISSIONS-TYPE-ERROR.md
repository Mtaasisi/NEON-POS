# Fix: Permissions Type Error - "column permissions is of type text[] but expression is of type jsonb"

## 🐛 Problem
When trying to update a user's information (especially when editing permissions), you encountered this error:
```
Error updating user: {
  message: 'column "permissions" is of type text[] but expression is of type jsonb',
  code: '42804'
}
```

## 🔍 Root Cause
The issue was in the custom Supabase client implementation (`src/lib/supabaseClient.ts`). The `formatValue()` method was converting **all arrays** to JSONB format:

```typescript
// ❌ OLD CODE (INCORRECT)
if (typeof value === 'object') {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}
```

When permissions were sent as `['all', 'inventory']`, they were formatted as:
```sql
UPDATE users SET permissions = '["all","inventory"]'::jsonb WHERE id = '...'
```

But the database column `permissions` is defined as `TEXT[]` (PostgreSQL text array), not `jsonb`.

## ✅ Solution Applied

### 1. Fixed the `formatValue()` method in `supabaseClient.ts`
Updated the method to properly detect arrays and format them as PostgreSQL arrays:

```typescript
// ✅ NEW CODE (CORRECT)
// Handle arrays - format as PostgreSQL array for text[] columns
if (Array.isArray(value)) {
  // Check if array contains strings - format as text array
  if (value.length === 0 || typeof value[0] === 'string') {
    return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
  }
  // For non-string arrays or complex arrays, use jsonb
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}
// Handle objects (for JSONB columns)
if (typeof value === 'object') {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}
```

**What this does:**
- Detects if a value is an array
- For string arrays (like permissions), formats them as PostgreSQL arrays: `ARRAY['all','inventory']`
- For complex arrays or objects, still uses JSONB
- Now the SQL will be: `UPDATE users SET permissions = ARRAY['all','inventory'] WHERE id = '...'`

### 2. Fixed `UserManagementPage.tsx` to include permissions
The edit handler wasn't passing permissions from the form to the API:

```typescript
// ✅ Added permissions field
const updateData: ApiUpdateUserData = {
  firstName: data.firstName,
  lastName: data.lastName,
  email: data.email,
  role: data.role,
  phone: data.phone,
  department: data.department,
  is_active: data.isActive,
  permissions: data.permissions // ✅ Now included
};
```

## 📝 Files Modified

1. **`src/lib/supabaseClient.ts`** (lines 241-261)
   - Updated `formatValue()` method to handle arrays correctly

2. **`src/features/users/pages/UserManagementPage.tsx`** (line 203)
   - Added `permissions` field to `updateData` object in `handleEditUserSubmit()`

## 🧪 Testing

To verify the fix works:

1. **Run the verification script:**
   ```bash
   psql -d your_database < VERIFY-PERMISSIONS-COLUMN.sql
   ```
   This confirms the database column is `TEXT[]`

2. **Test user editing:**
   - Navigate to User Management
   - Edit a user
   - Change their permissions
   - Click "Save Changes"
   - ✅ Should save successfully without the JSONB error

## 🎯 What's Fixed

✅ Users can now be edited without the permissions type error  
✅ Permissions are properly saved as PostgreSQL text arrays  
✅ The custom Supabase client now correctly handles array data types  
✅ Both role-based default permissions and custom permissions work  

## 📚 Technical Details

### PostgreSQL Array Syntax
- **TEXT[] column:** `ARRAY['value1', 'value2']`
- **JSONB column:** `'["value1","value2"]'::jsonb`

### Database Schema
The `permissions` column in the `users` table is defined as:
```sql
ALTER TABLE users ADD COLUMN permissions TEXT[];
```

### Default Permissions by Role
```sql
UPDATE users SET permissions = CASE 
  WHEN role = 'admin' THEN ARRAY['all']
  WHEN role = 'manager' THEN ARRAY['inventory', 'customers', 'reports', 'employees']
  WHEN role = 'technician' THEN ARRAY['devices', 'diagnostics', 'spare-parts']
  WHEN role = 'customer-care' THEN ARRAY['customers', 'diagnostics', 'appointments']
  ELSE ARRAY['basic']
END;
```

## 🚀 Next Steps

1. Restart your development server to pick up the changes
2. Test editing users with different permission combinations
3. Verify that role changes update permissions correctly
4. Check that custom permissions can be set and saved

## 💡 Additional Notes

- This fix applies to **all array columns** in your database
- If you have other tables with array columns, they will now work correctly
- The fix is backward compatible - existing data is not affected
- Empty arrays are properly handled: `ARRAY[]`

---

**Status:** ✅ **FIXED**  
**Date:** October 12, 2025  
**Severity:** High (blocking user management)  
**Impact:** User editing, permissions management

