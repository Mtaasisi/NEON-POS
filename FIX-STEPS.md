# Fix 400 Errors - Quick Guide

## Problem
Getting multiple 400 Bad Request errors from Neon database when loading POS settings.

## Solution

### Step 1: Run the SQL Fix
1. Go to [Neon Console](https://console.neon.tech)
2. Select your database
3. Open **SQL Editor**
4. Copy and paste the contents of `QUICK-FIX-400.sql`
5. Click **Run** ▶️

### Step 2: Clear Browser Cache
1. **Hard refresh** your app:
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`

2. Or **restart your dev server**:
   ```bash
   # Stop current server (Ctrl + C)
   # Then restart:
   npm run dev
   ```

### Step 3: Test
1. Refresh your app
2. Login with `admin@pos.com`
3. Check console - 400 errors should be gone! ✅

## What This Fix Does
- Disables RLS (Row Level Security) on POS settings tables
- Creates default settings records for your admin user
- Allows unrestricted access to settings data

## If Still Getting Errors
Run the more comprehensive `diagnose-and-fix-400.sql` which includes:
- Diagnostic queries to identify the exact issue
- More thorough policy cleanup
- Performance indexes

---
*Created: October 7, 2025*

