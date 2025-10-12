# 🔧 Fix Storage Location Errors

## Problem
You're getting these errors when trying to load storage locations:
1. **400 Bad Request** - Database query failing when loading shelves
2. **TypeError: Cannot read properties of undefined (reading 'charAt')** - JavaScript error from missing data

## Root Cause
Your database schema doesn't match what the app expects:
- Table has `room_id` but app expects `storage_room_id`
- Missing required columns like `code`, `store_location_id`, etc.
- RLS policies might be blocking access

## Solution

### Step 1: Run the SQL Fix
1. Open your **Neon Database Dashboard**
2. Go to the **SQL Editor**
3. Open the file: `FIX-STORAGE-SHELVES-SCHEMA.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** or press `Cmd + Enter`

### Step 2: Verify the Fix
The SQL will output messages showing what was fixed. You should see:
- ✅ Renamed room_id to storage_room_id
- ✅ Added missing columns
- ✅ Disabled RLS
- ✅ Storage shelves schema fix complete!

### Step 3: Refresh Your App
1. Go back to your app
2. Press **Cmd + Shift + R** (hard refresh)
3. The storage location selector should now work!

## What Was Fixed

### JavaScript Errors (Already Fixed)
- ✅ Added null checks in `getRoomColor()` function
- ✅ Added null checks in shelf rendering
- ✅ Added safety filters in `getCurrentShelves()`

### Database Schema (Run SQL to Fix)
- ✅ Rename `room_id` to `storage_room_id`
- ✅ Add missing `code` column to both tables
- ✅ Add missing columns: `store_location_id`, `current_capacity`, `floor_level`, etc.
- ✅ Disable RLS policies that cause 400 errors
- ✅ Grant proper permissions

## If You Still Get Errors

### Check if tables exist
Run this in SQL Editor:
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('lats_store_rooms', 'lats_store_shelves');
```

### Check column names
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lats_store_shelves'
ORDER BY ordinal_position;
```

### If tables don't exist
You need to create them first! Run the `CREATE-STORAGE-TABLES-OPTIONAL.sql` file first, then run the fix.

## Need Help?
If you're still seeing errors:
1. Check the browser console for detailed error messages
2. Check the Network tab to see the exact query that's failing
3. Let me know what error you're seeing!

