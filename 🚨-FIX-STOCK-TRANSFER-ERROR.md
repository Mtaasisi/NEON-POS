# 🚨 FIX: "column 'undefined' does not exist" Error

## 📋 The Problem

You're getting this error when trying to create a stock transfer:
```
❌ Error creating transfer: {message: 'column "undefined" does not exist', code: '42703'}
```

**Root Cause:** The `branch_transfers` table is missing required columns that the code expects to exist.

---

## ✅ The Solution

Follow these steps in order:

### Step 1: Run Diagnostic Script
Run this in your **Neon Database SQL Editor**:
```sql
-- File: 🔍-DIAGNOSE-BRANCH-TRANSFERS.sql
```

This will show you exactly which columns are missing.

### Step 2: Run Fix Script
Run this in your **Neon Database SQL Editor**:
```sql
-- File: 🔧-FIX-BRANCH-TRANSFERS-COLUMNS.sql
```

This will add all missing columns safely without losing data.

### Step 3: Verify the Fix
After running the fix script, you should see:
```
✅ All required columns are present!
```

### Step 4: Test
1. Refresh your browser (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. Try creating a stock transfer again
3. The error should be gone! 🎉

---

## 🔍 What Columns Are Added

The fix script adds these missing columns to `branch_transfers`:

| Column Name | Type | Default | Purpose |
|------------|------|---------|---------|
| `rejection_reason` | TEXT | NULL | Stores why a transfer was rejected |
| `metadata` | JSONB | `{}` | Stores additional transfer metadata |
| `requested_at` | TIMESTAMPTZ | NOW() | When transfer was requested |
| `approved_at` | TIMESTAMPTZ | NULL | When transfer was approved |
| `completed_at` | TIMESTAMPTZ | NULL | When transfer was completed |
| `created_at` | TIMESTAMPTZ | NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOW() | Record update time |

It also adds:
- `reserved_quantity` column to `lats_product_variants` (for stock reservation)
- Timestamp trigger for automatic `updated_at` updates

---

## 🎯 Why This Happened

The original `SETUP-STOCK-TRANSFER-TABLE.sql` created a basic table structure, but the application code (in `stockTransferApi.ts`) expects additional columns that were added later in the `🔧-COMPLETE-STOCK-TRANSFER-FIX.sql` file.

If you only ran the setup script and not the complete fix script, these columns would be missing.

---

## 🛡️ Safety Notes

✅ **Safe to run multiple times** - The fix script checks if columns exist before adding them  
✅ **No data loss** - Only adds new columns, doesn't modify existing data  
✅ **No downtime** - Can be run while the application is running  

---

## 📞 Still Having Issues?

If you still see the error after running the fix:

1. **Check the console output** from the SQL scripts - it will tell you if there were any errors
2. **Verify columns exist** by running this query:
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'branch_transfers'
ORDER BY column_name;
```

3. **Check browser console** for the exact error message and line number

4. **Clear cache** - Sometimes the browser caches old code:
   - Chrome/Edge: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Select "Cached images and files"
   - Click "Clear data"

---

## 📚 Related Files

- `🔍-DIAGNOSE-BRANCH-TRANSFERS.sql` - Check what's missing
- `🔧-FIX-BRANCH-TRANSFERS-COLUMNS.sql` - Fix the missing columns
- `🔧-COMPLETE-STOCK-TRANSFER-FIX.sql` - Complete fix (includes all functions)
- `src/lib/stockTransferApi.ts` - The code that's failing

---

## 🚀 Next Steps After Fix

Once fixed, you can:
1. Create stock transfers between branches
2. Approve/reject transfers
3. Track stock reservations
4. View transfer history
5. Complete transfers with proper inventory updates

---

*Last updated: October 13, 2025*

