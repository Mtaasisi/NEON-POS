# ✅ EASIEST WAY - Just Use Your App!

## No SQL Required! 🎉

Your app will **automatically create** the database settings when you save them!

### Steps:

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Login as Admin**

3. **Go to Settings:**
   - Click **Admin** in the sidebar
   - Click **Settings**
   - Click **Attendance** tab

4. **Configure Security:**
   - You'll see the new "Security Mode Configuration" section
   - Toggle **"Allow Employee Choice"** ON or OFF
   - If ON: Check which security modes to enable
   - Select your default mode
   - Click **"Save Settings"**

5. **Done!** ✅
   - Settings are automatically saved to database
   - Table is auto-created if it doesn't exist
   - Everything just works!

---

## How to Verify It Worked

### Check in Browser Console:
After clicking "Save Settings", you should see:
```
✅ Attendance settings saved successfully
```

### Check in Neon Dashboard:
Go to your Neon SQL Editor and run:
```sql
SELECT * FROM settings WHERE key = 'attendance';
```

You should see your configuration saved as JSON!

---

## What If Settings Table Doesn't Exist?

**Don't worry!** The app uses `upsert` which will create the table if needed.

But if you want to manually create it first, run this in Neon SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
```

Then use the app normally!

---

## 🚀 That's It!

**The simplest way:**
1. Open app → Admin → Settings → Attendance
2. Configure your settings
3. Click Save
4. Done!

No scripts, no SQL, no complexity! Just use the app! 🎉

