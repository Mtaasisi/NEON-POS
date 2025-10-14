# 🚀 WhatsApp Automatic Setup - Quick Start

## ⚡ Super Quick (Choose One):

### Option 1: NPM Command (Recommended)
```bash
npm run setup:whatsapp
```

### Option 2: Direct Node
```bash
node setup-whatsapp-automatic.mjs
```

### Option 3: Shell Script
```bash
./setup-whatsapp.sh
```

---

## 📋 What Gets Created Automatically:

### ✅ 6 Database Tables:
1. **whatsapp_instances** (with `settings` JSONB column for Green API)
2. **green_api_message_queue** (message sending queue)
3. **green_api_bulk_campaigns** (bulk messaging)
4. **whatsapp_message_templates** (reusable templates)
5. **whatsapp_templates** (Green API templates)
6. **whatsapp_messages** (message history/log)

### ✅ Plus:
- 8 performance indexes
- Auto-update triggers
- Foreign key relationships
- Proper permissions
- **Settings column for Green API integration**

---

## 🎯 After Setup - Use Your WhatsApp:

### 1. Open WhatsApp Chat
```
http://localhost:3000/lats/whatsapp-chat
```

### 2. Add Your Green API Instance
- Click "Add Instance" in Connection Manager
- Enter your Green API credentials:
  - Instance ID
  - API Token
  - Instance Name (optional)

### 3. Configure Green API Settings
- Click the **⚙️ Settings** button in chat header
- Configure 6 tabs:
  - General Settings
  - Webhook Configuration
  - Message Settings
  - Notification Settings
  - Security Settings
  - Status Settings

### 4. Start Messaging! 💬
- Select a customer from the left
- Type and send WhatsApp messages
- All settings auto-save to database

---

## 🔍 Verify Setup:

### Quick Check:
```bash
# Run verification SQL
psql $DATABASE_URL -f VERIFY-WHATSAPP-DATABASE.sql
```

### What to Look For:
- ✅ All 6 tables exist
- ✅ Settings column exists
- ✅ No errors in output

---

## 🆘 Troubleshooting:

### Problem: "Database URL not found"
**Solution:** Check your `.env` file has one of these:
```bash
DATABASE_URL=postgresql://...
# OR
VITE_SUPABASE_URL=https://...
```

### Problem: "Connection refused"
**Solution:** Make sure your database is running and accessible

### Problem: "Permission denied on setup-whatsapp.sh"
**Solution:** 
```bash
chmod +x setup-whatsapp.sh
./setup-whatsapp.sh
```

### Problem: Need to reset everything
**Solution:** Drop tables and re-run:
```sql
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_message_templates CASCADE;
DROP TABLE IF EXISTS whatsapp_templates CASCADE;
DROP TABLE IF EXISTS green_api_bulk_campaigns CASCADE;
DROP TABLE IF EXISTS green_api_message_queue CASCADE;
DROP TABLE IF EXISTS whatsapp_instances CASCADE;
```
Then run: `npm run setup:whatsapp`

---

## 📚 Additional Resources:

### Full Documentation:
- **WHATSAPP-AUTO-SETUP-README.md** - Complete guide
- **VERIFY-WHATSAPP-DATABASE.sql** - Check what exists
- **SETUP-WHATSAPP-COMPLETE.sql** - Manual SQL setup
- **ADD-WHATSAPP-SETTINGS-COLUMN.sql** - Just add settings column

### Scripts:
- **setup-whatsapp-automatic.mjs** - Automatic Node.js setup
- **setup-whatsapp.sh** - Simple bash wrapper

---

## ✨ Features:

### Smart Setup:
- ✅ Checks existing tables before creating
- ✅ Adds missing columns to existing tables
- ✅ Safe to run multiple times
- ✅ Won't duplicate data

### Beautiful Output:
```
============================================================
🚀 AUTOMATIC WHATSAPP DATABASE SETUP
============================================================

✅ Connected to database!
✅ whatsapp_instances table ready
✅ Settings column added
✅ All indexes created
✅ Permissions configured
✅ Triggers created

🎉 SETUP COMPLETE!
```

### Verification:
- Shows existing tables
- Checks settings column
- Displays record counts
- Confirms all steps

---

## 🎊 That's It!

Run the command, wait 10 seconds, and you're ready to use WhatsApp! 

```bash
npm run setup:whatsapp
```

Then go to: **http://localhost:3000/lats/whatsapp-chat** 🚀

---

**Questions?** Check **WHATSAPP-AUTO-SETUP-README.md** for detailed documentation.

