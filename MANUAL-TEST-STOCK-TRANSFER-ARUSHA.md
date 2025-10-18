# 🧪 Manual Testing Guide: Stock Transfer to Arusha Branch

## 📋 Overview

This guide will help you test the stock transfer receive functionality at the Arusha branch.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Apply Database Fix

Run this SQL file to ensure all functions are in place:

```bash
# Copy the SQL content and run it in your database
# Or use psql:
psql "$VITE_DATABASE_URL" -f STOCK-TRANSFER-ARUSHA-FIX.sql
```

**What this does:**
- ✅ Creates Arusha branch (if not exists)
- ✅ Installs all stock transfer functions
- ✅ Fixes any missing database functions
- ✅ Sets up proper permissions

---

## 🚀 Manual Testing Steps

### Step 1: Start the Application

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
npm run dev
```

Open browser: **http://localhost:3000**

---

### Step 2: Login

- **Email:** `care@care.com`
- **Password:** `123456`

You should see the dashboard.

---

### Step 3: Switch to Main Branch (Source)

1. Look at top-right corner for branch selector
2. Click on it
3. Select **"Main Store"** or any branch that has inventory

![Branch Selector](https://via.placeholder.com/400x100/4F46E5/FFFFFF?text=Main+Store+%E2%96%BC)

**Why?** We need to send stock FROM a branch that has inventory.

---

### Step 4: Create Stock Transfer to Arusha

1. Navigate to **Stock Transfer** page (sidebar menu)
2. Click **"+ Create Transfer"** button
3. Fill in the form:
   - **From Branch:** Main Store (should be auto-selected)
   - **To Branch:** Arusha Branch
   - **Product:** Select any product with stock > 5
   - **Quantity:** 5 (or any number you have in stock)
   - **Notes:** "Test transfer to Arusha"
4. Click **"Create Transfer"**

✅ **Expected Result:**
- Success message: "Transfer created successfully"
- Transfer appears in the list with status "Pending"

---

### Step 5: Approve the Transfer (Still on Main Branch)

1. Find the transfer you just created in the list
2. Click on it to open details
3. Click **"Approve"** button
4. Confirm the action

✅ **Expected Result:**
- Success message: "Transfer approved"
- Status changes to "Approved"

**Optional:** You can also mark it **"In Transit"** by clicking that button.

---

### Step 6: Switch to Arusha Branch (Destination)

1. Click branch selector (top-right)
2. Select **"Arusha Branch"**
3. Wait for page to reload

![Switch to Arusha](https://via.placeholder.com/400x100/10B981/FFFFFF?text=Arusha+Branch+%E2%96%BC)

✅ **Expected Result:**
- Page reloads
- Branch selector now shows "Arusha Branch"

---

### Step 7: View Incoming Transfers

1. Navigate to **Stock Transfer** page
2. Click **"Received"** filter tab
3. You should see the transfer you created

![Received Tab](https://via.placeholder.com/600x80/3B82F6/FFFFFF?text=All+%7C+Sent+%7C+Received+%E2%9C%93+%7C+Pending+%7C+Approved)

✅ **Expected Result:**
- Transfer appears in "Received" list
- Shows status: "Approved" or "In Transit"
- Shows FROM branch name

---

### Step 8: Receive the Transfer (THE CRITICAL TEST!)

1. Click on the transfer to open details
2. You'll see a **"Receive"** or **"Complete"** button (green)
3. Click it
4. Confirm: "Receive 5 units from Main Store? This will move inventory to your branch."

⏳ **Processing...**

✅ **Expected Result:**
- Success message: "✅ Stock received successfully!" 
- Transfer status changes to "Completed"
- Modal closes

---

### Step 9: Verify Inventory Updated

1. Navigate to **Inventory** page (while still on Arusha branch)
2. Search for the product you transferred
3. Check the quantity

✅ **Expected Result:**
- Product should now show quantity = 5 (or whatever you transferred)
- If product existed before, quantity increased by transfer amount

---

### Step 10: Verify Source Branch Inventory

1. Switch back to **Main Store** branch
2. Navigate to **Inventory** page
3. Check the same product

✅ **Expected Result:**
- Product quantity should be reduced by 5
- Reserved quantity should be 0 (reservation released)

---

## 🐛 Common Issues & Solutions

### Issue 1: "Transfer not found" error

**Cause:** Database function not installed

**Fix:**
```bash
# Reapply the SQL fix
psql "$VITE_DATABASE_URL" -f STOCK-TRANSFER-ARUSHA-FIX.sql
```

---

### Issue 2: "Receive" button not showing

**Cause:** You're on the wrong branch or transfer not approved

**Fix:**
1. Make sure you switched to Arusha branch
2. Make sure transfer status is "Approved" or "In Transit"
3. Refresh the page (F5)

---

### Issue 3: "Insufficient stock" error

**Cause:** Source branch doesn't have enough stock

**Fix:**
1. Switch to source branch
2. Check inventory
3. Either:
   - Add more stock to source, OR
   - Reduce transfer quantity

---

### Issue 4: Inventory not updating

**Cause:** Browser cache or database connection issue

**Fix:**
1. Hard refresh browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. Check browser console for errors (F12)
3. Verify database connection

---

## ✅ Success Checklist

After testing, you should have:

- [ ] Created a transfer from Main Store to Arusha
- [ ] Approved the transfer (on Main Store)
- [ ] Switched to Arusha branch
- [ ] Saw incoming transfer in "Received" tab
- [ ] Successfully received/completed the transfer
- [ ] Verified inventory increased at Arusha
- [ ] Verified inventory decreased at Main Store
- [ ] No console errors in browser

---

## 📊 What to Check in Browser Console

Open DevTools (F12) → Console tab

**Good signs ✅:**
```
✅ [stockTransferApi] Completing transfer: [uuid]
✅ Transfer completed successfully
✅ Transfer completed with full details
```

**Bad signs ❌:**
```
❌ Error completing transfer
❌ Function does not exist
❌ Transfer completion failed
```

If you see errors, copy them and check the "Common Issues" section above.

---

## 🎯 Expected Workflow Summary

```
┌──────────────────────────────────────────────────────────┐
│                    STOCK TRANSFER FLOW                    │
└──────────────────────────────────────────────────────────┘

