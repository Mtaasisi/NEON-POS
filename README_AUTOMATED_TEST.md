# 🎯 Complete Automated Test Setup for PO-1761424582968

## ✅ Summary

I've created a complete automated testing solution for receiving Purchase Order **PO-1761424582968** with IMEI numbers in children variants.

---

## 📦 What's Been Created

### 1. **SQL Script to Create PO-1761424582968**
**File**: `create-po-1761424582968.sql`

Creates the purchase order with:
- PO Number: PO-1761424582968
- Status: Sent (ready to receive)
- 1 product with 3 units (for 3 IMEI numbers)
- Total: $450.00

### 2. **Automated Receive Script**
**File**: `auto-receive-existing-po.mjs`

Fully automated browser test that:
- ✅ Logs in as care@care.com
- ✅ Finds the purchase order
- ✅ Receives it with IMEI numbers
- ✅ Inputs sample IMEIs automatically
- ✅ Completes full workflow
- ✅ Generates screenshots
- ✅ Creates detailed test report

### 3. **Complete Guide**
**File**: `AUTOMATED_TEST_GUIDE.md`

Comprehensive guide with:
- Step-by-step instructions
- Troubleshooting guide
- Verification steps
- Manual receive guide (backup)

---

## 🚀 Quick Start (2 Options)

### Option A: Create PO via SQL (Recommended)

```bash
# 1. Run the SQL script in your database
# (Copy contents of create-po-1761424582968.sql and run in Supabase dashboard)

# 2. Run automated test
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
node auto-receive-existing-po.mjs
```

### Option B: Create PO Manually + Automated Receive

```bash
# 1. Create PO manually in UI (takes 2 minutes):
#    - Go to http://localhost:5173
#    - Login: care@care.com / 123456
#    - Purchase Orders → Create
#    - Add 1 product, quantity: 3
#    - Save as "Sent" status

# 2. Run automated test
node auto-receive-existing-po.mjs
```

---

## 📋 Step-by-Step Instructions

### Step 1: Create the Purchase Order

#### Method 1: Using SQL (Fastest)
1. Open Supabase Dashboard (or your database tool)
2. Go to SQL Editor
3. Copy the contents of `create-po-1761424582968.sql`
4. Run the script
5. Verify: Check that PO-1761424582968 appears with status "sent"

#### Method 2: Using UI
1. Open: http://localhost:5173
2. Login: care@care.com / password: 123456
3. Navigate to: Purchase Orders
4. Click: Create Purchase Order
5. Select: Any supplier
6. Add Item: Any product with variants
7. Set Quantity: 3 (for 3 IMEI numbers)
8. Set Unit Cost: Any amount
9. Save with status: "Sent"

### Step 2: Run Automated Test

```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
node auto-receive-existing-po.mjs
```

The script will:
1. **Login** automatically
2. **Find** PO-1761424582968 (or first "sent" PO)
3. **Click** "Receive Items"
4. **Select** "Full Receive"
5. **Fill** IMEI numbers:
   - 351234567890000
   - 351234567890001
   - 351234567890002
6. **Confirm** pricing
7. **Add** to inventory
8. **Generate** report and screenshots

### Step 3: Review Results

Check the generated files:
- `test-*.png` - Screenshots of each step
- `test-report-*.json` - Detailed test results

Expected output:
```
✅ Logged in
✅ Found PO: PO-1761424582968
✅ Clicked Receive Items
✅ Selected Full Receive
✅ Clicked Proceed
✅ Filled 3/3 IMEI numbers
✅ Clicked Confirm
✅ CLICKED ADD TO INVENTORY!
✅ PURCHASE ORDER RECEIVED SUCCESSFULLY!
✅ Status: RECEIVED
✅ ALL TESTS PASSED!
```

---

## ✅ Verification

### 1. Check PO Status
```
Go to: Purchase Orders → Search: PO-1761424582968
Expected: Status = "Received"
```

### 2. Check IMEI Variants in Database

Run this query:
```sql
SELECT 
  pv.id,
  pv.name,
  pv.sku,
  pv.quantity,
  pv.parent_variant_id,
  pv.variant_attributes->>'imei' as imei,
  p.name as product_name
FROM lats_product_variants pv
LEFT JOIN lats_products p ON p.id = pv.product_id
WHERE pv.variant_attributes->>'imei' IS NOT NULL
ORDER BY pv.created_at DESC
LIMIT 10;
```

Expected result:
- 3 child variants created
- Each with unique IMEI number
- Each linked to parent variant
- Each with quantity = 1

### 3. Check in UI
```
Go to: Inventory → Search for the product
Expected:
- Parent variant: Stock updated
- Expand to see child variants
- Each child shows its IMEI number
```

---

## 🔧 Troubleshooting

### Issue: "No purchase orders with 'sent' status found"

**Solution**: Create a PO first (see Step 1 above)

### Issue: Script fails to click buttons

**Solution**: 
1. Check screenshots in project folder
2. Increase wait times if needed
3. Verify dev server is running: http://localhost:5173

### Issue: IMEI numbers not appearing

**Solution**:
1. Check browser console (F12) for errors
2. Verify database function exists:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'add_imei_to_parent_variant';
   ```
3. If missing, run: `CRITICAL_FIX_RECEIVING_PO_IMEI.sql`

### Issue: Database connection timeout

**Solution**:
```bash
# Check DATABASE_URL
cat .env | grep DATABASE_URL

