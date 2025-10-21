# Setup Guide - Purchase Order & Inventory Verification

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Or if you have the old template:
cp ".env copy" .env
```

### Step 2: Add Your Supabase Credentials

Edit the `.env` file and add your credentials:

```bash
# Open the file in your editor
nano .env
# or
code .env
# or
vim .env
```

Add these two lines with YOUR actual values:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_KEY_HERE
```

**Where to find these values:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click Settings (⚙️) → API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`

### Step 3: Run Verification

```bash
node verify-po-inventory-setup.js
```

This will check:
- ✓ All required database tables exist
- ✓ Critical database functions installed
- ✓ Inventory sync trigger active
- ✓ Data integrity

### Step 4: Fix Any Issues

The script will tell you exactly what to do. Common fixes:

```bash
# If receive function missing:
node run-complete-receive-migration.js

# If inventory out of sync:
node diagnose-and-fix-inventory-sync.js

# If quality check functions missing:
psql $DATABASE_URL -f migrations/create_quality_check_system.sql
```

---

## 🔧 Manual Verification (If Script Fails)

If you can't run the verification script, check manually:

### Check 1: Database Function Exists

```sql
-- Run this in your Supabase SQL Editor:

SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'complete_purchase_order_receive'
AND routine_schema = 'public';

-- Should return one row
-- If empty, run: migrations/create_complete_purchase_order_receive_function.sql
```

### Check 2: Inventory Sync Trigger

```sql
-- Run this in your Supabase SQL Editor:

SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%sync_variant%';

-- Should return 2 rows (insert/update and delete triggers)
-- If empty, run: migrations/create_inventory_sync_trigger.sql
```

### Check 3: Tables Exist

```sql
-- Run this in your Supabase SQL Editor:

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'lats_purchase_orders',
  'lats_purchase_order_items',
  'inventory_items',
  'lats_product_variants',
  'lats_stock_movements'
)
ORDER BY table_name;

-- Should return 5 rows
```

### Check 4: Inventory Sync Status

```sql
-- Run this in your Supabase SQL Editor:

SELECT 
  p.name as product_name,
  pv.sku as variant_sku,
  pv.quantity as shown_quantity,
  (SELECT COUNT(*) FROM inventory_items 
   WHERE variant_id = pv.id AND status = 'available') as actual_quantity,
  pv.quantity - (SELECT COUNT(*) FROM inventory_items 
   WHERE variant_id = pv.id AND status = 'available') as difference
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE pv.quantity != (
  SELECT COUNT(*) FROM inventory_items 
  WHERE variant_id = pv.id AND status = 'available'
)
LIMIT 20;

-- If this returns rows, your inventory is out of sync
-- Fix: node diagnose-and-fix-inventory-sync.js
```

---

## 🧪 Test the System

### Test 1: Create and Receive a Purchase Order

```
1. Go to Purchase Orders → Create New
2. Add a product (e.g., 10 units)
3. Save as Draft
4. Click "Send" button
5. Click "Confirm" (if status allows)
6. Click "Mark as Shipped"
7. Click "Receive Full Order"

Expected Result:
✓ Status changes to 'received'
✓ Received Items tab shows 10 items
✓ Product inventory increases by 10
✓ Product available in POS
```

### Test 2: Check Inventory Updated

```sql
-- After receiving, run this query:

SELECT 
  p.name,
  pv.quantity,
  COUNT(ii.id) as items_in_inventory
FROM lats_products p
JOIN lats_product_variants pv ON pv.product_id = p.id
LEFT JOIN inventory_items ii ON ii.variant_id = pv.id 
  AND ii.status = 'available'
GROUP BY p.name, pv.quantity
LIMIT 10;

-- quantity and items_in_inventory should match
```

---

## 🚨 Troubleshooting

### Problem: "Cannot find module '@supabase/supabase-js'"

**Solution:**
```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

### Problem: "Missing Supabase credentials"

**Solution:**
1. Make sure `.env` file exists in project root
2. Make sure it contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Make sure the values are correct (no quotes, no spaces)

Example of correct `.env` file:
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MTk5OTk5OTk5OX0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Problem: "Receive button doesn't work"

**Solution:**
```bash
# Install the receive function:
node run-complete-receive-migration.js

# Or manually:
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of: migrations/create_complete_purchase_order_receive_function.sql
# 3. Paste and run
```

### Problem: "Items received but quantity shows 0"

**Solution:**
```bash
# Fix inventory sync:
node diagnose-and-fix-inventory-sync.js

# Or manually install trigger:
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of: migrations/create_inventory_sync_trigger.sql
# 3. Paste and run
```

---

## 📋 Complete Setup Checklist

Before using the system:

- [ ] Created `.env` file with Supabase credentials
- [ ] Ran `node verify-po-inventory-setup.js` successfully
- [ ] All required tables exist
- [ ] `complete_purchase_order_receive` function exists
- [ ] `sync_variant_quantity` trigger is active
- [ ] Tested creating and receiving a PO
- [ ] Verified inventory updated correctly
- [ ] Can sell received items in POS

---

## 📞 Still Need Help?

### Read the Documentation:
1. `PURCHASE-ORDER-INVENTORY-CHECK-README.md` - Overview
2. `PURCHASE-ORDER-INVENTORY-SUMMARY.md` - Quick reference
3. `PURCHASE-ORDER-INVENTORY-ANALYSIS.md` - Technical details

### Run These Scripts:
```bash
# Check database tables:
node check-database-tables.js

# Test receive function:
node check-receive-function.js

# Fix inventory sync:
node diagnose-and-fix-inventory-sync.js
```

### Manual SQL Checks:

**Test receive function:**
```sql
-- This should NOT error:
SELECT complete_purchase_order_receive(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'test'
);
-- Expected: Error about PO not found (function exists)
-- Problem: "function does not exist" (function missing)
```

**Check sync trigger:**
```sql
SELECT 
  trigger_name, 
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'inventory_items';
```

---

## ✅ Success Indicators

Your system is ready when:

1. **Verification Script Passes**
   ```bash
   node verify-po-inventory-setup.js
   # Shows: ✅ OVERALL STATUS: PASS
   ```

2. **Receive Works**
   - Click "Receive Full Order"
   - Received Items tab shows items
   - Inventory quantity increases

3. **Inventory Synced**
   - `inventory_items` count matches `variant.quantity`
   - No discrepancies in sync check

4. **Can Sell Items**
   - Received items appear in POS
   - Can complete sale
   - Inventory decreases after sale

---

**Setup Guide Version 1.0**  
**Created:** October 20, 2025  
**For:** POS Main NEON DATABASE

