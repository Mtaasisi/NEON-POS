# 🚀 Schema Migration: Development → Production

## Quick Start (Choose One Method)

### ⚡ Method 1: Automated Quick Check (Fastest)

```bash
npm run migrate:quick
```

This will:
- ✅ Analyze both branches
- ✅ Generate migration SQL
- ✅ Save to `schema_migration.sql`
- ⏸️  Won't execute (you review first)

### 🛡️ Method 2: Interactive Safe Migration (Recommended)

```bash
npm run migrate:schema
```

This will:
- ✅ Compare schemas in detail
- ✅ Show you exactly what will change
- ✅ Ask for confirmation before executing
- ✅ Create backups automatically

### 🎯 Method 3: Using Bash Script

```bash
bash migrate-schema-dev-to-prod.sh
```

Requires `pg_dump` and `psql` installed.

---

## 📋 Prerequisites

### 1. Get Your Database Connection Strings

Go to [Neon Console](https://console.neon.tech) and get connection strings for both branches:

**Development Branch:**
```
postgresql://neondb_owner:PASSWORD@dev-endpoint.neon.tech/neondb?sslmode=require
```

**Production Branch:**
```
postgresql://neondb_owner:PASSWORD@prod-endpoint.neon.tech/neondb?sslmode=require
```

### 2. Set Environment Variables

Create a `.env` file or set these variables:

```bash
# Option A: Set in terminal
export DEV_DATABASE_URL="postgresql://..."
export PROD_DATABASE_URL="postgresql://..."

# Option B: Add to .env file
echo 'DEV_DATABASE_URL="postgresql://..."' >> .env
echo 'PROD_DATABASE_URL="postgresql://..."' >> .env
```

---

## 📖 Step-by-Step Guide

### Step 1: Run Quick Check First

```bash
npm run migrate:quick
```

This generates `schema_migration.sql` without making any changes. Review this file to see what will change.

### Step 2: Review the Generated SQL

Open `schema_migration.sql` and review:

```sql
-- You'll see something like this:

-- Add new columns
ALTER TABLE products
ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);

-- Add new tables (if any)
-- CREATE TABLE statements will be noted

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_new_field ON products(new_field);
```

### Step 3: Test on a Copy First (Recommended)

In Neon Console:
1. Create a new branch from production called `test-migration`
2. Get its connection string
3. Test the migration:

```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://test-branch-url..."

# Apply migration to test
psql "$TEST_DATABASE_URL" -f schema_migration.sql
```

### Step 4: Apply to Production

Once you've tested and reviewed:

```bash
# Option A: Use the automated tool (with confirmation)
npm run migrate:schema

# Option B: Apply SQL manually
psql "$PROD_DATABASE_URL" -f schema_migration.sql

# Option C: Use Neon Console SQL Editor
# Copy the contents of schema_migration.sql
# Paste into Neon Console's SQL Editor for production branch
# Execute
```

---

## 🔍 What Gets Migrated?

### ✅ Safe Changes (Automatically Handled)

- **New Columns**: Added with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- **New Indexes**: Added with `CREATE INDEX IF NOT EXISTS`
- **New Constraints**: Added safely with checks
- **Column Modifications**: Changed data types with proper casting

### ⚠️ Manual Review Required

- **New Tables**: Listed in the migration SQL, but you need to add CREATE TABLE statements
- **Dropped Columns**: Not automatically handled (safety feature)
- **Dropped Tables**: Not automatically handled (safety feature)

### ❌ Never Automatically Done (For Safety)

- Dropping tables
- Dropping columns
- Truncating data
- Deleting records

---

## 🛡️ Safety Features

### Backups
All tools create backups in the `backups/` directory:
- Schema comparison reports
- Migration SQL scripts
- Timestamps for tracking

### Transactions
All migrations use:
```sql
BEGIN;
-- Your changes here
COMMIT;
```
If anything fails, everything rolls back.

### IF EXISTS / IF NOT EXISTS
All statements use safe checks:
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_new ON products(new_field);
```

---

## 🔄 Rollback Plan

### If Migration Fails

The transaction will automatically rollback. No changes will be applied.

### If You Need to Undo a Successful Migration

#### Option 1: Use Neon's Point-in-Time Recovery

1. Go to Neon Console
2. Select production branch
3. Click "Restore" or "Recovery"
4. Select timestamp before migration
5. Restore

#### Option 2: Manual Rollback

Create a rollback script:

```sql
BEGIN;

-- Remove added columns
ALTER TABLE products DROP COLUMN IF EXISTS new_field;

-- Remove added tables
DROP TABLE IF EXISTS new_table;

-- Remove added indexes
DROP INDEX IF EXISTS idx_new_field;

COMMIT;
```

---

## 📊 Understanding the Output

### Quick Check Output

```
🚀 Quick Schema Migration Tool
============================================================

📌 Step 1: Get Database URLs
------------------------------------------------------------
✅ Development database URL found
✅ Production database URL found

📌 Step 2: Connect to Databases
------------------------------------------------------------
✅ Connected to development
✅ Connected to production

📌 Step 3: Analyze Schemas
------------------------------------------------------------
Getting tables from development...
Getting tables from production...

✅ Found 25 tables in development
✅ Found 23 tables in production

📊 Analysis Results:
------------------------------------------------------------
  • Tables in both: 23
  • New tables in dev: 2
  
  New tables:
    - new_feature_table
    - another_new_table

📌 Step 4: Check for New Columns
------------------------------------------------------------

  Table: products
    New columns: 2
    - new_field (character varying)
    - another_field (integer)

  Table: orders
    New columns: 1
    - status_updated_at (timestamp)

✅ Migration SQL saved to: schema_migration.sql
```

### Safe Migration Tool Output

```
🚀 Neon Database Schema Migration Tool
============================================================

Step 1: Configure Database Connections
============================================================
Enter DEVELOPMENT database URL: postgresql://...
Enter PRODUCTION database URL: postgresql://...
✅ Database connections configured

Step 2: Prepare Backup Directory
============================================================
✅ Backup directory ready: backups/

Step 3: Analyze Database Schemas
============================================================
ℹ Fetching development schema...
ℹ Fetching production schema...
✅ Development: 25 tables, 250 columns
✅ Production: 23 tables, 230 columns

Step 4: Generate Schema Comparison
============================================================
✅ Comparison report saved: backups/schema_comparison_2024-01-15...txt

═══════════════════════════════════════════════════════════════
          SCHEMA COMPARISON REPORT
═══════════════════════════════════════════════════════════════

📊 Summary:
  • New tables to add: 2
  • Tables to remove: 0
  • New columns to add: 5
  • Columns to remove: 0
  • New indexes to add: 3
  • Indexes to remove: 0

➕ NEW COLUMNS (will be added):
   • products.new_field (character varying)
   • products.another_field (integer)
   • orders.status_updated_at (timestamp)

Step 5: Generate Migration SQL
============================================================
✅ Migration SQL saved: backups/migration_2024-01-15...sql

[SQL content displayed here]

Step 6: Execute Migration
============================================================

Do you want to execute this migration on PRODUCTION? (yes/no):
```

---

## 🎯 Real-World Example

Let's say you added these features in development:

1. Added `track_inventory` column to `products` table
2. Added `priority` field to `orders` table  
3. Created `customer_preferences` table
4. Added index on `products.sku`

Running the migration will:

```sql
BEGIN;

-- Add new column to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;

-- Add new column to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal';

-- Add new index
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Note about new table
-- ⚠️  Manual action required:
-- CREATE TABLE customer_preferences (...)

COMMIT;
```

---

## ❓ Frequently Asked Questions

### Q: Will this delete my production data?
**A:** No! The migration only adds new schema elements. Existing data is preserved.

### Q: What if I have data in columns with different types?
**A:** The migration will use `USING` clauses to cast data safely. Review the SQL first.

### Q: Can I run this multiple times?
**A:** Yes! The migration uses `IF NOT EXISTS` checks, so it's idempotent (safe to run multiple times).

### Q: What if I want to remove a column from production?
**A:** This must be done manually. The automated tools won't remove columns for safety.

### Q: Do I need downtime?
**A:** For most changes (adding columns, indexes), no downtime is needed. PostgreSQL supports these operations on live tables.

### Q: How do I handle new tables?
**A:** The tool will detect new tables but won't create them automatically. You'll need to:
1. Get the CREATE TABLE statement from development
2. Review it
3. Add it to the migration SQL
4. Execute

---

## 🔧 Troubleshooting

### Error: "Database URLs not found"

```bash
# Set the environment variables
export DEV_DATABASE_URL="postgresql://..."
export PROD_DATABASE_URL="postgresql://..."
```

### Error: "Permission denied"

Make sure your database user has proper permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE neondb TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
```

### Error: "Column already exists"

The migration already ran successfully. The `IF NOT EXISTS` check prevented an error.

### Error: "Type mismatch"

Some columns have different types. You'll need to handle these manually with explicit casting:
```sql
ALTER TABLE products 
ALTER COLUMN price TYPE DECIMAL(10,2) 
USING price::DECIMAL(10,2);
```

---

## 📚 Additional Resources

- [SCHEMA_MIGRATION_GUIDE.md](./SCHEMA_MIGRATION_GUIDE.md) - Detailed guide with all methods
- [Neon Documentation](https://neon.tech/docs/introduction)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)

---

## ✅ Pre-Migration Checklist

Before running migration:

- [ ] Have connection strings for both branches
- [ ] Reviewed schema differences
- [ ] Tested on a test/clone branch
- [ ] Backed up production (or verified Neon backups are enabled)
- [ ] Scheduled during low-traffic time (if needed)
- [ ] Team is aware of the migration
- [ ] Have rollback plan ready
- [ ] Application code is compatible with new schema

---

## 🎉 Post-Migration Checklist

After successful migration:

- [ ] Verify all tables exist: `\dt` in psql
- [ ] Verify new columns exist: `\d table_name` in psql
- [ ] Test application functionality
- [ ] Check for any errors in application logs
- [ ] Verify data integrity
- [ ] Update team on completion
- [ ] Archive migration scripts in version control

---

**Need help?** Check the detailed guide in [SCHEMA_MIGRATION_GUIDE.md](./SCHEMA_MIGRATION_GUIDE.md)

**Good luck with your migration! 🚀**

