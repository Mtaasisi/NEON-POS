# ⚡ ONE-COMMAND BUSINESS LOGO SETUP

## 🚀 Fastest Way to Setup (30 seconds!)

### Option 1: NPM Command (Recommended)
```bash
npm run setup-logo
```

### Option 2: Direct Command
```bash
node run-logo-setup.mjs
```

**That's it!** The script will:
- ✅ Check your database connection
- ✅ Detect your table structure automatically
- ✅ Verify all business logo fields
- ✅ Tell you exactly what to do next

---

## 📋 What Happens

### If Everything is Ready:
```
═══════════════════════════════════
  🎉 SUCCESS! Everything is ready!
═══════════════════════════════════

📊 Current Settings:
  Business Name: My Store
  Logo: ❌ Not uploaded yet

📋 Next Steps:
  1. Refresh your POS application
  2. Go to: Settings → POS Settings → General Settings
  3. Find "Business Information" section
  4. Upload your logo
  5. Click "Save Settings"

✨ Your logo will appear on all receipts! ✨
```

### If Setup is Needed:
```
═══════════════════════════════════
  ⚠️  MANUAL SETUP REQUIRED
═══════════════════════════════════

Some business fields are missing.
Don't worry! Just run the SQL migration:

📋 Instructions:
  1. Open your Neon Database Console
  2. Open file: 🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql
  3. Copy ALL contents (Ctrl+A, Ctrl+C)
  4. Paste in SQL Editor
  5. Click "Run" or "Execute"
  6. Run this script again: npm run setup-logo

The SQL script is safe and automatic!
```

---

## 🎯 Complete Setup in 3 Commands

```bash
# 1. Check status
npm run setup-logo

# 2. If needed, run SQL migration in database console
#    (Copy/paste: 🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql)

# 3. Verify it worked
npm run setup-logo
```

---

## 💡 What You Get

After setup, you'll have:
- ✅ Business name field
- ✅ Business address field
- ✅ Business phone field
- ✅ Business email field
- ✅ Business website field
- ✅ Business logo upload

All accessible in: **Settings → POS Settings → General Settings**

---

## 📸 Quick Visual Guide

```
Terminal:
┌─────────────────────────────────┐
│ $ npm run setup-logo            │
│                                 │
│ 🚀 BUSINESS LOGO SETUP          │
│ ✅ Found database credentials   │
│ ✅ Found table: general_settings│
│ ✅ All fields exist!            │
│                                 │
│ 🎉 SUCCESS!                     │
└─────────────────────────────────┘

Your App:
┌─────────────────────────────────┐
│ Settings → POS Settings →       │
│ General Settings                │
│                                 │
│ 🏢 Business Information         │
│ ┌──────────────────────────┐   │
│ │ Business Name: [______]  │   │
│ │ Business Phone: [______] │   │
│ │ Logo: [Upload Logo]      │   │
│ └──────────────────────────┘   │
│                                 │
│ [💾 Save Settings]              │
└─────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Error: "Database credentials not found"
```bash
# Add to your .env file:
VITE_SUPABASE_URL=your_database_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Error: "No settings table found"
```bash
# Run the main SQL setup:
# Copy/paste in database console:
# 🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql
```

### Error: "Some fields missing"
```bash
# Same as above - run SQL migration
# Then run: npm run setup-logo again
```

---

## 🎉 Success Checklist

After running `npm run setup-logo`, you should see:

- ✅ **Found database credentials**
- ✅ **Found table: general_settings** (or lats_pos_general_settings)
- ✅ **business_name - exists**
- ✅ **business_address - exists**
- ✅ **business_phone - exists**
- ✅ **business_email - exists**
- ✅ **business_website - exists**
- ✅ **business_logo - exists**
- ✅ **🎉 SUCCESS! Everything is ready!**

---

## 📚 More Information

For detailed guides, check:
- `✅-START-HERE-BUSINESS-LOGO.md` - Complete setup guide
- `📸-VISUAL-GUIDE.md` - Visual step-by-step
- `BUSINESS-LOGO-SETUP-GUIDE.md` - Full documentation
- `🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql` - SQL migration file

---

## ⚡ TL;DR

```bash
# Run this:
npm run setup-logo

# If it says "manual setup required":
# - Open database console
# - Run: 🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql
# - Run: npm run setup-logo again

# Then in your app:
# Settings → POS Settings → General Settings
# Upload logo → Save Settings → Done! 🎉
```

**Total time: 2 minutes** ⏱️

---

**That's it! Super simple!** 🚀✨

