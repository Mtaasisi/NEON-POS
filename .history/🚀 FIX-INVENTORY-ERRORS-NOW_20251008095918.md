# 🚀 Fix Inventory RPC Errors - Quick Guide

## What's Wrong?
Your purchase order system is trying to call these RPC functions:
- `get_received_items_for_po` ❌ FAILING
- `get_inventory_items` ❌ FAILING

These errors are causing the retries you're seeing in the console.

## Quick Fix (2 minutes)

### Step 1: Run the Fix Script
1. Open your **Neon Database Console**
2. Go to the **SQL Editor**
3. Open the file: `FIX-INVENTORY-RPC-FUNCTIONS.sql`
4. Copy all the contents
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 2: Verify It Worked
After running the script, you should see:
```
✅ Created inventory_items table
✅ Created serial_number_movements table
✅ Fixed get_received_items_for_po function
✅ Fixed get_inventory_items function
```

At the bottom of the output, you should see test results like:
```
Testing get_received_items_for_po...
received_items_function_test: 0

Testing get_inventory_items...
inventory_items_function_test: 0
```

(The counts will be 0 if you don't have any inventory items yet - that's fine!)

### Step 3: Refresh Your App
1. Go back to your app
2. Press **Cmd/Ctrl + R** to refresh
3. Try viewing the purchase order again

## What This Script Does

1. **Creates the `inventory_items` table** - stores individual items with serial numbers
2. **Creates the `serial_number_movements` table** - tracks item movements
3. **Fixes `get_received_items_for_po`** - fetches received items with product details
4. **Fixes `get_inventory_items`** - fetches inventory with filters

## After the Fix

You should see these messages in the console instead:
```
✅ Batch 1 returned 10 variants
✅ Batch 2 returned 6 variants
✅ [PurchaseOrderService] Purchase order items fetched: {total: 1}
✅ [PurchaseOrderService] Received items fetched: {total: 0}
```

No more retry errors! 🎉

## Need Help?

If you still see errors after running the script:
1. Check the SQL Editor output for any error messages
2. Take a screenshot and let me know what you see
3. I'll help you fix it!

---

**Note:** This script is safe to run multiple times. It won't break anything if the tables/functions already exist.

