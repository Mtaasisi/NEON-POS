# How to Fix Admin Settings Errors

## Problem
You're seeing these errors in the browser console:
- ❌ `Error loading templates` from DocumentTemplatesSettings
- ❌ `Error loading settings` from APIWebhooksSettings
- ❌ `Error fetching auto backup settings: column "auto_backup_enabled" does not exist`

## Root Cause
The database is missing these required tables and columns:
- `settings` (general key-value settings table)
- `document_templates` (for invoice/quote templates)
- `api_keys` (for API key management)
- `webhook_endpoints` (for webhook configuration)
- Auto backup columns in `lats_pos_general_settings` table

## Solution

### Step 1: Open Your Neon Database Console
1. Go to https://console.neon.tech/
2. Select your project
3. Click on the **SQL Editor** tab

### Step 2: Run the Fix Script
1. Open the file: `FIX-ADMIN-ERRORS-COMPLETE.sql`
2. Copy ALL the contents
3. Paste into the Neon SQL Editor
4. Click **Run** button

### Step 3: Verify Success
You should see output like:
```
✅ ALL ADMIN SETTINGS FIXES APPLIED SUCCESSFULLY!
====================================================

📦 Tables Created/Verified:
   ✓ settings (X records)
   ✓ store_locations (1 records)
   ✓ api_keys (0 records)
   ✓ webhook_endpoints (0 records)
   ✓ webhook_logs
   ✓ document_templates (0 records)
   ✓ api_request_logs
   ✓ lats_pos_general_settings (auto backup columns added)

🔓 Permissions Granted:
   ✓ RLS disabled on all tables
   ✓ Full access granted to PUBLIC (all users)

🚀 Features Now Available:
   ✓ General settings (key-value store)
   ✓ Multi-store/branch management
   ✓ API key generation & management
   ✓ Webhook endpoints configuration
   ✓ Document template customization
   ✓ Automatic database backup scheduling

✨ Your Admin Settings page errors should now be fixed!
```

### Step 4: Test in Your App
1. **Clear browser cache** (important!)
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Or do a hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. Refresh your application
3. Navigate to **Admin Settings** page
4. The errors should be gone! ✨

## What This Script Does

### Tables Created:
1. **settings** - General key-value configuration store
2. **store_locations** - Multi-store/branch management
3. **api_keys** - API key generation and management
4. **webhook_endpoints** - Webhook configuration
5. **webhook_logs** - Webhook execution history
6. **document_templates** - Custom invoice/quote templates
7. **api_request_logs** - API usage tracking

### Columns Added:
Adds these columns to `lats_pos_general_settings` (if the table exists):
- `auto_backup_enabled` - Enable/disable automatic backups
- `auto_backup_frequency` - Backup frequency (daily/weekly/monthly)
- `auto_backup_time` - Time of day to run backups
- `auto_backup_type` - Type of backup (full/schema-only/data-only)
- `last_auto_backup` - Timestamp of last automatic backup

### Default Data:
- Creates a "Main Store" location
- Sets up default API rate limits

### Permissions:
- Disables Row Level Security (RLS) on all tables
- Grants full access to all authenticated users

## Troubleshooting

### If Errors Persist After Running:
1. **Hard refresh your browser** - Old cached code might still be running
2. **Check browser console** for new/different errors
3. **Verify tables were created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'settings',
     'api_keys',
     'webhook_endpoints',
     'document_templates',
     'store_locations'
   );
   ```
   Should return all 5 tables.

### If You See "Already Exists" Errors:
- That's OK! The script uses `CREATE TABLE IF NOT EXISTS`
- It won't break existing tables
- Just check the completion message at the end

### If You See Permission Errors:
- Make sure you're running the script as the database owner
- The script automatically grants permissions, but you need admin access to do so

## Need More Help?
- Check the browser console for specific error messages
- Verify your Supabase/Neon connection is working
- Ensure you're logged in as an authenticated user

---

**Created:** October 12, 2025  
**Script:** FIX-ADMIN-ERRORS-COMPLETE.sql

