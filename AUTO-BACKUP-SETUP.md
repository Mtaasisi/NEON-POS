# ⏰ Automatic Database Backup Setup Guide

## 🚀 Quick Setup (2 Steps)

### Step 1: Add Database Columns

Run this SQL file in your Neon database console:
```
ADD-AUTO-BACKUP-FIELDS.sql
```

This adds 5 new columns to `lats_pos_general_settings`:
- ✅ `auto_backup_enabled` (boolean) - Enable/disable auto backup
- ✅ `auto_backup_frequency` (text) - daily/weekly/monthly
- ✅ `auto_backup_time` (text) - HH:MM format (e.g., "02:00")
- ✅ `auto_backup_type` (text) - full/schema-only/data-only
- ✅ `last_auto_backup` (timestamp) - Last successful backup

### Step 2: Configure in Admin Settings

1. **Refresh your app** (Ctrl+Shift+R or Cmd+Shift+R)
2. Go to **Admin Settings** → **Database**
3. You'll see the **"Automatic Backup Schedule"** section
4. Configure your preferences and click **"Save Automatic Backup Settings"**

---

## ⚙️ Configuration Options

### **Enable Automatic Backup**
Toggle switch to turn on/off automatic backups

### **Backup Frequency**
- **Daily** - Runs every 24 hours
- **Weekly** - Runs every 7 days
- **Monthly** - Runs every 30 days

### **Backup Time**
Choose when backups should run (24-hour format):
- **02:00** (default) - 2:00 AM (recommended for off-peak hours)
- Or any time you prefer

### **Backup Type**
- **Full (Schema + Data)** - Complete backup with table structures and all data
- **Schema Only** - Just table structures, no data (small file size)
- **Data Only** - Just data records, no schema definitions

---

## 📊 How It Works

### **Background Process:**
```
1. App checks every hour if backup should run
2. Compares current time vs scheduled time
3. Checks if enough days passed based on frequency
4. If conditions met → runs backup automatically
5. Updates last_auto_backup timestamp in database
6. Downloads backup file to your computer
```

### **Example Schedule:**
```
Frequency: Daily
Time: 02:00
Type: Full

→ Backup runs every day at 2:00 AM
→ Downloads: full-schema-backup-2025-10-12T02-00-15.json
```

---

## 💾 Where Backups Are Saved

**Automatic backups download to your browser's download folder:**
- `full-schema-backup-[timestamp].json`
- `schema-only-backup-[timestamp].json`
- `data-only-backup-[timestamp].json`

**Recommendation:** Set up a cloud sync folder (Dropbox, Google Drive, OneDrive) as your download location for automatic cloud backup!

---

## 🔍 Monitoring

### **Check Last Backup:**
In Admin Settings → Database, you'll see:
```
Last automatic backup: 10/12/2025, 2:00:15 AM
```

### **Verify in Database:**
Run this query:
```sql
SELECT 
    auto_backup_enabled,
    auto_backup_frequency,
    auto_backup_time,
    auto_backup_type,
    last_auto_backup
FROM lats_pos_general_settings;
```

---

## 🎯 Best Practices

### **Recommended Settings:**

**For Critical Production:**
- ✅ Frequency: **Daily**
- ✅ Time: **02:00** (off-peak)
- ✅ Type: **Full** (schema + data)

**For Development:**
- ✅ Frequency: **Weekly**
- ✅ Time: **Any**
- ✅ Type: **Full** or **Schema Only**

**For Data Analysis:**
- ✅ Frequency: **Daily** or **Weekly**
- ✅ Time: **Any**
- ✅ Type: **Data Only**

---

## 📦 Backup File Contents

### **Full Backup Includes:**
```json
{
  "backupType": "FULL_SCHEMA_AND_DATA",
  "schema": {
    "customers": [
      { "name": "id", "type": "uuid", "nullable": false },
      { "name": "name", "type": "text", "nullable": false }
    ]
  },
  "tables": {
    "customers": {
      "recordCount": 1250,
      "schema": [...],
      "data": [...]
    }
  },
  "summary": {
    "totalTables": 150,
    "tablesWithData": 85,
    "totalRecords": 125432
  }
}
```

---

## 🔧 Troubleshooting

### **Backups Not Running?**
1. Check if `auto_backup_enabled` is true
2. Verify the scheduled time has passed
3. Check browser console for errors
4. Make sure app is open at the scheduled time

### **Columns Don't Exist Error?**
Run `ADD-AUTO-BACKUP-FIELDS.sql` in your database

### **Settings Not Saving?**
1. Check `lats_pos_general_settings` table exists
2. Verify you have a record in the table
3. Check browser console for errors

---

## ⚠️ Important Notes

1. **Browser Must Be Open**: Automatic backups only run when the app is open in your browser
2. **Internet Required**: Must have database connection
3. **Download Folder**: Files save to your default download folder
4. **Manual Override**: Can still do manual backups anytime regardless of schedule
5. **Database Storage**: All settings stored in `lats_pos_general_settings` table

---

## 🎉 Benefits

- ✅ **Never forget backups** - automated scheduling
- ✅ **Flexible timing** - choose when backups run
- ✅ **Multiple types** - full, schema, or data only
- ✅ **Database stored** - settings persist and sync across devices
- ✅ **Easy management** - simple UI in Admin Settings
- ✅ **Disaster recovery** - regular backups protect your data

Your database is now protected with automatic backups! 🎉

