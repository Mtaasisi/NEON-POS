# 📦 Complete Purchase Order Workflow Test Guide

This guide walks you through testing the complete purchase order workflow from creation to inventory import.

---

## ⚙️ Setup (Run Once)

### Step 1: Create Database Functions

Run the SQL script to create all required RPC functions:

```sql
-- Copy and paste the entire contents of:
COMPLETE-PURCHASE-ORDER-WORKFLOW.sql
```

**What it does:**
- Creates `lats_inventory_items` table (if not exists)
- Creates 6 RPC functions for the complete workflow
- Sets up indexes for performance

---

## 🧪 Testing the Complete Workflow

### Phase 1: Create Purchase Order ✅ (Already Working)

1. Navigate to: `http://localhost:3000/lats/purchase-order/create`
2. Click **"Select Supplier"**
3. Choose a supplier (e.g., "fgd")
4. Click on a product (e.g., "iPhone 15 Pro")
5. Enter a **Cost Price** (e.g., 1500000)
6. Click **"Add to Purchase Order"**
7. Click **"Create PO"**

**Expected Result:**
- ✅ Success message: "Purchase order created successfully"
- ✅ PO number generated (e.g., PO-1759861642920)
- ✅ Cart cleared

---

### Phase 2: View Purchase Order

1. Click **"View Orders"** button (or navigate to `/lats/purchase-orders`)
2. You should see your newly created PO in the list
3. Click on the PO to view details

**Expected Result:**
- ✅ PO details displayed
- ✅ Status: "draft" or "pending"
- ✅ Items list shows: iPhone 15 Pro, Qty: 1, Cost: TSh 1,500,000

---

### Phase 3: Receive Purchase Order (Import to Inventory)

On the Purchase Order Detail page:

1. Click **"Mark as Received"** or **"Complete Receive"** button
2. Optionally add receive notes
3. Confirm the action

**Expected Result:**
- ✅ Success message: "Purchase order received successfully"
- ✅ PO status changes to "received"
- ✅ Received date is set
- ✅ Items are marked as received

---

### Phase 4: Verify Inventory Update

Check that inventory was updated:

#### Method 1: Check Variant Stock
1. Navigate to: `/lats/unified-inventory`
2. Find "iPhone 15 Pro"
3. Check the stock quantity

**Expected:** Stock increased by the received quantity

#### Method 2: Check Inventory Adjustments
Run this SQL query:
```sql
SELECT * FROM lats_inventory_adjustments
WHERE reason LIKE '%purchase order%'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** New adjustment record showing the received quantity

#### Method 3: Check Inventory Items (if using serial numbers)
Run this SQL query:
```sql
SELECT * FROM lats_inventory_items
WHERE purchase_order_id = 'YOUR_PO_ID_HERE'
ORDER BY created_at DESC;
```

**Expected:** Individual inventory items created (if items have serial numbers)

---

## 🔄 Complete Workflow Summary

```
1. CREATE PO
   ├─ Select supplier
   ├─ Add products with cost prices
   └─ Generate PO number
   
2. VIEW PO
   ├─ See PO details
   ├─ Verify items and costs
   └─ Check status
   
3. RECEIVE PO (Import to Inventory)
   ├─ Click "Complete Receive"
   ├─ System calls: complete_purchase_order_receive()
   ├─ Updates PO status to "received"
   ├─ Updates variant stock quantities
   └─ Creates inventory adjustment records
   
4. VERIFY INVENTORY
   ├─ Check updated stock levels
   ├─ Verify inventory adjustments
   └─ Confirm items are available for sale
```

---

## 🛠️ Troubleshooting

### Error: "function complete_purchase_order_receive does not exist"
**Solution:** Run `COMPLETE-PURCHASE-ORDER-WORKFLOW.sql` in your Neon database

### Error: "User not authenticated"
**Solution:** Make sure you're logged in (email: care@care.com, pass: 123456)

### Error: "relation lats_inventory_items does not exist"
**Solution:** The SQL script creates this table. Make sure it ran successfully.

### Stock not updating
**Check:**
1. Query `lats_product_variants` to see if quantity increased
2. Query `lats_inventory_adjustments` to see adjustment records
3. Check console logs for SQL errors

---

## 📊 Database Functions Created

| Function | Purpose |
|----------|---------|
| `complete_purchase_order_receive` | Complete receive workflow (updates stock, creates adjustments) |
| `mark_po_as_received` | Simple status update to "received" |
| `get_received_items_for_po` | Get all items received for a PO |
| `get_purchase_order_receive_summary` | Get summary (ordered vs received) |
| `process_purchase_order_return` | Handle returns/damages |
| `get_purchase_order_returns` | Get all returns for a PO |

---

## ✅ Success Criteria

The workflow is successful when:

1. ✅ Purchase order is created without errors
2. ✅ PO appears in the orders list
3. ✅ Receive button works without errors
4. ✅ PO status changes to "received"
5. ✅ Variant stock quantity increases by received amount
6. ✅ Inventory adjustment record is created
7. ✅ Products are available for sale in POS

---

## 🎯 Next Steps After Testing

Once the workflow is confirmed working:

1. **Test with Multiple Items**: Add 3-4 different products to a single PO
2. **Test with Serial Numbers**: If using serialized items (phones, laptops)
3. **Test Partial Receive**: Receive only part of the order
4. **Test Returns**: Process damaged/wrong items
5. **Test Quality Check**: If implementing quality control

---

## 📝 Notes

- The system uses **lats_inventory_adjustments** to track all stock changes
- Each receive creates an adjustment of type "purchase_order"
- The **complete_purchase_order_receive** function is atomic (all-or-nothing)
- Stock levels are updated in **lats_product_variants.quantity**

---

## 🆘 Need Help?

If you encounter issues:
1. Check browser console for detailed error messages
2. Check Neon database logs
3. Verify all SQL functions exist: `SELECT proname FROM pg_proc WHERE proname LIKE '%purchase%order%';`
4. Test functions directly in SQL editor

---

**Created:** 2025-10-08  
**Version:** 1.0  
**Status:** Ready for testing

