# 🚀 Automatic WhatsApp Database Setup

## Quick Start

Just run one command to automatically set up all WhatsApp tables:

```bash
node setup-whatsapp-automatic.mjs
```

Or using npm script:

```bash
npm run setup:whatsapp
```

## What It Does

The script **automatically**:

### ✅ Creates 6 Tables:
1. **whatsapp_instances** - Stores WhatsApp connection instances (with `settings` column)
2. **green_api_message_queue** - Message queue for sending
3. **green_api_bulk_campaigns** - Bulk messaging campaigns
4. **whatsapp_message_templates** - Reusable message templates
5. **whatsapp_templates** - Green API templates
6. **whatsapp_messages** - Message log/history

### ✅ Adds Features:
- **Settings column** (JSONB) for Green API configurations
- **Indexes** for fast queries
- **Auto-update triggers** for timestamp columns
- **Proper permissions** for authenticated users
- **Foreign key relationships** between tables

### ✅ Verification:
- Checks existing tables before creating
- Verifies settings column exists
- Shows record counts
- Pretty colored output with status updates

## Requirements

- Node.js installed
- Database connection configured in environment variables
- Either `DATABASE_URL` or `VITE_SUPABASE_URL` set

## Environment Variables

The script uses your existing database configuration:

```bash
# Option 1: Direct database URL
DATABASE_URL=postgresql://user:password@host:5432/database

# Option 2: Supabase URL (will be converted automatically)
VITE_SUPABASE_URL=https://your-project.supabase.co
```

## Output Example

```
============================================================
🚀 AUTOMATIC WHATSAPP DATABASE SETUP
============================================================

ℹ️  Connecting to database...
✅ Connected to database!

============================================================
📋 STEP 1: Checking Existing Tables
============================================================

✅ Found 3 existing WhatsApp tables:
ℹ️    - whatsapp_instances
ℹ️    - green_api_message_queue
ℹ️    - whatsapp_templates

============================================================
📋 STEP 2: Checking Settings Column
============================================================

⚠️  Settings column missing in whatsapp_instances

============================================================
🔧 STEP 3: Creating/Updating WhatsApp Tables
============================================================

ℹ️  Creating whatsapp_instances table...
✅ whatsapp_instances table ready
ℹ️  Adding settings column...
✅ Settings column added
...

============================================================
🎉 SETUP COMPLETE!
============================================================

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  ✅ WhatsApp Database Setup Complete!                     ║
║                                                            ║
║  Created/Verified:                                         ║
║  • 6 tables with proper schema                             ║
║  • Settings column for Green API                           ║
║  • Performance indexes                                     ║
║  • Auto-update triggers                                    ║
║  • Proper permissions                                      ║
║                                                            ║
║  Next Steps:                                               ║
║  1. Go to: http://localhost:3000/lats/whatsapp-chat       ║
║  2. Add WhatsApp instances via Connection Manager          ║
║  3. Configure Green API settings (gear icon)               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

## Features

### Safe to Run Multiple Times
- Uses `CREATE TABLE IF NOT EXISTS`
- Checks before adding columns
- Won't duplicate data

### Colored Output
- ✅ Green for success
- ❌ Red for errors
- ⚠️  Yellow for warnings
- ℹ️  Blue for info
- Pretty progress indicators

### Detailed Verification
- Shows existing tables
- Checks for settings column
- Displays record counts
- Confirms all steps

## Troubleshooting

### "Database URL not found"
Make sure you have `DATABASE_URL` or `VITE_SUPABASE_URL` in your `.env` file:

```bash
# Check your .env file
cat .env | grep DATABASE_URL
```

### "Connection failed"
Check your database credentials and network connection:

```bash
# Test connection
psql $DATABASE_URL
```

### "Permission denied"
Run with proper permissions:

```bash
chmod +x setup-whatsapp-automatic.mjs
node setup-whatsapp-automatic.mjs
```

## What's Next?

After running the setup:

1. **Open WhatsApp Chat**: http://localhost:3000/lats/whatsapp-chat
2. **Add Instance**: Use Connection Manager to add your Green API instance
3. **Configure Settings**: Click the gear icon ⚙️ in the chat header
4. **Start Messaging**: Send WhatsApp messages through the chat interface!

## Manual Setup (Alternative)

If you prefer manual setup, run these SQL files in order:

1. `SETUP-WHATSAPP-COMPLETE.sql` - Creates all tables
2. `VERIFY-WHATSAPP-DATABASE.sql` - Checks setup
3. `ADD-WHATSAPP-SETTINGS-COLUMN.sql` - Adds settings (if needed)

## Support

- Check the tables: Run `VERIFY-WHATSAPP-DATABASE.sql`
- View structure: `\d whatsapp_instances` in psql
- Check records: `SELECT * FROM whatsapp_instances;`

---

**Made with ❤️ for easy WhatsApp integration**

