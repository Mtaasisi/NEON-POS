# 📱 SMS Configuration Guide

## What Happened?

Your app tried to send an SMS, but the SMS provider settings aren't configured in the database yet. The error you saw (`{data: null, error: {...}}`) was because the SMS service couldn't find the required configuration.

## ✅ What I Fixed

1. **Better Error Handling** - The app now shows clearer error messages when SMS fails
2. **Improved Logging** - You'll see detailed debug info in the console about what's missing
3. **Helpful Instructions** - The console will tell you exactly how to configure SMS

## 🚀 How to Configure SMS

### Option 1: You Have SMS Provider Credentials

If you have an SMS provider (like Mobishastra, SMS Tanzania, BulkSMS, etc.), follow these steps:

1. **Get your credentials** from your SMS provider:
   - API Key
   - API URL (endpoint for sending SMS)
   - Password (if required)

2. **Open your Neon database console** (https://console.neon.tech)

3. **Run this SQL query** (replace the values with your actual credentials):

```sql
INSERT INTO settings (key, value, description, created_at, updated_at)
VALUES
  ('sms_provider_api_key', 'YOUR_ACTUAL_API_KEY', 'SMS Provider API Key', NOW(), NOW()),
  ('sms_api_url', 'https://your-sms-provider.com/api/send', 'SMS Provider API URL', NOW(), NOW()),
  ('sms_provider_password', 'YOUR_ACTUAL_PASSWORD', 'SMS Provider Password', NOW(), NOW())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
```

4. **Refresh your app** - The SMS service will automatically load the new settings

### Option 2: You Don't Have SMS Provider Yet

If you don't have an SMS provider yet, the app will:
- ✅ Still work normally
- ✅ Log SMS attempts to the database
- ℹ️  Show a warning that SMS isn't configured
- ⚠️  Not actually send SMS messages

**To get SMS working:**
1. Sign up with an SMS provider that serves Tanzania (recommended for your location)
2. Get your API credentials
3. Follow Option 1 above

## 📝 Recommended SMS Providers for Tanzania

1. **Mobishastra** - Popular in East Africa
   - Website: https://www.mobishastra.com
   - Good rates for Tanzania

2. **SMS Tanzania** - Local provider
   - Better local support

3. **BulkSMS** - International provider
   - Reliable but may have higher rates

## 🧪 Testing

After configuration, try sending an SMS from the Customer Detail Modal:
1. Open any customer
2. Click "Send SMS"
3. Type a test message
4. Check the console for success/error messages

## 🗄️ Setting Up Database Tables

If you see warnings about missing SMS tables, run this SQL script:

**File: `setup-sms-tables.sql`** (already created for you!)

This will create:
- `sms_logs` table - Logs all SMS messages
- `customer_communications` table - Tracks all customer communications

Just run this in your Neon database console:

```bash
# Open the file and copy/paste into Neon SQL Editor
cat setup-sms-tables.sql
```

Or run it directly from the Neon console by copying the contents of `setup-sms-tables.sql`.

## 🔍 Checking Current Configuration

Run this SQL to check what's currently configured:

```sql
-- Check SMS settings
SELECT 
  key,
  CASE 
    WHEN value IS NOT NULL AND value != '' THEN '✅ Configured'
    ELSE '❌ Not configured'
  END as status
FROM settings
WHERE key IN ('sms_provider_api_key', 'sms_api_url', 'sms_provider_password');

-- Check if SMS tables exist
SELECT 
    'sms_logs' as table_name,
    CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'sms_logs') 
        THEN '✅ Exists' 
        ELSE '❌ Missing' 
    END as status
UNION ALL
SELECT 
    'customer_communications' as table_name,
    CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'customer_communications') 
        THEN '✅ Exists' 
        ELSE '❌ Missing' 
    END as status;
```

## ❓ Need Help?

If you're seeing errors:
1. Check the browser console (F12) - it will show detailed debug info
2. Make sure your backend server is running (port 8000)
3. Verify the database settings are correct
4. Check that your SMS provider credentials are valid

## 📞 What Works Without SMS?

Even without SMS configured, these features work fine:
- ✅ Customer management
- ✅ Device repairs
- ✅ POS sales
- ✅ Payments
- ✅ Everything except actual SMS sending

SMS is optional - your app works great without it!

