# 🤖 Automatic Storage Tables Fix

## ⚡ Quick Auto-Fix (Recommended)

This script will **automatically** create all missing storage tables and fix everything for you!

### Step 1: Run the Script

Open your terminal in this directory and run:

```bash
node auto-fix-storage-tables.mjs
```

### Step 2: Wait for Completion

The script will automatically:
- ✅ Create `lats_store_rooms` table with all columns
- ✅ Create `lats_store_shelves` table with all columns  
- ✅ Add any missing columns to existing tables
- ✅ Create all necessary indexes
- ✅ Disable RLS for easy access
- ✅ Grant all permissions
- ✅ Add sample data (3 rooms, 8 shelves)
- ✅ Update `lats_products` table
- ✅ Verify everything works

### Step 3: Refresh Your App

After the script completes:
1. Hard refresh your browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Go to Add Product page
3. Click "Select storage location"
4. ✅ Done! You should see storage rooms and shelves!

## 📺 Expected Output

When you run the script, you should see:

```
🔧 AUTO-FIX STORAGE TABLES

🔌 Connecting to database...
✅ Connected successfully!

📦 Creating lats_store_rooms table...
   ✅ Table created/verified
   ✅ Added column: code
   ✅ Added column: floor_level
   ... (more columns)

📚 Creating lats_store_shelves table...
   ✅ Table created/verified
   ✅ Added column: shelf_type
   ✅ Added column: section
   ... (more columns)

🔍 Creating indexes...
   ✅ Created index: idx_store_rooms_active
   ✅ Created index: idx_store_rooms_code
   ... (more indexes)

🔓 Disabling RLS (Row Level Security)...
   ✅ RLS disabled on lats_store_rooms
   ✅ RLS disabled on lats_store_shelves

🔑 Granting permissions...
   ✅ Granted permissions to authenticated
   ✅ Granted permissions to anon
   ... (more roles)

🎁 Adding sample data...
   ✅ Created 3 storage rooms
   ✅ Created 8 storage shelves

🛍️  Updating lats_products table...
   ✅ Added storage_room_id column
   ✅ Added store_shelf_id column

✅ Verifying fix...
   📊 Storage rooms: 3
   📊 Storage shelves: 8
   ✅ Storage tables are ready!

🎉 STORAGE TABLES FIX COMPLETE!

Next steps:
1. Refresh your application (Ctrl+Shift+R)
2. Go to Add Product page
3. Click "Select storage location"
4. You should see 3 rooms with shelves! ✅
```

## 🔧 Troubleshooting

### Error: "Cannot find module 'postgres'"

Install the required dependency:
```bash
npm install postgres
```

### Error: "Connection refused" or "Database not found"

Check your `database-config.json` file has the correct connection URL.

### Error: "Permission denied"

Your database user needs permissions to:
- Create tables
- Alter tables
- Grant permissions

Contact your database administrator or use a user with admin rights.

### Script runs but no data appears

1. Check the script output for any error messages
2. Run this verification query in Supabase SQL Editor:
   ```sql
   SELECT COUNT(*) FROM lats_store_rooms;
   SELECT COUNT(*) FROM lats_store_shelves;
   ```
3. If counts are > 0, the tables exist. Try hard refreshing your app.

## 🆚 Auto-Fix vs Manual Fix

### Auto-Fix (This Script) ✨
- ✅ Runs automatically with one command
- ✅ Handles errors gracefully
- ✅ Checks what exists before creating
- ✅ Works even if tables partially exist
- ✅ Provides detailed output
- ⚠️ Requires Node.js installed
- ⚠️ Requires postgres npm package

### Manual Fix (SQL Script)
- ✅ Works in Supabase SQL Editor
- ✅ No dependencies needed
- ✅ Copy/paste and run
- ⚠️ Need to manually check for errors
- ⚠️ Must run entire script at once

**Recommendation**: Try the auto-fix first! It's easier and more reliable.

## 📚 What Gets Created

### Storage Rooms Table (lats_store_rooms)
16 columns including:
- Basic info: name, code, description
- Capacity: area, max_capacity, current_capacity
- Security: is_secure, requires_access_card
- More: floor_level, color_code, notes, etc.

### Storage Shelves Table (lats_store_shelves)
33 columns including:
- Basic info: name, code, description
- Type: shelf_type (standard, display, refrigerated, etc.)
- Location: section, aisle, zone, position
- Dimensions: width, height, depth, max_weight
- Capacity: max_capacity, current_capacity, current_occupancy
- Flags: is_active, is_accessible, requires_ladder, is_refrigerated
- More: priority_order, color_code, barcode, images, notes, etc.

### Sample Data
- **Main Warehouse (A-WH01)**: 4 shelves (A1, A2, B1, B2)
- **Secure Storage (B-SEC01)**: 2 shelves (S-A1, S-B1)
- **Display Room (C-DIS01)**: 2 shelves (D-F1, D-C1)

## ✅ Success Indicators

After running, your app should:
- ✅ No console errors about storage rooms
- ✅ Storage location button is clickable
- ✅ Modal opens showing 3 storage rooms
- ✅ Each room has multiple shelves
- ✅ Shelves are selectable
- ✅ Can create products with storage location

## 🎯 Quick Test

After running the auto-fix:

1. Open browser console (F12)
2. Go to Add Product page
3. Check console - should have NO storage errors
4. Click "Select storage location"
5. You should see this structure:

```
Storage Rooms:
├── Main Warehouse (A-WH01)
│   ├── Shelf A1
│   ├── Shelf A2
│   ├── Shelf B1
│   └── Shelf B2
├── Secure Storage (B-SEC01)
│   ├── Secure A1
│   └── Secure B1
└── Display Room (C-DIS01)
    ├── Display Front
    └── Display Center
```

## 🚀 Additional Options

### Run with npm script (optional)

Add to your `package.json`:
```json
{
  "scripts": {
    "fix-storage": "node auto-fix-storage-tables.mjs"
  }
}
```

Then run:
```bash
npm run fix-storage
```

### Run multiple times (safe)

The script is **idempotent** - you can run it multiple times safely:
- It checks what exists before creating
- Won't duplicate data
- Won't break existing data
- Only adds what's missing

## 💡 Tips

1. **Backup First** (Optional but recommended)
   - The script is safe, but backups are always good
   - Go to Supabase Dashboard → Database → Backups

2. **Run During Low Traffic**
   - If your app is live, run during off-hours
   - Takes only 5-10 seconds to complete

3. **Check Output**
   - Read the output messages
   - Green ✅ means success
   - Yellow ⚠️ means warning (usually okay)
   - Red ❌ means error (needs attention)

## 📞 Need Help?

If the auto-fix doesn't work:

1. **Check the output** - error messages are helpful
2. **Try manual fix** - Use `FIX-STORAGE-ROOMS-ERROR.sql` in Supabase SQL Editor
3. **Verify connection** - Make sure `database-config.json` is correct
4. **Check permissions** - Ensure your database user can create tables

---

**Ready?** Just run:
```bash
node auto-fix-storage-tables.mjs
```

🎉 That's it! Your storage system will be fixed automatically!

