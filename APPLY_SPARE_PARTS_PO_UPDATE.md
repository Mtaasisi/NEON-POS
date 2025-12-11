# Apply Spare Parts PO Update - Step by Step Guide

## Overview
This guide will help you update the `complete_purchase_order_receive` database function to handle spare parts stock updates.

## Prerequisites
- PostgreSQL database access (you have the connection string)
- Database admin privileges or ability to run migrations
- Backup of current database (recommended)

## Step 1: Backup Current Function

Before making changes, backup the current function:

```sql
-- Connect to your database and run:
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'complete_purchase_order_receive';
```

Save the output to a file (e.g., `complete_purchase_order_receive_backup.sql`)

## Step 2: Verify Current Schema

Make sure your `lats_purchase_order_items` table has the required columns:

```sql
-- Check if item_type and part_number columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lats_purchase_order_items' 
  AND column_name IN ('item_type', 'part_number');
```

If these columns don't exist, you'll need to add them first:

```sql
-- Add item_type column if missing
ALTER TABLE lats_purchase_order_items 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'product';

-- Add part_number column if missing
ALTER TABLE lats_purchase_order_items 
ADD COLUMN IF NOT EXISTS part_number VARCHAR(255);
```

## Step 3: Apply the Migration

Run the migration script:

```bash
# Option 1: Using psql command line
psql "postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" -f migrations/UPDATE_PO_RECEIVE_FOR_SPARE_PARTS.sql

# Option 2: Copy and paste the SQL into your database client
# Open the file: migrations/UPDATE_PO_RECEIVE_FOR_SPARE_PARTS.sql
# Copy all contents and run in your database client
```

## Step 4: Verify the Update

After running the migration, verify it worked:

```sql
-- 1. Check function exists
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'complete_purchase_order_receive';

-- 2. Check function comment
SELECT obj_description(oid, 'pg_proc') 
FROM pg_proc 
WHERE proname = 'complete_purchase_order_receive';
```

## Step 5: Test the Function

Create a test purchase order with spare parts and receive it:

```sql
-- Example test (adjust IDs to match your data)
-- 1. Create a test PO with spare parts
-- 2. Receive it
SELECT complete_purchase_order_receive(
  'your-po-id-here'::UUID,
  'your-user-id-here'::UUID,
  'Test receive with spare parts'
);

-- 3. Verify spare parts stock was updated
SELECT id, name, part_number, quantity 
FROM lats_spare_parts 
WHERE id IN (
  SELECT product_id 
  FROM lats_purchase_order_items 
  WHERE purchase_order_id = 'your-po-id-here' 
    AND item_type = 'spare-part'
);
```

## What Changed

The updated function now:
1. ✅ Reads `item_type` and `part_number` from purchase order items
2. ✅ Checks if item is a spare part (`item_type = 'spare-part'`)
3. ✅ Updates `lats_spare_parts.quantity` for spare parts
4. ✅ Updates `lats_product_variants.quantity` for regular products
5. ✅ Creates stock movement records for both types
6. ✅ Tracks stock updates in audit log

## Troubleshooting

### Error: Column "item_type" does not exist
**Solution:** Run the ALTER TABLE statements in Step 2 to add the missing columns.

### Error: Function already exists
**Solution:** The `CREATE OR REPLACE` should handle this, but if you get errors, drop the function first:
```sql
DROP FUNCTION IF EXISTS complete_purchase_order_receive(UUID, UUID, TEXT);
```

### Error: Permission denied
**Solution:** Make sure you're running as a user with CREATE FUNCTION privileges, or use SECURITY DEFINER (which the function already has).

## Rollback

If you need to rollback:

1. Restore the function from your backup (Step 1)
2. Or restore from version control if you have it

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify all prerequisites are met
3. Check that the schema matches expectations
4. Review the function definition in the migration file

## Next Steps

After applying this migration:
- ✅ Test with a real purchase order containing spare parts
- ✅ Verify stock updates correctly
- ✅ Check stock movement records are created
- ✅ Monitor for any issues in production

---

**File:** `migrations/UPDATE_PO_RECEIVE_FOR_SPARE_PARTS.sql`
**Date:** 2025-01-07
**Status:** Ready to apply
