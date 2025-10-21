# Neon 400 Bad Request Error - Fixed ✅

## Problem
Getting intermittent `POST https://api.c-2.us-east-1.aws.neon.tech/sql 400 (Bad Request)` errors in the browser console.

## Root Cause
The `.in()` method in the NeonQueryBuilder was generating invalid SQL when passed an empty array:
```sql
WHERE column_name IN ()  -- Invalid SQL syntax!
```

This caused Neon to return a 400 Bad Request error.

## Solution
Added a guard in the `.in()` method to handle empty arrays properly:

**File**: `src/lib/supabaseClient.ts` (lines 314-323)

```typescript
in(column: string, values: any[]) {
  // Handle empty array case - return a condition that's always false
  if (!values || values.length === 0) {
    this.whereConditions.push('1 = 0');
    return this;
  }
  const formattedValues = values.map(v => this.formatValue(v)).join(', ');
  this.whereConditions.push(`${this.qualifyColumn(column)} IN (${formattedValues})`);
  return this;
}
```

## How It Works
- When the array is empty or null, we add the condition `1 = 0` (always false)
- This ensures no rows match, which is the correct behavior for an empty IN clause
- No 400 errors are generated because we're sending valid SQL

## Impact
- ✅ No more 400 Bad Request errors from empty IN clauses
- ✅ Queries with empty arrays now execute successfully
- ✅ Results are correctly empty when no IDs are provided

## Testing
The fix handles these scenarios:
1. Empty arrays: `[].in('id', [])` → `WHERE 1 = 0`
2. Null values: `.in('id', null)` → `WHERE 1 = 0`
3. Normal arrays: `.in('id', [1, 2, 3])` → `WHERE id IN (1, 2, 3)`

## Related Code Locations
This fix prevents errors in places like:
- `provider.supabase.ts` - lines 691-712 (fetching related data)
- `provider.supabase.ts` - lines 999-1015 (purchase order items)
- Any other location using `.in()` with potentially empty arrays

