# 🧪 Manual Testing Instructions

## Quick Test Options

You have **2 ways** to test the purchase order workflow:

---

## Option 1: 🤖 Automated SQL Test (RECOMMENDED)

**Time:** 2 minutes  
**Difficulty:** Easy

### Steps:

1. Open your **Neon SQL Editor**
2. Copy and paste: **`RUN-COMPLETE-WORKFLOW-TEST.sql`**
3. Click **Run**
4. Watch the magic happen! ✨

### Expected Output:

```
═══════════════════════════════════════════════════════
🧪 STARTING COMPLETE PURCHASE ORDER WORKFLOW TEST
═══════════════════════════════════════════════════════

📋 Step 1: Getting test data...
   ✅ Supplier ID: xxx
   ✅ Product ID: xxx
   ✅ Variant ID: xxx
   ✅ User ID: xxx

📊 Step 2: Checking stock levels BEFORE...
   📦 Stock BEFORE: 50

🛒 Step 3: Creating purchase order...
   ✅ PO Created: PO-TEST-1759862000
   ✅ PO Item Added: 10 units @ 15,000 each

🔍 Step 4: Verifying PO creation...
   ✅ PO exists in database
   ✅ PO items exist in database

📦 Step 5: RECEIVING purchase order...
   🔄 Calling complete_purchase_order_receive()...
   ✅ Receive result: {"success":true,"message":"Purchase order received successfully","items_received":1,"inventory_created":1}

✅ Step 6: Verifying PO status...
   ✅ PO status changed to "received"
   ✅ received_date was set

📋 Step 7: Verifying items were received...
   ✅ Items marked as received (10 units)

📊 Step 8: Verifying inventory adjustment...
   ✅ Inventory adjustment created (type: purchase_order, qty: 10)

📦 Step 9: Verifying stock levels AFTER...
   📦 Stock BEFORE: 50
   📦 Stock AFTER:  60
   📈 Stock CHANGE: +10
   ✅ Stock increased correctly by 10 units!

═══════════════════════════════════════════════════════
🎉 ALL TESTS PASSED! WORKFLOW IS WORKING CORRECTLY!
═══════════════════════════════════════════════════════
```

---

## Option 2: 👆 Manual UI Test

**Time:** 5 minutes  
**Difficulty:** Very Easy

### Phase 1: Create Purchase Order

1. Go to: **http://localhost:3000/lats/purchase-order/create**
2. Click **"Select Supplier"**
3. Choose any supplier (e.g., "fgd")
4. Click on a product (e.g., "iPhone 15 Pro")
5. Enter **Cost Price**: `1500000`
6. Click **"Add to Purchase Order"**
7. Click **"Create PO"**

✅ **Expected:** Success message, PO number generated

---

### Phase 2: Check Current Stock (BEFORE)

1. Go to: **http://localhost:3000/lats/unified-inventory**
2. Find "iPhone 15 Pro"
3. **Note the current stock quantity** (e.g., 50 units)

---

### Phase 3: Receive Purchase Order

1. Click **"View Orders"** (or go to `/lats/purchase-orders`)
2. Find your newly created PO
3. Click on it to open details
4. Click **"Complete Receive"** or **"Mark as Received"** button
5. Confirm the action

✅ **Expected:** 
- Success message
- PO status changes to "received"
- received_date is shown

---

### Phase 4: Verify Inventory Increased

1. Go back to: **http://localhost:3000/lats/unified-inventory**
2. Find "iPhone 15 Pro" again
3. **Check the stock quantity**

✅ **Expected:** Stock increased by the quantity you ordered (e.g., 50 → 51)

---

### Phase 5: Verify Database (Optional)

Run this in Neon SQL Editor:

```sql
-- Check recent inventory adjustments
SELECT 
  type,
  quantity,
  reason,
  created_at
FROM lats_inventory_adjustments
WHERE type = 'purchase_order'
ORDER BY created_at DESC
LIMIT 5;
```

✅ **Expected:** See your adjustment record

---

## 🎯 Success Checklist

Mark each when completed:

- [ ] PO created successfully
- [ ] PO appears in orders list
- [ ] "Complete Receive" button works
- [ ] PO status changes to "received"
- [ ] No errors in browser console
- [ ] Stock quantity increased
- [ ] Inventory adjustment created
- [ ] Products available in POS

---

## ❌ Troubleshooting

### "Complete Receive" button not found
- Check if PO status is "draft" or "pending"
- The button may be labeled differently ("Receive", "Mark as Received")

### Stock didn't increase
**Check:**
1. Browser console for errors
2. Network tab for 400 errors
3. Run SQL test to verify functions work

**Fix:**
```sql
-- Verify the function exists
SELECT proname FROM pg_proc WHERE proname = 'complete_purchase_order_receive';

-- If not found, re-run:
COMPLETE-PURCHASE-ORDER-WORKFLOW.sql
```

### Error: "function does not exist"
**Fix:** Re-run `COMPLETE-PURCHASE-ORDER-WORKFLOW.sql` in Neon

---

## 📊 Quick Verification Queries

### Check if receive worked:

```sql
-- Latest PO status
SELECT po_number, status, received_date, total_amount
FROM lats_purchase_orders
ORDER BY created_at DESC
LIMIT 3;

-- Stock levels
SELECT 
  p.name,
  pv.variant_name,
  pv.quantity as stock
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
WHERE p.name LIKE '%iPhone%'
ORDER BY p.name;

-- Recent adjustments
SELECT type, quantity, reason, created_at
FROM lats_inventory_adjustments
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 Next Steps After Successful Test

Once everything works:

1. ✅ Test with **multiple items** in one PO
2. ✅ Test with **different products**
3. ✅ Test **partial receives** (if implemented)
4. ✅ Test **returns/damages** (if needed)
5. ✅ Train your team on the workflow

---

## 📞 Report Results

After testing, report back with:
- ✅ Which test option you used
- ✅ Any errors encountered
- ✅ Screenshots of success (optional)
- ✅ Stock before/after values

---

**Happy Testing!** 🎉

