# 🚀 Quick Fix: Purchase Order Receive Issue

## Problem
Clicking "Receive Order" doesn't create inventory items (shows 0 items).

## Solution
Run this ONE command:

```bash
node run-complete-receive-migration.js
```

### Alternative: Manual SQL (if script fails)

1. Open Supabase SQL Editor
2. Copy and paste the SQL from:
   `migrations/create_complete_purchase_order_receive_function.sql`
3. Click "Run"

## Verify It Worked

1. Go to a purchase order with status "shipped"
2. Make sure it's marked as "paid"
3. Click "Receive Full Order"
4. Check "Received Items" tab
5. Should now show items! ✅

## What This Fixes

- ✅ Creates inventory items when receiving orders
- ✅ Updates stock levels
- ✅ Shows items in "Received Items" tab
- ✅ Products become available for sale

## Files Created

- `migrations/create_complete_purchase_order_receive_function.sql` - The fix
- `run-complete-receive-migration.js` - Script to apply it
- `PURCHASE-ORDER-RECEIVE-FIX.md` - Detailed documentation

---

**Need help?** Read `PURCHASE-ORDER-RECEIVE-FIX.md` for detailed instructions.

