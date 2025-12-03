# 🚀 Restore Schema to Target Database - Quick Command

## Target Database
```
postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Quick Restore (One Command)

Run this command to create backup and restore in one go:

```bash
./quick-restore-to-target.sh
```

Or manually:

### Step 1: Create Backup (if needed)

```bash
# Make sure DATABASE_URL is set to your SOURCE database in .env
npm run backup:schema
```

### Step 2: Restore to Target

```bash
# Replace schema-backup-*.sql with your actual backup filename
node restore-schema-to-database.mjs schema-backup-*.sql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

## Direct Restore (If Backup Already Exists)

```bash
# Auto-find latest backup and restore
TARGET_DATABASE_URL='postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' node restore-schema-to-database.mjs
```

## What Will Happen

1. ✅ Creates schema backup from source (if needed)
2. ✅ Restores to target database
3. ✅ Drops existing tables in target (⚠️ all data will be lost)
4. ✅ Recreates all tables with isolation settings
5. ✅ Verifies restore was successful

## ⚠️ WARNING

**This will DELETE all data in the target database!**
- All existing tables will be dropped
- All data will be removed
- Schema will be recreated from backup

Make sure you have a backup of the target database if needed!

## ✅ After Restore

The restored schema will include:
- ✅ All table structures
- ✅ All isolation settings columns (25+ columns in store_locations)
- ✅ All branches structure (no data)
- ✅ All indexes, constraints, functions, triggers

---

**Ready? Run:** `./quick-restore-to-target.sh` 🚀







