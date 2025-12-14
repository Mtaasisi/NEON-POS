# 🔧 Fix Missing Columns in Customers Table

## Problem
Your application is failing with these SQL errors:
- ❌ `column "branch_id" does not exist`
- ❌ `column "is_active" does not exist`  
- ❌ `column "id" does not exist`
- ❌ `column "total_spent" does not exist`

## Root Cause
The migration that adds these columns hasn't been run on your Neon database yet.

## Solution

### Option 1: Run Migration via Neon Console (RECOMMENDED)

1. **Go to your Neon Console**: https://console.neon.tech/
2. **Select your project**: POS-main NEON DATABASE
3. **Go to SQL Editor**
4. **Copy and paste the entire migration script** from: 
   ```
   migrations/fix_customers_table_add_missing_columns.sql
   ```
5. **Click "Run"** to execute the migration

### Option 2: Run Migration via Command Line

```bash
# Navigate to your project directory
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"

# Run the migration (requires psql installed and Neon connection string)
psql "your-neon-connection-string" -f migrations/fix_customers_table_add_missing_columns.sql
```

### Option 3: Quick Fix Script (Simplified)

If you want a quick fix without running the full migration, run this in Neon SQL Editor:

```sql
-- Add missing columns to customers table
BEGIN;

-- Core columns that are causing errors
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS branch_id UUID,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

-- Profile and contact fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Purchase tracking
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Referral tracking
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS referred_by UUID,
ADD COLUMN IF NOT EXISTS referrals JSONB DEFAULT '[]'::jsonb;

-- Call analytics fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_call_duration_minutes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS incoming_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS outgoing_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS missed_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_call_duration_minutes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_loyalty_level TEXT DEFAULT 'Basic',
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ DEFAULT now();

-- Branch management fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS preferred_branch_id UUID,
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[],
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated',
ADD COLUMN IF NOT EXISTS created_by_branch_id UUID,
ADD COLUMN IF NOT EXISTS created_by_branch_name TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_level ON customers(loyalty_level);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

COMMIT;
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

You should see all the columns listed, including:
- ✅ id
- ✅ branch_id  
- ✅ is_active
- ✅ total_spent
- ✅ is_shared
- And many more...

## Expected Result

After running the migration, your application should:
- ✅ No more "column does not exist" errors
- ✅ Customer data loads correctly
- ✅ Customer stats display properly
- ✅ All customer features work as expected

## Troubleshooting

### If you still get errors after migration:

1. **Check table exists:**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'customers';
   ```

2. **Check column existence:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'customers' AND column_name IN ('id', 'branch_id', 'is_active', 'total_spent');
   ```

3. **Clear browser cache and reload** the application

4. **Check Neon connection string** in your app matches the database where you ran the migration

## Notes

- ⚠️ This migration is safe to run multiple times (uses `IF NOT EXISTS`)
- ⚠️ The migration will NOT delete any existing data
- ⚠️ All new columns have sensible defaults
- ⚠️ Indexes are created for performance optimization

