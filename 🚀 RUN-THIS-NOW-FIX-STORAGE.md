# 🚀 QUICK FIX: Storage and Categories Errors

## The Problem
You're seeing these errors in the browser console:
- ❌ `AddProductPage.tsx:318 Error loading data`
- ❌ `StorageLocationForm.tsx:69 Error loading shelves`

## The Solution (Automatic Fix)

### Step 1: Check Your Database URL
First, make sure you have a `.env` file with your Neon database URL:

```bash
# Check if .env exists
ls -la .env
```

If it doesn't exist, create one:

```bash
# Copy the example
cp ".env copy" .env
```

Then edit `.env` and add your database URL:

```env
VITE_DATABASE_URL=your_neon_database_url_here
```

**To get your Neon database URL:**
1. Go to https://console.neon.tech
2. Select your project
3. Click "Connection Details"
4. Copy the connection string (starts with `postgresql://`)

### Step 2: Run the Automatic Fix

```bash
node auto-fix-storage-and-categories.mjs
```

That's it! The script will:
- ✅ Create `lats_categories` table with sample data
- ✅ Create `lats_store_locations` table with sample branches
- ✅ Create `lats_store_rooms` table with storage rooms
- ✅ Create `lats_store_shelves` table with shelves
- ✅ Disable RLS policies that block queries
- ✅ Verify all tables are working

### Step 3: Refresh Your Browser
After the script completes:
1. Go back to your browser
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Navigate to Add Product page
4. ✨ Errors should be gone!

---

## Alternative: Manual Fix (If Auto Fix Doesn't Work)

If the automatic fix fails, run the SQL manually:

1. Open https://console.neon.tech
2. Go to SQL Editor
3. Copy contents of `FIX-STORAGE-AND-CATEGORIES-TABLES.sql`
4. Paste and run it
5. Refresh your browser

---

## What Gets Created

### 📦 Sample Categories (8):
- Laptops
- Phones
- Tablets
- Accessories
- Gaming Consoles
- Smart Watches
- Audio
- Networking

### 🏪 Sample Store Locations (3):
- Main Branch - Dar es Salaam
- Kariakoo Branch
- Mwanza Branch

### 📦 Sample Storage Rooms (3):
- Main Warehouse (Code: A)
- Retail Floor (Code: B)
- Back Office (Code: C)

### 📑 Sample Shelves (8):
- A1, A2, A3
- B1, B2, B3
- C1, C2

---

## Need Help?

If you see any errors after running the script, check:
1. ✅ Database URL is correct in `.env`
2. ✅ You have internet connection
3. ✅ Your Neon database is active (not suspended)

Still having issues? Run this to diagnose:

```bash
node check-users.mjs
```

This will test your database connection.

