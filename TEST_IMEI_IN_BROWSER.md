# 🧪 Test IMEI Creation in Web Browser

## Quick Test Steps (5 minutes)

### Step 1: Open the Application
1. Open your browser and go to: `http://localhost:5173` (or your app URL)
2. Login with your credentials

### Step 2: Create or Find a Purchase Order
1. Navigate to **Purchase Orders** from the left menu
2. Either:
   - **Create a new PO**: Click "Create" or "New Purchase Order"
   - **Use existing PO**: Find a PO with status "Sent", "Confirmed", or "Shipped"

### Step 3: Add Items to Purchase Order
1. Click **"Add Item"** button
2. Select a **Product** (e.g., iPhone, Samsung phone)
3. Select a **Variant** (e.g., "128GB", "Black", etc.) - This will be the parent variant
4. Enter **Quantity**: `3` (for testing with 3 IMEI numbers)
5. Enter **Unit Cost**: Any price (e.g., `150`)
6. Click **"Save"** or **"Add"**

### Step 4: Receive the Purchase Order
1. On the PO detail page, click **"Receive Items"** button
2. Select **"Full Receive"** or **"Partial Receive"**
3. Click **"Proceed to Receive"**

### Step 5: Enter IMEI/Serial Numbers
1. You should see a form to enter serial numbers/IMEIs
2. For each item, enter IMEI numbers (one per row):
   ```
   IMEI 1: 123456789012345
   IMEI 2: 234567890123456
   IMEI 3: 345678901234567
   ```
3. Or use serial numbers:
   ```
   Serial 1: SN-TEST-001
   Serial 2: SN-TEST-002
   Serial 3: SN-TEST-003
   ```
4. Fill in optional fields:
   - **Cost Price**: (auto-filled from PO)
   - **Selling Price**: (optional)
   - **Condition**: "new" (default)
   - **Location**: (optional)
   - **Notes**: (optional)

### Step 6: Set Pricing (if prompted)
1. Review the pricing for each item
2. Adjust if needed
3. Click **"Confirm"** or **"Save"**

### Step 7: Complete Receive
1. Click **"Confirm Receive"** or **"Complete Receive"**
2. Wait for success message

### Step 8: Verify Results
1. Check that the PO status changed to **"Received"**
2. Navigate to **Inventory** page
3. Find the product you received
4. You should see:
   - Parent variant with quantity = 3
   - 3 child variants with individual IMEI/Serial numbers
   - Each child variant should be active and available

## ✅ Expected Results

### In Purchase Order:
- Status: **"Received"**
- Items marked as received
- No errors in console

### In Inventory:
- Parent variant shows quantity: **3**
- 3 child variants created with:
  - IMEI/Serial numbers stored correctly
  - Quantity: **1** each
  - Status: **Active**
  - Cost and selling prices set correctly

### In Database:
- `lats_product_variants` table has:
  - 1 parent variant (variant_type = 'parent')
  - 3 child variants (variant_type = 'imei_child')
  - Each child has `parent_variant_id` pointing to parent
  - IMEI stored in `variant_attributes->>'imei'`
  - Serial number stored in `variant_attributes->>'serial_number'`

## 🐛 Troubleshooting

### Error: "column stock_quantity does not exist"
- ✅ **FIXED**: This was already fixed in the migration
- If you still see this, refresh the page and try again

### Error: "Parent variant not found"
- Make sure you selected a variant when adding items to PO
- The variant must exist in the database

### Items not showing in inventory
- Check browser console for errors
- Verify the receive completed successfully
- Check that parent variant quantity was updated
- Refresh the inventory page

### IMEI not saving
- Check that IMEI field is not empty
- Verify IMEI format (should be 15 digits, but accepts any text)
- Check browser console for errors

## 📝 Test Data Examples

### Test IMEI Numbers:
```
123456789012345
234567890123456
345678901234567
456789012345678
567890123456789
```

### Test Serial Numbers:
```
SN-TEST-001
SN-TEST-002
SN-TEST-003
SN-ABC-123
SN-XYZ-456
```

## 🎯 Success Criteria

✅ Purchase order received without errors  
✅ Parent variant quantity updated correctly  
✅ Child variants created with IMEI/Serial numbers  
✅ Items visible in inventory  
✅ No console errors  
✅ Database records created correctly  

---

**Note**: The system unifies IMEI and Serial Number - both fields store the same value for consistency.

