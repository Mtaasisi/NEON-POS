# 🔧 Fix Customers Table Schema Errors

## 🚨 Problem

Your application is showing these errors in the browser console:

```
❌ SQL Error: "column "branch_id" does not exist"
❌ SQL Error: "column "is_active" does not exist"
❌ SQL Error: "column "id" does not exist"
❌ SQL Error: "column "total_spent" does not exist"
```

These errors occur because your Neon database's `customers` table is missing important columns.

---

## ✅ Solution

I've created a migration file that will add all missing columns to your `customers` table safely.

**This migration will:**
- ✅ Add all missing columns (`branch_id`, `is_active`, `total_spent`, etc.)
- ✅ Preserve all existing customer data
- ✅ Create necessary indexes for performance
- ✅ Add proper constraints and foreign keys
- ✅ Use `IF NOT EXISTS` checks (safe to run multiple times)

**This migration will NOT:**
- ❌ Delete any existing data
- ❌ Modify existing columns
- ❌ Drop any tables

---

## 🚀 Quick Fix (Choose One Method)

### Method 1: Using Node.js (Recommended - Easiest)

```bash
# Navigate to your project directory
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"

# Run the Node.js migration script
node fix-customers-schema.mjs
```

**Advantages:**
- ✅ No need to install PostgreSQL tools
- ✅ Uses your existing Node.js environment
- ✅ Clear output and error messages

---

### Method 2: Using Bash Script (If you have psql installed)

```bash
# Navigate to your project directory
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"

# Run the bash script
./fix-customers-schema.sh
```

**Requirements:**
- PostgreSQL client tools (`psql`) must be installed
- Install on macOS: `brew install postgresql`

---

### Method 3: Manual Application (Using Neon Console)

If the scripts don't work, you can apply the migration manually:

1. **Open Neon Console:**
   - Go to: https://console.neon.tech
   - Select your project
   - Click on the **SQL Editor** tab

2. **Copy the migration SQL:**
   - Open the file: `migrations/fix_customers_table_add_missing_columns.sql`
   - Copy all the contents

3. **Execute in Neon Console:**
   - Paste the SQL into the SQL Editor
   - Click **Run** button
   - Wait for completion

---

## 📋 What Gets Added

The migration adds these missing columns to your `customers` table:

### Core Columns
- `branch_id` (UUID) - Links customer to a branch
- `is_shared` (BOOLEAN) - Whether customer is shared across branches
- `sharing_mode` (TEXT) - How customer is shared: isolated/shared/custom

### Profile & Contact
- `profile_image` (TEXT) - URL to profile image
- `whatsapp` (TEXT) - WhatsApp number
- `whatsapp_opt_out` (BOOLEAN) - Whether customer opted out of WhatsApp

### Tracking & Analytics
- `last_purchase_date` (TIMESTAMPTZ) - When customer last purchased
- `total_purchases` (INTEGER) - Total number of purchases
- `birthday` (DATE) - Full birthday date
- `last_activity_date` (TIMESTAMPTZ) - Last activity timestamp

### Call Analytics
- `total_calls` (INTEGER) - Total call count
- `incoming_calls` (INTEGER) - Incoming call count
- `outgoing_calls` (INTEGER) - Outgoing call count
- `missed_calls` (INTEGER) - Missed call count
- `total_call_duration_minutes` (NUMERIC) - Total call duration
- `avg_call_duration_minutes` (NUMERIC) - Average call duration
- `call_loyalty_level` (TEXT) - Loyalty level based on calls

### Referral System
- `referred_by` (UUID) - Who referred this customer
- `referrals` (JSONB) - Array of referred customers

### System Fields
- `created_by` (UUID) - User who created this customer
- `created_by_branch_id` (UUID) - Branch that created this customer
- `created_by_branch_name` (TEXT) - Branch name for display

---

## 🔍 Verify the Fix

After running the migration:

1. **Refresh your browser** (Hard refresh: `Cmd+Shift+R` or `Ctrl+Shift+R`)

2. **Check the browser console** for errors:
   - The errors about missing columns should be gone
   - You should see normal log messages

3. **Test customer features:**
   - View customers list
   - Search for customers
   - Create a new customer
   - Edit an existing customer

---

## ❓ Troubleshooting

### Error: "Cannot find package '@neondatabase/serverless'"

**Solution:**
```bash
npm install @neondatabase/serverless
```

### Error: "psql: command not found"

**Solution:**
Use Method 1 (Node.js) instead, or install PostgreSQL:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt install postgresql-client
```

### Error: "connection timeout"

**Possible causes:**
- Network connectivity issues
- VPN blocking the connection
- Firewall settings

**Solution:**
- Check your internet connection
- Try disabling VPN temporarily
- Use Method 3 (Neon Console) instead

### Error: "relation 'customers' does not exist"

**This means:**
The `customers` table doesn't exist at all in your database.

**Solution:**
Run the base schema migration first:
```bash
psql "$DATABASE_URL" -f migrations/000_create_base_schema.sql
```
Then run this fix migration.

---

## 📊 Verifying Column Existence

To check if columns exist after migration:

```sql
-- Run this in Neon Console SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
ORDER BY ordinal_position;
```

You should see all the columns listed including:
- `id`
- `branch_id`
- `is_active`
- `total_spent`
- And many more...

---

## 🎯 Next Steps

After the migration is successful:

1. ✅ Refresh your application
2. ✅ Test all customer-related features
3. ✅ Check that data displays correctly
4. ✅ Monitor for any remaining errors

---

## 📞 Support

If you encounter any issues:

1. Check the error message carefully
2. Look at the troubleshooting section above
3. Verify your database connection string is correct
4. Try the alternative methods (Node.js vs Bash vs Manual)

---

## 📝 Files Created

- `migrations/fix_customers_table_add_missing_columns.sql` - The migration SQL
- `fix-customers-schema.sh` - Bash script to apply migration
- `fix-customers-schema.mjs` - Node.js script to apply migration
- `FIX_CUSTOMERS_ERRORS_README.md` - This guide

---

## ⚠️ Important Notes

1. **Safe to run multiple times**: The migration uses `IF NOT EXISTS` checks
2. **No data loss**: Only adds columns, never removes data
3. **Preserves existing data**: All current customer records remain intact
4. **Creates indexes**: Improves query performance automatically
5. **Adds constraints**: Ensures data integrity

---

## 🎉 Success!

Once the migration completes successfully, your application should work without the column errors. All customer-related features will function properly with full branch isolation support.

