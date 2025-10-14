# 🔧 How to Fix All 400 Bad Request Errors

## What's Happening?

You're seeing **4 separate 400 Bad Request errors** on page load. These happen because:

1. ❌ **`daily_sales_closures` table is missing** - causing errors when checking if the day is closed
2. ❌ **Column mismatches** - code tries to access columns that don't exist in your database
3. ❌ **`lats_sale_items` table structure issues** - queries fail when fetching sale items
4. ❌ **`users` table might be missing** - errors when loading cashier names

## Quick Fix (5 Minutes)

### Step 1: Open Neon Console
1. Go to https://console.neon.tech
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Fix Script
1. Open the file: `FIX-400-ERRORS-COMPLETE.sql`
2. Copy ALL the contents
3. Paste into Neon SQL Editor
4. Click **Run** button

### Step 3: Check the Results
Look for these success messages in the console:
```
✅ Created daily_sales_closures table
✅ lats_sale_items: EXISTS
✅ lats_sales: EXISTS
🎉 ALL CRITICAL TABLES VERIFIED!
```

### Step 4: Refresh Your Browser
- Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
- Or clear your browser cache
- The 400 errors should be gone!

## What We Already Fixed

✅ **Stock movements issue** - Changed `type` to `movement_type` in:
- `saleProcessingService.ts`
- `inventoryService.ts`
- `inventory.ts` (TypeScript interface)
- `ProductExcelExport.tsx`

## What This New Script Fixes

✅ **Daily sales closures** - Creates the missing table
✅ **Sale items structure** - Verifies/creates table with correct columns
✅ **Users table** - Creates if missing (for cashier names)
✅ **All column mismatches** - Adds any missing columns to `lats_sales`

## If You Still See Errors

### Check Console for Specific Error Messages
Look for any error that mentions:
- "column does not exist"
- "relation does not exist"
- "invalid input syntax"

### Run This Query to See What's Actually Wrong
```sql
-- Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('lats_sales', 'lats_sale_items', 'daily_sales_closures', 'users')
ORDER BY table_name;

-- Check columns in lats_sales
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lats_sales'
ORDER BY column_name;
```

## Need Help?

If errors persist:
1. Copy the exact error message from browser console
2. Run the verification query above
3. Share both with me and I'll help debug further

## Alternative: Command Line Fix

If you prefer using `psql`:

```bash
psql "YOUR_NEON_CONNECTION_STRING" -f FIX-400-ERRORS-COMPLETE.sql
```

Replace `YOUR_NEON_CONNECTION_STRING` with your actual connection string from Neon dashboard.

