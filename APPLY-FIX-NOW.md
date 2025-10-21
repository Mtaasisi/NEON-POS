# 🚀 Apply Inventory Accumulation Fix

## Quick Command

Run this command in your terminal:

```bash
psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -f fix-inventory-accumulation.sql
```

## Or Interactive Mode

```bash
# Connect to database
psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# Then paste the contents of fix-inventory-accumulation.sql
\i fix-inventory-accumulation.sql
```

## What This Does

✅ Fixes inventory to **ADD UP** (not replace)  
✅ Syncs all current inventory to correct totals  
✅ Installs trigger for future receives  

## After Running

You should see output like:
```
NOTICE: Fixed: Product A | Was: 0 | Now: 15 | Added/Fixed: 15
NOTICE: Fixed: Product B | Was: 10 | Now: 25 | Added/Fixed: 15
✅ INVENTORY ACCUMULATION FIX COMPLETE!
```

Then test by receiving a new PO - stock will ADD to current amount! 🎉

