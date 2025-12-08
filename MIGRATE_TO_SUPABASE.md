# Migrate Database Schema to Supabase

This guide helps you migrate your database schema to your Supabase PostgreSQL database.

## 🎯 Destination Database

**Supabase Database:**
```
postgresql://postgres:[YOUR_PASSWORD]@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres
```

**Project:** `jxhzveborezjhsmzsgbc`  
**Host:** `db.jxhzveborezjhsmzsgbc.supabase.co`  
**Port:** `5432`  
**Database:** `postgres`  
**User:** `postgres`

---

## 📋 Prerequisites

1. **Get your Supabase database password:**
   - Go to: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/settings/database
   - Find "Database Password" section
   - Copy your password (or reset it if needed)

2. **Install PostgreSQL client tools** (if not already installed):
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   
   # Windows
   # Download from: https://www.postgresql.org/download/windows/
   ```

3. **Ensure you have access to source database**

---

## 🚀 Quick Migration

### Step 1: Set Environment Variables

```bash
# Set your Supabase database URL (replace YOUR_PASSWORD with actual password)
export SUPABASE_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres"

# Set source database (choose one):
# Option A: From local database
export SOURCE_DATABASE_URL="postgresql://mtaasisi@localhost:5432/neondb"

# Option B: From development database
export SOURCE_DATABASE_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Option C: From production database
export SOURCE_DATABASE_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Step 2: Run Migration Script

```bash
# Run the automated migration script
node migrate-to-supabase.mjs
```

**Or specify source database directly:**
```bash
node migrate-to-supabase.mjs "postgresql://mtaasisi@localhost:5432/neondb"
```

---

## 📝 Manual Migration Steps

If you prefer to do it manually:

### Step 1: Backup Source Schema

```bash
# Set source database
export DATABASE_URL="postgresql://mtaasisi@localhost:5432/neondb"

# Create schema backup
node backup-schema-only.mjs schema-backup-$(date +%Y%m%d).sql
```

### Step 2: Restore to Supabase

```bash
# Set Supabase destination
export TARGET_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres"

# Restore schema
node restore-schema-to-database.mjs schema-backup-YYYYMMDD.sql
```

---

## 🔍 Verify Migration

After migration, verify in Supabase:

1. **Via Supabase Dashboard:**
   - Go to: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/editor
   - Check "Table Editor" - you should see all your tables

2. **Via SQL Editor:**
   ```sql
   -- Check tables
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   
   -- Check key tables exist
   SELECT 'users' as table_name, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'users') as exists
   UNION ALL
   SELECT 'lats_products', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_products')
   UNION ALL
   SELECT 'lats_customers', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_customers');
   ```

3. **Via Command Line:**
   ```bash
   psql "$SUPABASE_DATABASE_URL" -c "\dt"
   ```

---

## ⚙️ Update Application Configuration

After migration, update your application to use Supabase:

### Option 1: Update .env file

```bash
# .env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres
VITE_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres

# Also update Supabase API settings
VITE_SUPABASE_URL=https://jxhzveborezjhsmzsgbc.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Option 2: Use Supabase Client

Your app already has Supabase client configured. Just make sure:
- `VITE_SUPABASE_URL` points to `https://jxhzveborezjhsmzsgbc.supabase.co`
- `VITE_SUPABASE_ANON_KEY` is set correctly

---

## ⚠️ Important Notes

1. **Schema Only:** This migration only copies the schema (tables, functions, etc.), NOT the data
2. **Password Security:** Never commit passwords to git. Use environment variables
3. **Backup First:** Always backup your Supabase database before making changes
4. **Test First:** Test the migration on a development database first if possible
5. **RLS Policies:** Row Level Security policies will be migrated with the schema

---

## 🐛 Troubleshooting

### Connection Issues

**Error: "password authentication failed"**
- Verify your Supabase database password
- Check if password has special characters that need escaping
- Try resetting password in Supabase dashboard

**Error: "could not connect to server"**
- Check if Supabase database is running
- Verify hostname: `db.jxhzveborezjhsmzsgbc.supabase.co`
- Check firewall/network settings

### Migration Issues

**Error: "relation already exists"**
- Some tables might already exist in Supabase
- The script uses `IF NOT EXISTS` clauses, but some migrations might fail
- Check which tables already exist and decide if you want to drop them first

**Error: "permission denied"**
- Ensure you're using the `postgres` user (has full permissions)
- Check Supabase project settings

### Schema Differences

If you encounter errors about missing extensions:
```sql
-- In Supabase SQL Editor, run:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## 📊 What Gets Migrated

✅ **Included:**
- All table structures
- All columns, data types, constraints
- Indexes
- Foreign keys
- Functions and stored procedures
- Triggers
- Views
- Sequences
- RLS (Row Level Security) policies
- Extensions (uuid-ossp, pgcrypto)

❌ **Not Included:**
- Data rows (schema only)
- User permissions (uses --no-owner, --no-acl)
- Database-level settings

---

## 🔄 Next Steps After Migration

1. **Verify all tables exist** in Supabase Dashboard
2. **Test your application** with the new database connection
3. **Migrate data** (if needed) using data migration scripts
4. **Update connection strings** in your application
5. **Set up RLS policies** if needed (they should be migrated, but verify)
6. **Test all features** to ensure everything works

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify database URLs are correct
3. Ensure Supabase database is accessible
4. Check Supabase dashboard for any errors
5. Review the migration log output

---

## 🎉 Success Checklist

- [ ] Schema backup created successfully
- [ ] Schema restored to Supabase
- [ ] All tables visible in Supabase Dashboard
- [ ] Key tables verified (users, lats_products, lats_customers, etc.)
- [ ] Functions and triggers migrated
- [ ] Application connects to Supabase successfully
- [ ] Test queries work correctly

