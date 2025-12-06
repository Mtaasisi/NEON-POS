# How to Restore Database Backup

## 📥 Step 1: Download the Backup

1. Go to: https://github.com/Mtaasisi/NEON-POS/actions
2. Find the workflow run you want to restore from:
   - **Main database**: Look for "Automatic Neon Database Backup"
   - **NEON 02 database**: Look for "Automatic NEON 02 Database Backup"
3. Click on the workflow run
4. Scroll down to the **"Artifacts"** section
5. Click on the backup artifact to download:
   - Main: `production-backup-{timestamp}`
   - NEON 02: `production-backup-neon02-{timestamp}`
6. The file will download as a ZIP file

## 📦 Step 2: Extract the Backup

```bash
# Extract the ZIP file
unzip production-backup-*.zip

# This will give you a file like:
# production-backup-2025-11-27_21-14-28.sql.gz

# Extract the gzipped SQL file
gunzip production-backup-*.sql.gz

# Now you have: production-backup-2025-11-27_21-14-28.sql
```

## 🔄 Step 3: Restore to Database

### Option A: Restore to Main Database (Production)

```bash
# Set your database connection string
DATABASE_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Convert pooler to direct endpoint (required for restore)
DB_URL="${DATABASE_URL//-pooler/}"

# Restore the backup
psql "$DB_URL" -f production-backup-*.sql
```

### Option B: Restore to NEON 02 Database

```bash
# Set your NEON 02 database connection string
DATABASE_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Convert pooler to direct endpoint
DB_URL="${DATABASE_URL//-pooler/}"

# Restore the backup
psql "$DB_URL" -f production-backup-neon02-*.sql
```

## ⚠️ Important Notes

### Before Restoring

1. **Backup current database first** - The restore will replace everything!
2. **Use direct endpoint** - Remove `-pooler` from the connection string
3. **Check the backup file** - Make sure it's the right one
4. **Verify connection** - Test your connection string first

### Restore Process

- The backup includes `--clean` flag, so it will:
  - Drop existing objects (tables, indexes, etc.)
  - Recreate everything from the backup
  - Insert all data

### If You Don't Have psql Installed

```bash
# Install PostgreSQL client (macOS)
brew install postgresql

# Install PostgreSQL client (Ubuntu/Debian)
sudo apt-get install postgresql-client

# Or use Docker (if you have Docker)
docker run --rm \
  -e PGPASSWORD="your_password" \
  -v $(pwd):/backups \
  postgres:17-alpine \
  psql "your_connection_string" -f /backups/production-backup-*.sql
```

## 🔍 Verify the Restore

After restoring, verify the data:

```bash
# Connect to database
psql "$DB_URL"

# Check table counts
SELECT COUNT(*) FROM your_table_name;

# Check recent data
SELECT * FROM your_table_name ORDER BY created_at DESC LIMIT 10;
```

## 📋 Quick Restore Script

Save this as `restore-backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_FILE="$1"
DATABASE_URL="$2"

if [ -z "$BACKUP_FILE" ] || [ -z "$DATABASE_URL" ]; then
  echo "Usage: ./restore-backup.sh <backup-file.sql> <database-url>"
  exit 1
fi

# Convert pooler to direct endpoint
DB_URL="${DATABASE_URL//-pooler/}"

echo "🔄 Restoring backup: $BACKUP_FILE"
echo "📡 Database: ${DB_URL//:[^:]*@/:****@}"

# Restore
psql "$DB_URL" -f "$BACKUP_FILE"

echo "✅ Restore complete!"
```

Usage:
```bash
chmod +x restore-backup.sh
./restore-backup.sh production-backup-2025-11-27_21-14-28.sql "$DATABASE_URL"
```

## 🆘 Troubleshooting

### Error: "connection refused"
- Make sure you're using the direct endpoint (remove `-pooler`)
- Check your connection string is correct
- Verify network connectivity

### Error: "permission denied"
- Check database user has proper permissions
- Verify password is correct

### Error: "relation already exists"
- The backup uses `--clean` flag, so it should drop existing objects
- If errors persist, manually drop the database and recreate it

### Large Database Restore
- For large databases, restore might take several minutes
- Be patient and let it complete
- Check the process is still running: `ps aux | grep psql`

---

**Remember**: Always backup your current database before restoring!

