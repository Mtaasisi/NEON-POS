# 🔧 Fix for SMS Service 400 Error

## What's the Problem?

Your SMS service is getting **400 Bad Request** errors because it's trying to query a `settings` table that doesn't exist in your database. This is causing the SMS service initialization to fail on app startup.

## Quick Fix (2 minutes)

### Step 1: Run the SQL Fix

1. Open your **Neon Database Console** ([https://console.neon.tech](https://console.neon.tech))
2. Select your database
3. Go to the **SQL Editor**
4. Copy and paste the contents of `FIX-SMS-SETTINGS-TABLE.sql`
5. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`

### Step 2: Refresh Your App

1. In your browser, do a **hard refresh**:
   - **Windows/Linux**: `Ctrl + Shift + R`
   - **Mac**: `Cmd + Shift + R`

### Step 3: Verify the Fix

Open your browser console (F12) and you should see:
- ✅ No more 400 errors
- ✅ `SMS service initialized successfully` or `SMS service not fully configured`

---

## What This Fix Does

1. **Creates** a `settings` table with key-value structure
2. **Inserts** default SMS configuration entries (empty by default)
3. **Disables RLS** so the app can read these settings
4. **Creates indexes** for faster lookups

---

## Configure SMS Later (Optional)

Once the table is created, you can configure your SMS provider by updating the settings:

```sql
-- Update with your actual SMS provider credentials
UPDATE settings SET value = 'your-api-key-here' WHERE key = 'sms_provider_api_key';
UPDATE settings SET value = 'https://your-sms-provider.com/api/send' WHERE key = 'sms_api_url';
UPDATE settings SET value = 'your-password-here' WHERE key = 'sms_provider_password';
```

---

## Why This Happened

Your app has two types of settings:
1. **Structured settings** (like `lats_pos_general_settings`) - used for UI preferences
2. **Key-value settings** (the `settings` table) - used for dynamic configuration like SMS

The SMS service was trying to use the key-value table, but it was never created. Now it exists! 🎉

---

## Need Help?

If you still see errors after running this fix, let me know and I'll help you debug further!

