# 🚀 Quick Run - Attendance Verification

## Option 1: Run Verification Script (Recommended)

### Step 1: Create/Update .env file

```bash
# Create .env file if it doesn't exist
touch .env

# Add your Neon database URL
echo "VITE_DATABASE_URL=your_neon_database_url_here" >> .env
```

**Get your database URL from:**
- Neon Dashboard → Your Project → Connection String
- Format: `postgresql://user:password@host/database`

### Step 2: Run the verification

```bash
node run-attendance-verification.mjs
```

This will:
- ✅ Create the `settings` table
- ✅ Insert default attendance configuration
- ✅ Verify everything is working
- ✅ Show you what's configured

---

## Option 2: Manual SQL (If you prefer)

### Open Neon SQL Editor and run:

```sql
-- 1. Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- 2. Insert default attendance settings
INSERT INTO settings (key, value, description)
VALUES (
  'attendance',
  '{
    "enabled": true,
    "allowEmployeeChoice": true,
    "availableSecurityModes": ["auto-location", "manual-location", "wifi-only"],
    "defaultSecurityMode": "auto-location",
    "requireLocation": true,
    "requireWifi": true,
    "allowMobileData": true,
    "gpsAccuracy": 50,
    "checkInRadius": 100,
    "checkInTime": "08:00",
    "checkOutTime": "17:00",
    "gracePeriod": 15,
    "offices": [
      {
        "name": "Arusha Main Office",
        "lat": -3.359178,
        "lng": 36.661366,
        "radius": 100,
        "address": "Main Office, Arusha, Tanzania",
        "networks": [
          {
            "ssid": "Office_WiFi",
            "bssid": "00:11:22:33:44:55",
            "description": "Main office WiFi network"
          }
        ]
      }
    ]
  }',
  'Attendance security mode configuration'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 3. Verify it worked
SELECT 
  key,
  LEFT(value, 100) as value_preview,
  description,
  updated_at
FROM settings
WHERE key = 'attendance';
```

---

## Option 3: Test in Your App (Easiest!)

### Just use the app - it will auto-create settings!

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Go to Admin Settings:**
   - Login as admin
   - Navigate to: **Admin → Settings → Attendance**

3. **Configure security modes:**
   - Toggle "Allow Employee Choice" ON
   - Check the security methods you want
   - Select default mode

4. **Click "Save Settings"**
   - The app will automatically create the settings table
   - Your configuration will be saved to the database
   - No manual SQL needed!

5. **Verify it saved:**
   - Open browser DevTools → Console
   - Look for success message
   - Or check in Neon dashboard: `SELECT * FROM settings WHERE key = 'attendance';`

---

## Troubleshooting

### "DATABASE_URL not found"
**Solution:** Create a `.env` file with your database URL:
```bash
echo "VITE_DATABASE_URL=postgresql://user:password@host/database" > .env
```

### "Table already exists"
**Good!** It means it's already set up. Just continue using the app.

### "Cannot connect to database"
**Solution:** 
1. Check your Neon database is running
2. Verify your connection string is correct
3. Check if your IP is allowlisted in Neon

### "Settings not saving in app"
**Solution:**
1. Open browser DevTools → Network tab
2. Try saving settings again
3. Look for errors in the network requests
4. Check console for error messages

---

## Expected Output

When verification succeeds, you'll see:

```
✅ Settings table: EXISTS
✅ Attendance configuration: READY
✅ New security fields: AVAILABLE

📝 New Security Features:
  ✅ allowEmployeeChoice
  ✅ availableSecurityModes
  ✅ defaultSecurityMode

🚀 Next Steps:
  1. Admin → Settings → Attendance
  2. Configure security modes
  3. Save Settings
  4. Test as employee
```

---

## What Gets Created

### Table: `settings`
```
┌─────────────┬──────────┬─────────────────────────────┐
│ Column      │ Type     │ Description                 │
├─────────────┼──────────┼─────────────────────────────┤
│ id          │ UUID     │ Primary key                 │
│ key         │ TEXT     │ Setting key (e.g., 'attendance') │
│ value       │ TEXT     │ JSON configuration          │
│ description │ TEXT     │ Setting description         │
│ created_at  │ TIMESTAMP│ When created                │
│ updated_at  │ TIMESTAMP│ Last update                 │
└─────────────┴──────────┴─────────────────────────────┘
```

### Row: attendance settings
```json
{
  "key": "attendance",
  "value": {
    "allowEmployeeChoice": true,
    "availableSecurityModes": ["auto-location", "manual-location", "wifi-only"],
    "defaultSecurityMode": "auto-location",
    // ... all other settings
  }
}
```

---

## 🎉 You're Done!

The database is ready. Your attendance security features are fully functional!

**Go test it now:** Admin → Settings → Attendance 🚀

