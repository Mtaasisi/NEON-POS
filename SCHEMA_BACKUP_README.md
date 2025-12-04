# Full Schema Backup - No Data

This script creates a complete **schema-only** backup of your database that includes all isolation settings and branch structures, but **no data rows**.

## 📋 What's Included

The backup includes:

✅ **All Table Structures**
- Complete table definitions with all columns
- Data types, defaults, and constraints
- `store_locations` table with **all 25+ isolation columns**

✅ **All Isolation Settings Structure**
- `data_isolation_mode` column (shared/isolated/hybrid)
- All `share_*` flags (share_products, share_inventory, etc.)
- Column defaults and constraints
- Check constraints for isolation mode

✅ **All Branches Structure**
- Complete `store_locations` table structure
- All branch-related columns (name, code, address, etc.)
- Branch indexes and constraints
- **NO data rows** (schema only)

✅ **Complete Schema Components**
- All indexes
- All foreign key constraints
- All check constraints
- All functions and stored procedures
- All triggers
- All sequences
- All types, domains, and enums
- All RLS (Row Level Security) policies

❌ **Data is NOT Included**
- No table data rows
- No branch records (only structure)
- No product data, customer data, etc.

## 🚀 Usage

### Basic Usage

```bash
# Create backup with auto-generated filename
node backup-schema-only.mjs

# Create backup with custom filename
node backup-schema-only.mjs my-schema-backup.sql
```

### Prerequisites

1. **pg_dump installed**:
   ```bash
   # macOS
   brew install postgresql
   
   # Linux
   sudo apt-get install postgresql-client
   ```

2. **Database URL configured**:
   - Set `DATABASE_URL` or `VITE_DATABASE_URL` in your `.env` file
   - Or set as environment variable before running

### Environment Variables

The script looks for database URL in this order:
1. `DATABASE_URL` environment variable
2. `VITE_DATABASE_URL` environment variable
3. `.env` file in project root

Example `.env` file:
```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

## 📁 Output

The script creates a SQL file with:
- **Filename**: `schema-backup-YYYY-MM-DDTHH-MM-SS.sql` (auto-generated)
- **Or**: Custom filename if provided as argument

Example output:
```
schema-backup-2025-01-27T14-30-45.sql
```

## ✅ Verification

The script automatically verifies:

1. ✅ Database connection
2. ✅ `store_locations` table exists
3. ✅ Isolation columns are present
4. ✅ Backup file was created
5. ✅ Key schema components are included

You'll see output like:
```
✅ store_locations table exists
✅ Found 26 isolation columns
✅ Indexes included
✅ Constraints included
✅ Functions included
```

## 📥 Restore Schema

To restore this schema to another database:

```bash
# Restore to database
psql "postgresql://user:password@host/database" -f schema-backup-2025-01-27T14-30-45.sql

# Or with connection string from environment
psql "$DATABASE_URL" -f schema-backup-2025-01-27T14-30-45.sql
```

## 🔍 View Backup Contents

```bash
# View backup file
cat schema-backup-*.sql | less

# Search for specific table
grep -i "store_locations" schema-backup-*.sql

# Count isolation columns
grep -i "share_" schema-backup-*.sql | wc -l
```

## 📊 What Gets Backed Up

### Isolation Columns in store_locations

All these columns are included in the backup:

1. `data_isolation_mode` - Main isolation mode
2. `share_products` - Product sharing
3. `share_inventory` - Inventory sharing
4. `share_customers` - Customer sharing
5. `share_suppliers` - Supplier sharing
6. `share_categories` - Category sharing
7. `share_employees` - Employee sharing
8. `share_accounts` - Account sharing
9. `share_sales` - Sales record sharing
10. `share_purchase_orders` - PO sharing
11. `share_devices` - Device sharing
12. `share_payments` - Payment sharing
13. `share_appointments` - Appointment sharing
14. `share_reminders` - Reminder sharing
15. `share_expenses` - Expense sharing
16. `share_trade_ins` - Trade-in sharing
17. `share_special_orders` - Special order sharing
18. `share_attendance` - Attendance sharing
19. `share_loyalty_points` - Loyalty points sharing
20. `share_gift_cards` - Gift card sharing
21. `share_quality_checks` - Quality check sharing
22. `share_recurring_expenses` - Recurring expense sharing
23. `share_communications` - Communication sharing
24. `share_reports` - Report sharing
25. `share_finance_transfers` - Finance transfer sharing

Plus additional branch settings:
- `allow_stock_transfer`
- `auto_sync_products`
- `auto_sync_prices`
- `require_approval_for_transfers`
- `can_view_other_branches`
- `can_transfer_to_branches`

## 🔧 Troubleshooting

### Error: pg_dump: command not found

Install PostgreSQL client tools:
```bash
# macOS
brew install postgresql

# Linux
sudo apt-get install postgresql-client
```

### Error: Could not connect to database

1. Check your `DATABASE_URL` is correct
2. Verify database is accessible from your network
3. Check firewall/network settings
4. Ensure SSL settings are correct (`sslmode=require`)

### Error: Invalid database URL format

Make sure your connection string format is:
```
postgresql://user:password@host:port/database?sslmode=require
```

### Warning: No isolation columns found

This means the `store_locations` table doesn't have isolation columns yet. You may need to run the isolation migration first:
```bash
psql "$DATABASE_URL" -f migrations/complete_branch_isolation_schema.sql
```

## 📝 Example Output

```
╔══════════════════════════════════════════════════════════════════╗
║          FULL SCHEMA BACKUP - NO DATA                            ║
║          Includes All Isolation Settings & Branches              ║
╚══════════════════════════════════════════════════════════════════╝

🔌 Database URL: postgresql://user:****@host/database

======================================================================
📡 VERIFYING DATABASE CONNECTION
======================================================================

✅ store_locations table exists
✅ Found 26 isolation columns
✅ Found 2 branches (data count, not included in schema backup)
✅ Found 45 tables in schema

======================================================================
📦 CREATING SCHEMA-ONLY BACKUP
======================================================================

Backup Type: SCHEMA ONLY (no data)
Output File: schema-backup-2025-01-27T14-30-45.sql
Running pg_dump with schema-only options...

======================================================================
✅ BACKUP COMPLETED SUCCESSFULLY
======================================================================

📄 File: schema-backup-2025-01-27T14-30-45.sql
📊 Size: 245.32 KB (0.24 MB)
📝 Lines: 8,542

✅ store_locations table structure included
✅ data_isolation_mode column included
✅ 26 share_* isolation columns included
✅ Indexes included
✅ Constraints included
✅ Functions included
✅ Triggers included
```

## 🎯 Use Cases

1. **Schema Migration**: Move schema to a new database
2. **Version Control**: Track schema changes over time
3. **Documentation**: Document complete database structure
4. **Development Setup**: Set up new environments with schema only
5. **Backup Before Changes**: Backup schema before major migrations

## ⚠️ Important Notes

- **This is SCHEMA ONLY** - No data is backed up
- **Branches structure is included** - But no branch records
- **Isolation settings structure is included** - But not the actual settings values
- **To backup data**, use a different backup method (e.g., full database backup)

## 🔗 Related Files

- `migrations/store_locations_complete_schema.sql` - Complete store_locations schema
- `migrations/complete_branch_isolation_schema.sql` - Isolation schema migration
- `download-schema.mjs` - Alternative schema download script
- `BACKUP_SETUP.md` - Full database backup setup (with data)

---

**Last Updated**: 2025-01-27  
**Status**: ✅ Ready to use








