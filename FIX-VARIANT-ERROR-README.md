# 🔧 Fix: Product Variant Schema Errors

## 🐛 Issues
When creating a product, you're getting these errors:
```
1. column "weight" of relation "lats_product_variants" does not exist
2. null value in column "variant_name" violates not-null constraint
```

## 🔍 Root Cause
Your `lats_product_variants` table has column name mismatches and missing columns:
- **Missing columns**: `weight` (DECIMAL), `dimensions` (JSONB)
- **Wrong column names**: Database has `variant_name` but code expects `name`
- **Possible mismatch**: `variant_attributes` vs `attributes`

The code expects standardized column names that don't match your current database schema.

## ✅ Solution

### ⭐ **RECOMMENDED: Complete Fix (Run This!)**

**Run `FIX-ALL-VARIANT-COLUMNS.sql` in your Neon SQL Editor**

This comprehensive script will:
1. ✅ Rename `variant_name` → `name`
2. ✅ Rename `variant_attributes` → `attributes` (if needed)
3. ✅ Add missing `weight` column
4. ✅ Add missing `dimensions` column
5. ✅ Add missing `barcode` column
6. ✅ Ensure price columns are properly set up
7. ✅ Sync data between price columns

**Steps:**
1. Go to https://console.neon.tech
2. Select your project
3. Open the SQL Editor
4. Copy and paste the entire contents of `FIX-ALL-VARIANT-COLUMNS.sql`
5. Click "Run"
6. Wait for success messages

### Alternative: Individual Fixes

If you prefer to run fixes one at a time:

#### Fix 1: Column Names
```bash
psql [connection-string] -f FIX-VARIANT-NAME-COLUMN.sql
```

#### Fix 2: Missing Columns
```bash
psql [connection-string] -f FIX-VARIANT-WEIGHT-DIMENSIONS.sql
```

#### Fix 3: Complete Schema
```bash
psql [connection-string] -f FIX-VARIANT-SCHEMA-COMPLETE.sql
```

## 🧪 Verify the Fix

After running the fix, verify all columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;
```

**Expected columns:**
- ✅ `id` (UUID)
- ✅ `product_id` (UUID)
- ✅ `name` (TEXT) - **NOT** `variant_name`
- ✅ `sku` (TEXT)
- ✅ `barcode` (TEXT)
- ✅ `cost_price` (NUMERIC)
- ✅ `unit_price` (NUMERIC)
- ✅ `selling_price` (NUMERIC)
- ✅ `quantity` (INTEGER)
- ✅ `min_quantity` (INTEGER)
- ✅ `attributes` (JSONB) - **NOT** `variant_attributes`
- ✅ `weight` (DECIMAL)
- ✅ `dimensions` (JSONB)

## 🚀 After Fixing

1. Refresh your application
2. Try creating a product again
3. The error should be gone!

## 📝 What This Does

The fix adds two optional columns to your `lats_product_variants` table:
- **weight**: Stores the physical weight of a product variant (decimal value)
- **dimensions**: Stores dimensions as JSON (e.g., `{"length": 10, "width": 5, "height": 3}`)

Both columns are nullable, so existing data won't be affected.

## ❓ Why Did This Happen?

Your database schema was created with an older version that used different column names:
- Old: `variant_name` → New: `name`
- Old: `variant_attributes` → New: `attributes`

Additionally, newer features (weight tracking, dimensions) weren't in the original schema. The application code expects the new standardized names and columns, causing these mismatches.

## 📊 Error Details

### Error 1: Missing Column
```
column "weight" of relation "lats_product_variants" does not exist
```
**Cause:** Code tries to insert `weight` value, but column doesn't exist in database.

### Error 2: NOT NULL Constraint
```
null value in column "variant_name" violates not-null constraint
```
**Cause:** Code sends `name` field, but database expects `variant_name` (which is set as NOT NULL).

## 🎯 Related Files
- **Error sources:**
  - `src/features/lats/lib/variantUtils.ts` (lines 59-60)
  - `src/features/lats/pages/AddProductPage.tsx` (lines 756-768)
  
- **SQL fix files:**
  - ⭐ **`FIX-ALL-VARIANT-COLUMNS.sql`** (comprehensive - run this!)
  - `FIX-VARIANT-NAME-COLUMN.sql` (column name fix only)
  - `FIX-VARIANT-WEIGHT-DIMENSIONS.sql` (missing columns only)
  - `FIX-VARIANT-SCHEMA-COMPLETE.sql` (detailed diagnostics)

