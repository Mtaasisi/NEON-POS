# 🔄 Database Migration Guide - Dev to Production

## Overview

You need to migrate schema changes from:
- **FROM**: `ep-dry-brook-ad3duuog` (Development Branch)
- **TO**: `ep-damp-fire-adtxvumr` (Production/Main Branch)

---

## ⚡ Method 1: Neon Branch Promotion (Recommended)

This is the **safest and fastest** method.

### Steps:

1. **Go to Neon Console**
   ```
   https://console.neon.tech
   ```

2. **Select Your Project**

3. **Go to Branches**
   - Find your dev branch: `ep-dry-brook-ad3duuog`
   - Click on it

4. **Promote Branch**
   - Look for "Promote to Primary" or "Set as Primary" option
   - This will make your dev branch the new main branch
   - Your current production data will be preserved in a new branch

5. **Update Connection Strings**
   - The endpoint names will swap
   - Update your `.env.production` file with the new connection string

### ⚠️ Important Notes:
- This creates a backup of your current production as a separate branch
- All schema changes are applied instantly
- Zero downtime
- Can be reversed if needed

---

## 🔧 Method 2: Schema Export/Import (Manual)

If you prefer manual control:

### Step 1: Export Dev Schema

```bash
# Connect to dev branch and export schema
pg_dump "postgresql://neondb_owner:npg_vABqUKk73tEW@ep-dry-brook-ad3duuog-pooler.us-east-1.aws.neon.tech/neondb" \
  --schema-only \
  --no-owner \
  --no-acl \
  > dev-schema.sql
```

### Step 2: Review Changes

```bash
# Review the schema file
cat dev-schema.sql
```

### Step 3: Create Migration Script

Create a migration script with only the **new/changed** objects:

```sql
-- migration.sql
-- Add only NEW tables, columns, functions, etc.

-- Example: Add new column
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);

-- Example: Create new table
CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

-- Example: Add new function
CREATE OR REPLACE FUNCTION new_function()
RETURNS void AS $$
BEGIN
    -- function logic
END;
$$ LANGUAGE plpgsql;
```

### Step 4: Test on Production Copy (Recommended)

```bash
# Create a test branch from production in Neon Console first
# Then test your migration script on it

psql "postgresql://neondb_owner:PASSWORD@test-branch.neon.tech/neondb" \
  -f migration.sql
```

### Step 5: Apply to Production

```bash
# Apply the migration to production
psql "postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.us-east-1.aws.neon.tech/neondb" \
  -f migration.sql
```

---

## 📊 Method 3: Schema Comparison Tool

Use a tool to compare schemas and generate migration:

### Using `pg_dump` + `diff`

```bash
# Export both schemas
pg_dump "DEV_CONNECTION_STRING" --schema-only > dev-schema.sql
pg_dump "PROD_CONNECTION_STRING" --schema-only > prod-schema.sql

# Compare them
diff prod-schema.sql dev-schema.sql > schema-diff.txt

# Review differences
cat schema-diff.txt
```

### Using `migra` (Recommended Tool)

```bash
# Install migra
pip install migra

# Generate migration script
migra \
  "postgresql://...@ep-damp-fire-adtxvumr.../neondb" \
  "postgresql://...@ep-dry-brook-ad3duuog.../neondb" \
  > migration.sql

# Review and apply
psql "PROD_CONNECTION_STRING" -f migration.sql
```

---

## 🛡️ Safety Checklist

Before migrating to production:

- [ ] **Backup Production Data**
  ```sql
  -- Create a manual backup in Neon Console
  -- OR export data
  pg_dump "PROD_CONNECTION_STRING" > backup.sql
  ```

- [ ] **Test Migration on Branch**
  - Create a test branch from production
  - Run migration there first
  - Verify everything works

- [ ] **Document Changes**
  - List all tables changed
  - List all new functions/procedures
  - Note any data transformations needed

- [ ] **Plan Rollback**
  - Have a rollback script ready
  - Know how to restore from backup

- [ ] **Schedule Maintenance Window**
  - Notify users if needed
  - Choose low-traffic time

---

## 📝 Common Migration Items

### Tables Created/Modified in Dev

Check what's new in your dev branch:

```sql
-- List all tables in dev
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Compare with production
-- Run same query on production and compare results
```

### Functions/Stored Procedures

```sql
-- List all functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### Indexes

```sql
-- List all indexes
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY indexname;
```

---

## 🚀 Quick Migration Script

Here's a template migration script:

```sql
-- migration-to-production.sql
-- Auto-generated: 2025-10-11
-- Source: ep-dry-brook-ad3duuog (dev)
-- Target: ep-damp-fire-adtxvumr (production)

BEGIN;

-- 1. Add new tables
-- Copy CREATE TABLE statements from dev

-- 2. Modify existing tables
-- ALTER TABLE statements

-- 3. Add/Update functions
-- CREATE OR REPLACE FUNCTION statements

-- 4. Add indexes
-- CREATE INDEX statements

-- 5. Insert reference data (if any)
-- INSERT INTO statements

-- Verify everything
DO $$
BEGIN
    -- Add verification logic here
    RAISE NOTICE 'Migration completed successfully';
END $$;

COMMIT;
```

---

## ⚠️ Critical Warnings

1. **Never drop tables in production without backup**
2. **Test ALL migrations on a branch first**
3. **Use transactions (BEGIN/COMMIT) for safety**
4. **Have rollback scripts ready**
5. **Document everything**

---

## 🎯 Recommended Workflow

### For Small Changes:
```bash
# 1. Write migration SQL
# 2. Test on production branch copy
# 3. Apply to production during low traffic
```

### For Large Changes:
```bash
# 1. Use Neon Branch Promotion
# 2. This is safer and faster
# 3. Creates automatic backup
```

---

## 📞 Need Help?

- **Neon Docs**: https://neon.tech/docs/guides/branching
- **Branch Promotion**: https://neon.tech/docs/guides/branch-promote
- **Schema Migration**: https://neon.tech/docs/guides/schema-migration

---

## ✅ Post-Migration Checklist

After migration:

- [ ] Test all application features
- [ ] Verify data integrity
- [ ] Check all queries work
- [ ] Monitor error logs
- [ ] Test authentication
- [ ] Verify API endpoints
- [ ] Check reports/analytics

---

## 🔙 Rollback Plan

If something goes wrong:

```sql
-- Option 1: Restore from backup
psql "PROD_CONNECTION_STRING" < backup.sql

-- Option 2: Revert specific changes
-- Run reverse migration script

-- Option 3: Switch back to old branch (if promoted)
-- Use Neon Console to switch primary branch
```

---

**Choose Method 1 (Branch Promotion) for easiest and safest migration!**