Main Store (Source):
  1. Create Transfer to Arusha (Qty: 5)
     → Status: Pending
     → Stock: 100 → 100 (reserved: 0 → 5)

  2. Approve Transfer
     → Status: Approved
     → Stock: 100 (reserved: 5)

  3. Mark In Transit (Optional)
     → Status: In Transit
     → Stock: 100 (reserved: 5)

Switch to Arusha Branch ✈️

Arusha (Destination):
  4. View Incoming Transfer
     → Shows in "Received" tab
     → Status: Approved/In Transit

  5. Receive Transfer (Complete)
     → Status: Completed
     → Arusha Stock: 0 → 5
     → Main Stock: 100 → 95 (reserved: 5 → 0)

✅ DONE! Stock successfully transferred!
```

---

## 🔍 Database Verification (Optional)

If you want to verify in the database directly:

```sql
-- Check transfer status
SELECT 
  id,
  status,
  quantity,
  completed_at
FROM branch_transfers
WHERE id = 'YOUR_TRANSFER_ID';

-- Check variant stock at Arusha
SELECT 
  v.variant_name,
  v.sku,
  v.quantity,
  v.reserved_quantity,
  b.name as branch
FROM lats_product_variants v
JOIN store_locations b ON v.branch_id = b.id
WHERE b.name LIKE '%Arusha%';
```

---

## 📞 Need Help?

If you encounter any issues not covered here:

1. Check browser console for errors (F12)
2. Check the SQL fix was applied successfully
3. Verify you're on the correct branch
4. Try refreshing the page
5. Check that both branches are active

---

## 🎉 Success!

If you completed all steps and everything works, congratulations! 🎊

The stock transfer system is working correctly and you can now:
- Transfer inventory between branches
- Track shipments
- Receive stock at destination branches
- Maintain accurate inventory across all locations

**Happy inventory management! 📦**

