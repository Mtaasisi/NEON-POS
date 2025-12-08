# 🔄 Backup & Restore Manager

**Standalone, Portable Database Backup & Restore Tool**

A powerful command-line tool for backing up, restoring, and merging PostgreSQL database schemas. Fully portable - move this folder anywhere and it will work!

## 📦 What's Included

- ✅ **Backup Database** - Full database backups with JSON and SQL formats
- ✅ **Restore Database** - Restore from backup files
- ✅ **Merge Database Schema** - Compare and merge schemas between databases
- ✅ **Connection Management** - Save and manage database connections
- ✅ **Portable** - Works from any location, no installation required

## 🚀 Quick Start

### Option 1: Install Dependencies & Run

```bash
# Navigate to the folder
cd BackupRestoreManager

# Install dependencies (first time only)
npm install

# Run the app
npm start
```

### Option 2: Use the Launcher (Easiest!)

**Double-click** `🚀 START HERE - Double Click Me.command` to start the app!

*(On Windows: `🚀 START HERE - Double Click Me.bat`)*
*(On Linux: `🚀 START HERE - Double Click Me.sh`)*

### Option 3: Direct Node.js

```bash
node backup-restore-manager.mjs
```

## 📋 Requirements

- **Node.js** v18.0.0 or higher
- **npm** (comes with Node.js)
- PostgreSQL database access

### Check Your Node.js Version

```bash
node --version
```

If you don't have Node.js, download from: https://nodejs.org/

## 🔧 First Time Setup

1. **Install Dependencies** (one-time setup):
   ```bash
   cd BackupRestoreManager
   npm install
   ```

2. **Launch the App**:
   - Double-click `Launch App.command` (macOS)
   - Or run: `npm start`

3. **Add Database Connections**:
   - Select option 4: "Manage Connection Strings"
   - Add your database connection strings
   - Test connections to verify

## 📁 Folder Structure

```
BackupRestoreManager/
├── backup-restore-manager.mjs    # Main application
├── package.json                   # Dependencies
├── Launch App.command            # macOS launcher
├── Launch App.sh                 # Linux launcher
├── Launch App.bat                # Windows launcher
├── README.md                     # This file
├── .db-connections.json          # Saved connections (created on first use)
└── PROD BACKUP/                  # Backup files (created automatically)
    └── schema-migrations/       # Schema merge files
```

## 🔐 Connection String Format

PostgreSQL connection string:
```
postgresql://username:password@host:port/database?sslmode=require
```

Example:
```
postgresql://user:pass@localhost:5432/mydb?sslmode=require
```

## 💾 Backup Files

All backups are saved to:
- **Location**: `PROD BACKUP/[backup-name]/` (inside BackupRestoreManager folder)
- **Formats**: JSON (readable) + SQL (restorable)
- **Includes**: All tables, data, and metadata
- **Full Path**: `BackupRestoreManager/PROD BACKUP/backup-name/`
- **See**: `📁 WHERE ARE MY BACKUPS.txt` for detailed location info

## 🔄 Schema Merge

Merge schemas between databases:
1. Select "Merge Database Schema"
2. Choose source database (has new tables/columns)
3. Choose target database (needs updates)
4. Run "Dry Run" first to preview changes
5. Review migration file
6. Run "Apply Migration" to execute

## 🎯 Features

### Backup Database
- Full table backups
- JSON and SQL formats
- Custom backup names
- Automatic timestamps

### Restore Database
- Browse available backups
- Select target database
- Safe restore with confirmation

### Merge Schema
- Compare two databases
- Detect missing tables/columns
- Generate migration SQL
- Dry run mode (safe preview)
- Apply migrations safely

### Connection Management
- Save multiple connections
- Test connections
- Edit/delete connections
- Secure storage

### 🆕 Server Auto-Start (NEW!)
- **Automatically detects** if PostgreSQL server is not running
- **Auto-starts** local PostgreSQL servers when needed
- Works on macOS, Windows, and Linux
- No manual intervention required!
- See `SERVER_AUTO_START.md` for details

## 🛡️ Safety Features

- ✅ Connection testing before operations
- ✅ Confirmation prompts for destructive actions
- ✅ Transaction rollback on errors
- ✅ Dry run mode for schema merges
- ✅ Clear error messages

## 📱 Portable Usage

**This folder can be moved anywhere!**

1. Copy the entire `BackupRestoreManager` folder
2. Move it to any location (Desktop, USB drive, etc.)
3. Run `npm install` in the new location (first time)
4. Launch and use as normal

All data (backups, connections) stays within the folder.

## 🔧 Troubleshooting

### "Module not found: pg"
```bash
npm install
```

### "Node.js not found"
- Install Node.js from https://nodejs.org/
- Restart terminal after installation

### "Permission denied" (macOS/Linux)
```bash
chmod +x "Launch App.command"
chmod +x "Launch App.sh"
```

### Connection Errors
- Check your connection string format
- Verify database is accessible
- Check firewall/network settings
- Test connection in "Manage Connection Strings"

## 📝 Notes

- All backups are stored in `PROD BACKUP/` folder
- Connection strings are saved in `.db-connections.json`
- Schema migrations are in `PROD BACKUP/schema-migrations/`
- The app is fully self-contained in this folder

## 🆘 Support

If you encounter issues:
1. Check Node.js version: `node --version` (needs v18+)
2. Reinstall dependencies: `npm install`
3. Check file permissions
4. Review error messages carefully

## 📄 License

MIT License - Use freely!

---

**Made portable and easy to use** 🚀
