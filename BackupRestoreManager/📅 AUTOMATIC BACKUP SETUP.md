# 📅 Automatic Backup Setup Guide

## 🎯 Set Up Daily/Weekly/Monthly Automatic Backups

This guide shows you how to run backups automatically using your system's scheduler.

---

## 🍎 **macOS Setup (Using Cron)**

### Step 1: Open Crontab Editor

```bash
crontab -e
```

### Step 2: Add Your Backup Schedule

Add one of these lines (choose based on your needs):

#### Daily Backup at 2 AM
```bash
0 2 * * * cd /path/to/BackupRestoreManager && /usr/local/bin/node scheduled-backup.mjs "Your Connection Name" "full" "daily-backup" >> /path/to/BackupRestoreManager/backup.log 2>&1
```

#### Daily Data-Only Backup at 3 AM
```bash
0 3 * * * cd /path/to/BackupRestoreManager && /usr/local/bin/node scheduled-backup.mjs "Your Connection Name" "data" "daily-data" >> /path/to/BackupRestoreManager/backup.log 2>&1
```

#### Weekly Backup (Every Sunday at 1 AM)
```bash
0 1 * * 0 cd /path/to/BackupRestoreManager && /usr/local/bin/node scheduled-backup.mjs "Your Connection Name" "full" "weekly-backup" >> /path/to/BackupRestoreManager/backup.log 2>&1
```

#### Monthly Backup (1st of month at midnight)
```bash
0 0 1 * * cd /path/to/BackupRestoreManager && /usr/local/bin/node scheduled-backup.mjs "Your Connection Name" "full" "monthly-backup" >> /path/to/BackupRestoreManager/backup.log 2>&1
```

### Step 3: Find Your Node.js Path

```bash
which node
```

Replace `/usr/local/bin/node` with the path from above.

### Step 4: Update Paths

Replace:
- `/path/to/BackupRestoreManager` with your actual folder path
- `"Your Connection Name"` with your saved connection name

---

## 🪟 **Windows Setup (Using Task Scheduler)**

### Step 1: Open Task Scheduler

1. Press `Win + R`
2. Type `taskschd.msc` and press Enter

### Step 2: Create Basic Task

1. Click **"Create Basic Task"** in the right panel
2. Name: `Database Backup Daily`
3. Description: `Automatic daily database backup`
4. Click **Next**

### Step 3: Set Trigger

1. Choose **"Daily"**
2. Set time (e.g., 2:00 AM)
3. Click **Next**

### Step 4: Set Action

1. Choose **"Start a program"**
2. Program/script: `C:\Program Files\nodejs\node.exe`
   *(Find your Node.js path)*
3. Add arguments: `scheduled-backup.mjs "Your Connection Name" "full" "daily-backup"`
4. Start in: `C:\path\to\BackupRestoreManager`
   *(Your BackupRestoreManager folder path)*
5. Click **Next** → **Finish**

### Step 4: Advanced Settings (Optional)

1. Right-click your task → **Properties**
2. Go to **Settings** tab
3. Check **"Run task as soon as possible after a scheduled start is missed"**
4. Check **"If the task fails, restart every:"** (set to 10 minutes)

---

## 🐧 **Linux Setup (Using Cron)**

### Step 1: Open Crontab

```bash
crontab -e
```

### Step 2: Add Schedule

```bash
# Daily backup at 2 AM
0 2 * * * cd /home/user/BackupRestoreManager && /usr/bin/node scheduled-backup.mjs "Your Connection Name" "full" "daily-backup" >> /home/user/BackupRestoreManager/backup.log 2>&1
```

### Step 3: Find Node.js Path

```bash
which node
```

Update the path in your cron job.

---

## ☁️ **Cloud-Based Scheduling (Advanced)**

### Option 1: GitHub Actions (Free)

Create `.github/workflows/backup.yml`:

```yaml
name: Daily Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd BackupRestoreManager
          npm install
      - name: Run backup
        env:
          CONNECTION_STRING: ${{ secrets.DATABASE_URL }}
        run: |
          cd BackupRestoreManager
          node scheduled-backup.mjs "Production" "full" "github-backup"
```

### Option 2: Heroku Scheduler (Paid)

