# 📋 Manual Steps to Test IMEI Receive (2 Minutes)

Since automated PO creation is having issues with the UI, here's the quickest manual approach:

## ✅ Step 1: Create Purchase Order (1 minute)

1. **Open browser**: http://localhost:5173
2. **Login**: care@care.com / 123456
3. **Navigate**: Click "Purchase Orders" in left menu
4. **Create**: Click "Create" or "New Purchase Order" button
5. **Fill in**:
   - **Supplier**: Select any supplier from dropdown
   - **Status**: Make sure it's NOT "Draft" - should be "Sent" or "Confirmed"
   - Click **"Add Item"** button
   - **Product**: Select any product (e.g., iPhone, Samsung)
   - **Variant**: Select a variant (e.g., 128GB, Color Black)
   - **Quantity**: Enter `3` (for 3 IMEI numbers)
   - **Unit Cost**: Enter any price (e.g., 150)
6. **Save**: Click "Create" or "Save" button
7. **Note the PO Number**: Write down the PO number shown (e.g., PO-1234567890)

## ✅ Step 2: Run Automated Receive Test (30 seconds)

```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
node auto-receive-existing-po.mjs
```

The browser will:
- Login automatically ✅
- Find your PO ✅
- Click "Receive Items" ✅
- Select "Full Receive" ✅
- Fill in 3 IMEI numbers automatically ✅
- Complete the receive process ✅
- Generate report and screenshots ✅

## ✅ Expected Result

```
✅ Logged in
✅ Found PO: PO-1234567890
✅ Clicked Receive Items
✅ Filled 3/3 IMEI numbers:
   - 351234567890000
   - 351234567890001
   - 351234567890002
✅ PURCHASE ORDER RECEIVED SUCCESSFULLY!
✅ Status: RECEIVED
✅ ALL TESTS PASSED!
```

## ✅ Verify Results

1. **Check PO Status**: Should be "Received"
2. **Check Inventory**: 3 child variants created with IMEIs
3. **Run verification**: 
   ```bash
   node verify-imei-variants.mjs
   ```

---

## 🎯 Alternative: Manual Receive with IMEI (Full Manual)

If you want to test manually:

1. **Open PO** you just created
2. **Click** "Receive Items"
3. **Select** "Full Receive"
4. **Click** "Proceed to Receive"
5. **Enter IMEI numbers** (one per row):
   - Row 1: `351234567890000`
   - Row 2: `351234567890001`
   - Row 3: `351234567890002`
6. System will show "✓ IMEI detected" for each
7. **Click** "Confirm Pricing"
8. **Click** "Confirm & Add to Inventory"
9. **Done!** ✅

Check inventory to see 3 child variants with IMEIs!

---

**Time Required**:
- Manual PO Creation: ~1 minute
- Automated Receive: ~30 seconds
- **Total: ~2 minutes** ⚡

