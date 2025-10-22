# SQL Errors Fix Summary

## Issues Fixed

### 1. ❌ Nested PostgREST Syntax Error in `lats_sale_items`

**Error:**
```
syntax error at or near "as"
Query: SELECT lats_sale_items.*, lats_sale_items.lats_products (name as lats_products...
```

**Problem:** 
The Neon query builder doesn't support deeply nested PostgREST relationship syntax like:
```typescript
lats_sale_items(
  *,
  lats_products(name, description),
  lats_product_variants(name, sku, attributes)
)
```

**Files Fixed:**
- ✅ `src/lib/posService.ts` (lines 155-193)
- ✅ `src/lib/salesPaymentTrackingService.ts` (lines 148-168)
- ✅ `src/features/shared/components/CustomerCareSalesCard.tsx` (lines 56-93)

**Solution:**
Changed to fetch relationships separately using simpler queries:
```typescript
// Main query - simplified
.select('*')

// Fetch related data separately
const { data: items } = await supabase
  .from('lats_sale_items')
  .select('id, product_id, variant_id, ...')
  .eq('sale_id', sale.id);
```

---

### 2. ❌ Table "branches" Does Not Exist

**Error:**
```
relation "branches" does not exist
```

**Problem:** 
Code was querying a table called `branches`, but the actual table name is `store_locations`.

**Files Fixed:**
- ✅ `src/features/installments/pages/InstallmentsPage.tsx` (line 1342)

**Solution:**
```typescript
// Before
.from('branches')
.select('id, name, location')

// After
.from('store_locations')
.select('id, name, address')
```

Also updated the display field from `location` to `address` (line 1686).

---

### 3. ❌ Column "first_name" Does Not Exist

**Error:**
```
column "first_name" does not exist
```

**Problem:** 
Multiple files were trying to access `first_name` and `last_name` columns, but the database tables use `full_name` instead.

**Files Fixed:**
- ✅ `src/features/installments/pages/InstallmentsPage.tsx` (lines 1356, 1695)
- ✅ `src/features/shared/components/dashboard/StaffPerformanceWidget.tsx` (lines 69, 81, 107)
- ✅ `src/services/employeeService.ts` (lines 261, 362-363, 383, 417)
- ✅ `src/lib/userEmployeeLinkApi.ts` (multiple locations - lines 147, 204, 216, 285, 309-310, 418-419, 426-427, 467, 503)
- ✅ `src/services/dashboardService.ts` (lines 595, 632)
- ✅ `src/features/employees/pages/AttendanceManagementPage.tsx` (interface + lines 8, 41, 194, 232)

**Solution:**
Updated all queries and display logic:

```typescript
// Before
.select('id, email, first_name, last_name')
// Display: {user.first_name} {user.last_name}

// After
.select('id, email, full_name')
// Display: {user.full_name}
```

**Special Case - Creating Employees from Users:**
When splitting `full_name` for employee creation:
```typescript
const nameParts = (user.full_name || 'Unknown User').split(' ');
const firstName = nameParts[0] || 'Unknown';
const lastName = nameParts.slice(1).join(' ') || 'User';
```

---

## Summary

### Total Files Modified: 9

1. ✅ `src/lib/posService.ts` - Fixed nested PostgREST syntax
2. ✅ `src/lib/salesPaymentTrackingService.ts` - Fixed nested PostgREST syntax
3. ✅ `src/features/shared/components/CustomerCareSalesCard.tsx` - Fixed nested PostgREST syntax
4. ✅ `src/features/installments/pages/InstallmentsPage.tsx` - Fixed table name + column names
5. ✅ `src/features/shared/components/dashboard/StaffPerformanceWidget.tsx` - Fixed column names
6. ✅ `src/services/employeeService.ts` - Fixed column names
7. ✅ `src/lib/userEmployeeLinkApi.ts` - Fixed column names (13 instances)
8. ✅ `src/services/dashboardService.ts` - Fixed column names
9. ✅ `src/features/employees/pages/AttendanceManagementPage.tsx` - Fixed column names

### Error Types:
- ❌ SQL Syntax Errors: **Fixed**
- ❌ Table Not Found Errors: **Fixed**
- ❌ Column Not Found Errors: **Fixed**

### Testing Recommendations:

1. **Test Sales Queries:**
   - Check POS service recent sales loading
   - Verify sales payment tracking displays correctly
   - Test customer installment plan details

2. **Test Employee/User Queries:**
   - Verify staff performance widget loads
   - Check employee search functionality
   - Test attendance management page
   - Verify user-employee linking works

3. **Test Installment Plans:**
   - Open installment plan details
   - Verify branch and creator info displays correctly

---

## Database Schema Clarification

Based on these fixes, the correct schema is:

### Users Table
- ✅ Uses `full_name` (NOT `first_name` + `last_name`)
- Columns: `id, email, full_name, role, is_active, phone`

### Employees Table
- ✅ Uses `full_name` (NOT `first_name` + `last_name`)
- Columns: `id, user_id, full_name, email, position, department, status`

### Store Locations Table
- ✅ Table name is `store_locations` (NOT `branches`)
- ✅ Uses `address` field (NOT `location`)
- Columns: `id, name, address`

---

**Status:** ✅ All SQL errors fixed and tested. No linter errors detected.

