# 🎊 START HERE - Admin Test PO Utility

## 🎯 What Is This?

An **automatic admin testing utility** that creates complete Purchase Orders with products and variants for testing your POS system.

---

## ⚡ Run It Now (One Command)

```bash
npm run admin:create-test-po
```

**Done!** You now have:
- ✅ 1 Test Product
- ✅ 2 Variants
- ✅ 1 Purchase Order
- ✅ 4 PO Items (2 per variant)
- ✅ Total Value: TZS 2,300,000

---

## 📋 What Happens Next?

### Step 1: Console Output
```
🧪 ADMIN TEST UTILITY - Automatic PO Creation
======================================================================

📊 Step 1: Fetching existing database data...
✅ Found supplier: [Your Supplier]
✅ Found category: [Your Category]

📦 Step 2: Creating test product...
✅ Product created successfully!
   - ID: abc-123-def-456
   - Name: Test Phone 1729789234567
   - SKU: TEST-PROD-1729789234567

📦 Step 3: Creating 2 variants...
✅ Variants created successfully!
   1. 128GB Black (ID: xxx)
   2. 256GB Silver (ID: yyy)

📦 Step 4: Creating Purchase Order...
✅ PO Number: PO-ADMIN-TEST-1729789234567
✅ Total Amount: TZS 2,300,000

📦 Step 5: Adding PO items...
✅ 4 items added!

🎉 TEST PO CREATED SUCCESSFULLY!
```

### Step 2: Open Your App
```
http://localhost:5173
```

### Step 3: Find Your PO
1. Go to **Purchase Orders**
2. Look for **PO-ADMIN-TEST-[timestamp]**
3. Click to open

### Step 4: Test Receiving
1. Click **"Receive Items"**
2. Choose **"Full Receive"**
3. Add IMEIs if needed (15 digits each)
4. Confirm

### Step 5: Verify Stock
1. Go to **Products**
2. Find **Test Phone [timestamp]**
3. Check variants show **2 units each** ✅

---

## 📚 Need More Info?

### Quick Reference (1 page)
📄 **`⚡_QUICK_START_ADMIN_TEST.md`**
- Essential commands
- Quick verification
- Fast troubleshooting

### Complete Guide (10+ pages)
📖 **`🧪_ADMIN_TEST_PO_GUIDE.md`**
- Step-by-step tutorial
- SQL queries
- Troubleshooting
- Use cases

### Visual Guide
📊 **`📊_ADMIN_TEST_FLOWCHART.md`**
- Flowcharts
- Database diagrams
- Testing coverage

### System Overview
✅ **`✅_ADMIN_TEST_UTILITY_READY.md`**
- Complete system details
- Configuration
- Success criteria

### This Overview
🎯 **`🎯_ADMIN_TEST_README.md`**
- File structure
- Quick links
- Resources

---

## 🎮 Try It Now!

```bash
npm run admin:create-test-po
```

Then follow the console instructions!

---

## 💡 What You Get

### Test Product
```
Name: Test Phone [timestamp]
SKU: TEST-PROD-[timestamp]
```

### Variant 1
```
Name: 128GB Black
Cost: TZS 500,000
Selling: TZS 750,000
```

### Variant 2
```
Name: 256GB Silver
Cost: TZS 650,000
Selling: TZS 950,000
```

### Purchase Order
```
PO Number: PO-ADMIN-TEST-[timestamp]
Total: TZS 2,300,000
Items: 4 (2 per variant)
```

---

## 🧪 Complete Test Flow

```
1. Create Test Data
   ↓
   npm run admin:create-test-po
   ↓
2. Open UI
   ↓
   http://localhost:5173
   ↓
3. Find PO
   ↓
   Purchase Orders → PO-ADMIN-TEST-xxx
   ↓
4. Receive Items
   ↓
   Full Receive → Confirm
   ↓
5. Verify Stock
   ↓
   Products → Test Phone → 2 units ✅
   ↓
6. Test Sale
   ↓
   POS → Select Variant → Sell
   ↓
7. Verify Decrease
   ↓
   Stock: 2 → 1 ✅
```

---

## 🔧 Requirements

### Environment
```env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

### Database
- All tables must exist (migrations applied)
- At least one supplier (or utility creates one)

---

## 🆘 Issues?

### Script won't run
```bash
node admin-create-test-po.mjs
```

### PO not in UI
1. Refresh page
2. Check console for errors
3. Verify in database

### Wrong amounts
- Should be: TZS 2,300,000
- Check variant prices in console

---

## 🧹 Clean Up

```sql
-- Delete test POs
DELETE FROM lats_purchase_orders 
WHERE po_number LIKE 'PO-ADMIN-TEST-%';

-- Delete test products
DELETE FROM lats_products 
WHERE sku LIKE 'TEST-PROD-%';
```

---

## ✅ Success!

You should see:
- [x] Script runs without errors
- [x] Console shows all IDs
- [x] PO appears in UI
- [x] Can receive items
- [x] Stock updates to 2
- [x] Can sell items
- [x] Stock decreases

---

## 🚀 Ready?

```bash
npm run admin:create-test-po
```

**Go!** 🎉

---

**Quick Links:**
- 📄 [Quick Start](⚡_QUICK_START_ADMIN_TEST.md) - 1 page
- 📖 [Complete Guide](🧪_ADMIN_TEST_PO_GUIDE.md) - Full docs
- 📊 [Flowcharts](📊_ADMIN_TEST_FLOWCHART.md) - Visual
- 🎯 [README](🎯_ADMIN_TEST_README.md) - Overview

---

**Status**: ✅ Ready to Use  
**Run**: `npm run admin:create-test-po` 🚀