1. Install Heroku Scheduler addon
2. Add job: `cd BackupRestoreManager && node scheduled-backup.mjs "DB" "full"`

### Option 3: AWS Lambda + EventBridge (Advanced)

Set up Lambda function to run your backup script on schedule.

---

## 📋 **Quick Setup Script**

I'll create a helper script to set up cron jobs automatically!

### macOS/Linux Setup Script

```bash
#!/bin/bash
# Run this to set up automatic daily backup

echo "📅 Setting up automatic daily backup..."

# Get current directory
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_PATH=$(which node)

echo "Backup directory: $BACKUP_DIR"
echo "Node.js path: $NODE_PATH"

# Get connection name
read -p "Enter your saved connection name: " CONNECTION_NAME
read -p "Backup type (full/data/schema) [full]: " BACKUP_TYPE
BACKUP_TYPE=${BACKUP_TYPE:-full}

# Create cron job
CRON_JOB="0 2 * * * cd $BACKUP_DIR && $NODE_PATH scheduled-backup.mjs \"$CONNECTION_NAME\" \"$BACKUP_TYPE\" \"daily-backup\" >> $BACKUP_DIR/backup.log 2>&1"

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Daily backup scheduled for 2:00 AM"
echo "📝 View logs: tail -f $BACKUP_DIR/backup.log"
```

---

## 🔍 **Verify Your Setup**

### Test the Scheduled Script

```bash
cd BackupRestoreManager
node scheduled-backup.mjs "Your Connection Name" "full" "test-backup"
```

If it works, your cron job will work too!

### Check Cron Jobs (macOS/Linux)

```bash
crontab -l
```

### View Backup Logs

```bash
tail -f BackupRestoreManager/backup.log
```

---

## ⚙️ **Schedule Examples**

### Multiple Backups Per Day

```bash
# 2 AM - Full backup
0 2 * * * cd /path/to/BackupRestoreManager && node scheduled-backup.mjs "DB" "full" "daily-2am"

# 2 PM - Data-only backup
0 14 * * * cd /path/to/BackupRestoreManager && node scheduled-backup.mjs "DB" "data" "daily-2pm"
```

### Different Schedules

```bash
# Every 6 hours
0 */6 * * * cd /path/to/BackupRestoreManager && node scheduled-backup.mjs "DB" "data" "6hour-backup"

# Every Monday and Friday
0 1 * * 1,5 cd /path/to/BackupRestoreManager && node scheduled-backup.mjs "DB" "full" "weekday-backup"
```

---

## 📊 **Monitoring**

### Check Last Backup

```bash
ls -lt BackupRestoreManager/PROD\ BACKUP/ | head -5
```

### Backup Log File

All scheduled backups log to: `BackupRestoreManager/backup.log`

---

## 🛠️ **Troubleshooting**

### Cron Job Not Running?

1. Check cron service: `sudo service cron status` (Linux)
2. Check logs: `grep CRON /var/log/syslog` (Linux)
3. Verify paths are absolute (not relative)
4. Check file permissions: `chmod +x scheduled-backup.mjs`

### Node.js Not Found?

Use full path: `/usr/local/bin/node` or `/usr/bin/node`

### Connection Not Found?

Make sure connection name matches exactly (case-sensitive)

---

## 💡 **Pro Tips**

1. **Start with manual test** before setting up cron
2. **Use full paths** in cron jobs (not relative)
3. **Check logs regularly** to ensure backups are running
4. **Test restore** from scheduled backups periodically
5. **Set up alerts** if backups fail (email notifications)

---

## 🎯 **Quick Start**

1. **Test the script:**
   ```bash
   cd BackupRestoreManager
   node scheduled-backup.mjs "Your Connection Name"
   ```

2. **Set up cron (macOS/Linux):**
   ```bash
   crontab -e
   # Add: 0 2 * * * cd /full/path/to/BackupRestoreManager && /full/path/to/node scheduled-backup.mjs "Connection Name" "full" "daily"
   ```

3. **Verify it's scheduled:**
   ```bash
   crontab -l
   ```

4. **Wait for first backup** or test immediately!

---

**Your backups will now run automatically!** 🎉
