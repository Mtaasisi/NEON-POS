# 🔧 Complete Guide to Fix 400 Errors

## What's Happening?

Your app is getting **400 Bad Request** errors when trying to query your Neon database. These errors are coming from:

1. **AuthContext.tsx** - When loading customer data (`fetchAllCustomersSimple`)
2. **UnifiedInventoryPage.tsx** - When loading inventory data (products, categories, suppliers)

## Why Are You Getting 400 Errors?

400 errors from Neon typically happen for these reasons:

1. **❌ RLS (Row Level Security) Policies** - Blocking queries from anonymous/authenticated users
2. **❌ Missing Tables** - Tables don't exist in the database
3. **❌ Missing Columns** - Queries reference columns that don't exist
4. **❌ Malformed SQL** - Invalid SQL syntax
5. **❌ Permission Issues** - User doesn't have permission to query tables

## 🚀 Quick Fix (3 Steps)

### Step 1: Run Diagnostic Script

1. Open your **Neon Database Console**
2. Go to **SQL Editor**
3. Copy and paste **`DIAGNOSE-400-ERRORS.sql`**
4. Click **Run**
5. Look at the output to see what's wrong:
   - ❌ Missing tables
   - ⚠️ RLS enabled
   - ❌ Failed queries
   - ❌ Missing columns

### Step 2: Run the Complete Fix

1. Stay in the **SQL Editor**
2. Copy and paste **`COMPLETE-400-FIX.sql`**
3. Click **Run**
4. Wait for it to complete (should take 5-10 seconds)
5. Look for "🎉 FIX COMPLETE!" message

### Step 3: Refresh Your App

1. Go back to your browser with the POS app
2. **Hard refresh** the page:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. Check the browser console (F12)
4. The 400 errors should be **GONE**! ✅

## What the Fix Does

The `COMPLETE-400-FIX.sql` script:

1. ✅ **Disables RLS** on all LATS and customer tables
2. ✅ **Drops all RLS policies** that might be blocking queries
3. ✅ **Creates missing tables** if they don't exist:
   - `lats_categories`
   - `lats_suppliers`
   - `lats_products`
   - `lats_product_variants`
   - `lats_stock_movements`
   - `lats_sales`
4. ✅ **Adds missing columns** to the `customers` table
5. ✅ **Creates indexes** for better performance
6. ✅ **Grants permissions** to all roles
7. ✅ **Inserts sample data** if tables are empty

## Still Getting Errors?

If you're still seeing 400 errors after running the fix:

### Check 1: Verify Tables Exist

Run this in SQL Editor:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;
```

You should see:
- ✅ customers
- ✅ lats_categories
- ✅ lats_products
- ✅ lats_product_variants
- ✅ lats_sales
- ✅ lats_stock_movements
- ✅ lats_suppliers

### Check 2: Verify RLS is Disabled

Run this in SQL Editor:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;
```

All `rowsecurity` values should be **false** (f).

### Check 3: Test a Simple Query

Run this in SQL Editor:

```sql
SELECT COUNT(*) FROM lats_products;
SELECT COUNT(*) FROM customers;
```

If these work, your database is fixed!

### Check 4: Check Browser Console

1. Open browser console (F12)
2. Go to the **Network** tab
3. Filter by "sql"
4. Look for the failed requests (red, status 400)
5. Click on one and check the **Response** tab
6. You should see the actual error message from Neon

## Common Issues & Solutions

### Issue: "relation lats_products does not exist"

**Solution:** Run `COMPLETE-400-FIX.sql` - it creates all missing tables.

### Issue: "column 'is_active' does not exist"

**Solution:** Run `COMPLETE-400-FIX.sql` - it adds all missing columns.

### Issue: "permission denied for table"

**Solution:** Run this in SQL Editor:

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
```

### Issue: "RLS policy violation"

**Solution:** Run this in SQL Editor:

```sql
ALTER TABLE lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
```

## Understanding the Code Flow

Here's what happens when you load the app:

1. **Login** → `AuthContext.tsx` initializes
2. **Load Background Data** → Calls `fetchAllCustomersSimple()` from `customerApi/core.ts`
3. **Customer Query** → Executes SQL: `SELECT * FROM customers`
4. **❌ 400 Error** if:
   - RLS is enabled and blocking
   - `customers` table doesn't exist
   - Missing columns in query
5. **UnifiedInventoryPage** loads → Calls `loadProducts()`, `loadCategories()`, `loadSuppliers()`
6. **Inventory Queries** → Execute SQL on `lats_*` tables
7. **❌ 400 Error** if:
   - RLS is enabled and blocking
   - `lats_*` tables don't exist
   - Missing columns in query

## Prevention Tips

To avoid 400 errors in the future:

1. **Always disable RLS** during development:
   ```sql
   ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
   ```

2. **Check table structure** before querying:
   ```sql
   \d your_table  -- In psql
   -- OR
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'your_table';
   ```

3. **Test queries in SQL Editor** before using them in code

4. **Use migrations** to manage schema changes

5. **Grant proper permissions** when creating new tables

## Need Help?

If you're still stuck:

1. Run `DIAGNOSE-400-ERRORS.sql` and save the output
2. Check the browser console for specific error messages
3. Check the **Response** tab in the Network panel for the failed 400 request
4. Share the diagnostic output and error messages

## Files in This Fix

- **`DIAGNOSE-400-ERRORS.sql`** - Diagnostic script to find issues
- **`COMPLETE-400-FIX.sql`** - Complete fix for all 400 errors
- **`FIX-400-ERRORS-GUIDE.md`** - This guide

---

🎉 **That's it! Your 400 errors should be completely fixed now!**