# Verify connection
node -e "require('dotenv').config(); console.log(process.env.VITE_DATABASE_URL ? '✅ OK' : '❌ Missing');"
```

---

## 📊 Test Report Example

Success:
```json
{
  "timestamp": "2025-10-25T10:30:00.000Z",
  "poNumber": "PO-1761424582968",
  "success": true,
  "totalIssues": 0,
  "issues": []
}
```

With Issues:
```json
{
  "timestamp": "2025-10-25T10:30:00.000Z",
  "poNumber": "PO-1761424582968",
  "success": false,
  "totalIssues": 1,
  "issues": [
    {
      "error": "Add to Inventory button not clickable"
    }
  ]
}
```

---

## 🎯 What Happens During Receive

### Workflow
```
1. Open PO-1761424582968
   ↓
2. Click "Receive Items"
   ↓
3. Select "Full Receive" (all 3 items)
   ↓
4. Click "Proceed to Receive"
   ↓
5. Serial Number Modal Opens
   ↓
6. Enter IMEI for each item:
   - Item 1: 351234567890000 ✓ IMEI detected
   - Item 2: 351234567890001 ✓ IMEI detected
   - Item 3: 351234567890002 ✓ IMEI detected
   ↓
7. Click "Confirm Pricing"
   ↓
8. Pricing Modal Opens
   ↓
9. Click "Confirm & Add to Inventory"
   ↓
10. Database Operations:
    - Create 3 child variants
    - Each with unique IMEI
    - Link to parent variant
    - Update parent stock (+3)
    - Record stock movements
    - Update PO status → "Received"
   ↓
11. ✅ Success!
```

### Database Changes

**Before Receive**:
```
lats_purchase_orders:
  - PO-1761424582968: status = "sent"

lats_product_variants:
  - Parent Variant ABC: quantity = 0
```

**After Receive**:
```
lats_purchase_orders:
  - PO-1761424582968: status = "received"

lats_product_variants:
  - Parent Variant ABC: quantity = 3, is_parent = true
    └── Child Variant 1: IMEI 351234567890000, qty = 1
    └── Child Variant 2: IMEI 351234567890001, qty = 1
    └── Child Variant 3: IMEI 351234567890002, qty = 1

lats_stock_movements:
  - 3 entries for "purchase_order_receive"
```

---

## 🎓 Understanding the IMEI System

### Parent-Child Variant Structure

```
Product: iPhone 15
  ├── Variant: 128GB Silver (PARENT) - Stock: 3
  │     ├── IMEI: 351234567890000 - Status: Available
  │     ├── IMEI: 351234567890001 - Status: Available
  │     └── IMEI: 351234567890002 - Status: Available
  └── Variant: 256GB Black (PARENT) - Stock: 0
```

### Key Features

1. **Auto-Detection**: System detects 15-digit numbers as IMEI
2. **Duplicate Prevention**: Can't add same IMEI twice
3. **Stock Sync**: Parent stock = sum of all children
4. **Searchable**: Can search by IMEI in inventory
5. **Traceable**: Full history of IMEI through system

---

## 📞 Need Help?

### Check These First:
1. ✅ Dev server running? http://localhost:5173
2. ✅ Database connected? Check .env file
3. ✅ PO exists with "sent" status?
4. ✅ Browser console errors? (F12)
5. ✅ Screenshots generated? Check test-*.png files

### Debug Commands:
```bash
# Check if dev server is running
lsof -i :5173

# Check database URL
cat .env | grep DATABASE_URL

# List all POs
psql "$DATABASE_URL" -c "SELECT po_number, status FROM lats_purchase_orders ORDER BY created_at DESC LIMIT 5;"

# Check IMEI function exists
psql "$DATABASE_URL" -c "SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%imei%';"
```

---

## 🎉 Success Indicators

You'll know everything worked when you see:

✅ Terminal output:
```
✅ Logged in
✅ Found PO: PO-1761424582968
✅ Filled 3/3 IMEI numbers
✅ CLICKED ADD TO INVENTORY!
✅ PURCHASE ORDER RECEIVED SUCCESSFULLY!
✅ Status: RECEIVED
✅ ALL TESTS PASSED!
```

✅ Screenshots show:
- Logged in dashboard
- PO detail page
- IMEI modal with filled numbers
- Success confirmation

✅ Test report shows:
```json
{
  "success": true,
  "totalIssues": 0
}
```

✅ In database:
- PO status = "received"
- 3 child variants created
- Each has unique IMEI
- Parent stock = 3

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `auto-receive-existing-po.mjs` | Main automated test script |
| `create-po-1761424582968.sql` | SQL to create test PO |
| `AUTOMATED_TEST_GUIDE.md` | Complete testing guide |
| `README_AUTOMATED_TEST.md` | This file - quick start guide |
| `test-*.png` | Screenshots (generated during test) |
| `test-report-*.json` | Test results (generated during test) |

---

## 🚀 Next Steps

1. **Create PO** (SQL or manually)
2. **Run test**: `node auto-receive-existing-po.mjs`
3. **Review results** (screenshots + report)
4. **Verify** in UI and database

---

*Last Updated: October 25, 2025*  
*Test Environment: http://localhost:5173*  
*Login: care@care.com / 123456*  
*Database: Neon PostgreSQL*

---

## ✅ Ready to Test!

Everything is set up and ready. Just run:

```bash
node auto-receive-existing-po.mjs
```

The script will handle everything automatically! 🎉

