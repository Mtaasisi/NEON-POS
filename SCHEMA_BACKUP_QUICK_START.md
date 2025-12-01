# Schema Backup - Quick Start Guide

## 🚀 Quick Commands

### Create Schema Backup

```bash
# Method 1: Using npm script (recommended)
npm run backup:schema

# Method 2: Direct script execution
node backup-schema-only.mjs

# Method 3: Custom filename
node backup-schema-only.mjs my-custom-backup.sql
```

## ✅ What Gets Backed Up

**Included:**
- ✅ All table structures
- ✅ All isolation settings columns (25+ columns in store_locations)
- ✅ All branches structure (table structure, not data)
- ✅ All indexes, constraints, foreign keys
- ✅ All functions, triggers, sequences
- ✅ All RLS policies

**Not Included:**
- ❌ No data rows
- ❌ No branch records (only structure)
- ❌ No product/customer/etc. data

## 📋 Prerequisites

1. **Install pg_dump**:
   ```bash
   # macOS
   brew install postgresql
   
   # Linux
   sudo apt-get install postgresql-client
   ```

2. **Set Database URL** in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

## 📄 Output File

Backup file will be created as:
- Auto-generated: `schema-backup-YYYY-MM-DDTHH-MM-SS.sql`
- Custom: `your-custom-name.sql`

Example: `schema-backup-2025-01-27T14-30-45.sql`

## 🔍 Verify Backup

```bash
# View backup file
cat schema-backup-*.sql | less

# Check for isolation columns
grep -i "data_isolation_mode" schema-backup-*.sql

# Count share_ columns
grep -i "share_" schema-backup-*.sql | wc -l
```

## 📥 Restore Schema

```bash
# Restore to database
psql "$DATABASE_URL" -f schema-backup-*.sql
```

## ⚡ One-Liner

```bash
# Create backup and verify
npm run backup:schema && grep -i "store_locations" schema-backup-*.sql | head -5
```

---

For detailed documentation, see [SCHEMA_BACKUP_README.md](./SCHEMA_BACKUP_README.md)



