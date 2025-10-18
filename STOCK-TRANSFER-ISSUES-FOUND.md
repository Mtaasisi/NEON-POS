# 🚨 Stock Transfer & Inventory Connection Issues

## Critical Problems Identified

Based on my analysis of your codebase, here are the **CRITICAL ISSUES** preventing stock transfers from working properly:

---

## ❌ ISSUE #1: Incomplete Database Function (MOST CRITICAL!)

### Location
`SETUP-STOCK-TRANSFER-FUNCTION.sql` lines 97-102

### Problem
The `complete_stock_transfer_transaction()` function **ONLY reduces stock from source but NEVER adds it to destination!**

```sql
-- Lines 94-102 in SETUP-STOCK-TRANSFER-FUNCTION.sql
PERFORM reduce_variant_stock(v_transfer.entity_id, v_transfer.quantity);

-- Find or create variant at destination branch
-- For now, we'll just reduce stock from source  ⬅️ THIS IS THE PROBLEM!
-- In production, you'd want to:
-- 1. Check if variant exists at destination branch
-- 2. If yes, increase stock there
-- 3. If no, create a copy of the variant at destination branch

-- Mark transfer as completed  ⬅️ IT JUST MARKS COMPLETE WITHOUT ADDING STOCK!
```

### Impact
💥 **EVERY completed transfer LOSES inventory permanently!**
- Transfer 100 units from Branch A to Branch B
- Branch A: 200 → 100 ✅ (reduced)
- Branch B: 50 → 50 ❌ (NOT increased!)
- **Result: 100 units disappeared from the system!**

---

## ❌ ISSUE #2: Function Signature Mismatch

### Location
- **Frontend:** `src/lib/stockTransferApi.ts` line 645-649
- **Database:** `SETUP-STOCK-TRANSFER-FUNCTION.sql` line 68-70

### Problem
Frontend code calls the function with **2 parameters**, but the basic setup function only accepts **1 parameter**!

**Frontend Call:**
```typescript
// src/lib/stockTransferApi.ts:645
await supabase.rpc(
  'complete_stock_transfer_transaction',
  {
    p_transfer_id: transferId,      // ✅ Parameter 1
    p_completed_by: userId || null  // ❌ Parameter 2 - doesn't exist in basic function!
  }
);
```

**Basic Database Function:**
```sql
-- SETUP-STOCK-TRANSFER-FUNCTION.sql:68
CREATE OR REPLACE FUNCTION complete_stock_transfer_transaction(
  p_transfer_id UUID  -- ⬅️ ONLY 1 PARAMETER!
)
```

### Impact
🔥 **Function calls will FAIL with "unknown parameter" error!**

### What You Need
The function should accept:
```sql
CREATE OR REPLACE FUNCTION complete_stock_transfer_transaction(
  p_transfer_id UUID,
  p_completed_by UUID  -- ⬅️ THIS IS MISSING!
)
```

---

## ❌ ISSUE #3: Missing Helper Functions

### Problem
The frontend and documentation reference functions that may not exist in your database:

| Function | Purpose | Status |
|----------|---------|--------|
| `reserve_variant_stock()` | Reserve stock when transfer created | ⚠️ Unknown |
| `release_variant_stock()` | Release reservation on cancel/reject | ⚠️ Unknown |
| `find_or_create_variant_at_branch()` | Find/create variant at destination | ⚠️ Unknown |
| `check_duplicate_transfer()` | Prevent duplicate transfers | ⚠️ Unknown |

### Impact
Without these functions:
- ❌ No stock reservation (can oversell)
- ❌ Can't create variant at destination branch
- ❌ Duplicate transfers possible
- ❌ Cancelled transfers don't release stock

---

## ❌ ISSUE #4: Missing `reserved_quantity` Column

### Location
`lats_product_variants` table

### Problem
The stock reservation system requires a `reserved_quantity` column that may not exist in your database.

**Expected Schema:**
```sql
lats_product_variants (
  id UUID,
  variant_name TEXT,
  sku TEXT,
  quantity INTEGER,              -- Total stock
  reserved_quantity INTEGER,     -- ⬅️ THIS MAY BE MISSING!
  branch_id UUID
)
```

**How Stock Reservation Works:**
```
Available Stock = quantity - reserved_quantity

Example:
- quantity: 100
- reserved_quantity: 20 (from pending transfers)
- available: 80 (what can be sold/transferred)
```

### Impact
Without `reserved_quantity`:
- ❌ No way to track pending transfers
- ❌ Stock can be sold while transfer is pending
- ❌ Race conditions → negative inventory

---

## ❌ ISSUE #5: Incomplete Stock Movement Logging

### Location
`SETUP-STOCK-TRANSFER-FUNCTION.sql` lines 112-130

### Problem
The basic setup only logs **1 stock movement** (the outgoing) but not the incoming!

**Current Code:**
```sql
-- Only logs SOURCE movement (outgoing)
INSERT INTO lats_stock_movements (
  product_variant_id,
  movement_type,
  quantity,
  from_branch_id,
  to_branch_id,
  ...
) VALUES (
  v_transfer.entity_id,
  'transfer',
  -v_transfer.quantity,  -- Negative for outgoing
  ...
);
-- ⬅️ NO SECOND INSERT FOR DESTINATION!
```

**What's Needed:**
```sql
-- 1. Log source (outgoing)
INSERT INTO lats_stock_movements (...) -- qty: -100
-- 2. Log destination (incoming)  ⬅️ THIS IS MISSING!
INSERT INTO lats_stock_movements (...) -- qty: +100
```

### Impact
- ❌ Incomplete audit trail
- ❌ Can't reconcile inventory
- ❌ Destination branch has no record of receiving stock

---

## ❌ ISSUE #6: Missing Branch Tracking in Stock Movements

### Location
`lats_stock_movements` table

### Problem
The table may not have `from_branch_id` and `to_branch_id` columns.

**Expected Schema:**
```sql
lats_stock_movements (
  id UUID,
  variant_id UUID,
  movement_type TEXT,
  quantity NUMERIC,
  from_branch_id UUID,  -- ⬅️ MAY BE MISSING
  to_branch_id UUID,    -- ⬅️ MAY BE MISSING
  reference_id UUID,
  ...
)
```

### Impact
Without branch tracking:
- ❌ Can't see where stock came from
- ❌ Can't see where stock went
- ❌ Branch-level inventory reports impossible

---

## 🔍 What You Have vs What You Need

### What You Currently Have
Based on the files I reviewed:

| Component | Status | Notes |
|-----------|--------|-------|
| `branch_transfers` table | ✅ Exists | Transfer records |
| `lats_product_variants` table | ✅ Exists | Product inventory |
| `lats_stock_movements` table | ⚠️ Partial | May lack branch columns |
| `reduce_variant_stock()` | ✅ Exists | Reduces stock |
| `increase_variant_stock()` | ✅ Exists | Increases stock |
| `complete_stock_transfer_transaction()` | ❌ Incomplete | Missing critical logic |
| `reserve_variant_stock()` | ❌ Unknown | May not exist |
| `release_variant_stock()` | ❌ Unknown | May not exist |
| `find_or_create_variant_at_branch()` | ❌ Unknown | May not exist |

### What You Need (Complete System)

1. **Database Columns:**
   - ✅ `lats_product_variants.reserved_quantity`
   - ✅ `lats_stock_movements.from_branch_id`
   - ✅ `lats_stock_movements.to_branch_id`
   - ✅ `branch_transfers.rejection_reason`

2. **Database Functions:**
   - ✅ `reserve_variant_stock(variant_id, quantity)`
   - ✅ `release_variant_stock(variant_id, quantity)`
   - ✅ `reduce_variant_stock(variant_id, quantity)`
   - ✅ `increase_variant_stock(variant_id, quantity)`
   - ✅ `find_or_create_variant_at_branch(source_variant_id, target_branch_id)`
   - ✅ `check_duplicate_transfer(from_branch, to_branch, entity_id)`
   - ✅ `complete_stock_transfer_transaction(transfer_id, completed_by)` - **WITH 2 PARAMS!**

3. **Function Logic:**
   The `complete_stock_transfer_transaction()` must:
   - ✅ Validate transfer status
   - ✅ Reduce stock from source variant
   - ✅ Find or create variant at destination
   - ✅ Increase stock at destination variant
   - ✅ Release reservation at source
   - ✅ Log 2 stock movements (out + in)
   - ✅ Mark transfer as completed
   - ✅ Return success result

---

## 🎯 The Fix You Need

You have **TWO options**:

### Option A: Apply Complete Fix (RECOMMENDED)
Use the comprehensive fix file that already exists in your codebase:
```
🔧-COMPLETE-STOCK-TRANSFER-FIX.sql
```

This file appears to have ALL the fixes needed.

### Option B: Basic Function Fix Only
If you just want to fix the immediate issue, update `complete_stock_transfer_transaction()` to:
1. Accept 2 parameters (`p_transfer_id`, `p_completed_by`)
2. Actually add stock to destination (not just reduce from source)
3. Log both movements

---

## 🧪 How to Verify the Issue

Run this diagnostic script I created:
```
DIAGNOSTIC-STOCK-TRANSFER-CHECK.sql
```

This will check:
- ✅ All required functions exist
- ✅ Functions have correct parameters
- ✅ Tables have required columns
- ✅ Current transfer status
- ✅ Stock reservation status
- ✅ Function signatures match frontend calls

---

## 📊 Current System State

Based on documentation:
- **Approved Transfers:** 2 transfers waiting to complete
- **Reserved Stock:** 4 units currently reserved
- **Total Variants:** 73
- **Total Stock:** 2,241 units

**⚠️ WARNING:** If you complete those 2 approved transfers with the broken function:
- Stock will be **reduced** from source ✅
- Stock will **NOT be added** to destination ❌
- Result: **4 units will disappear from your system!**

---

## 🚀 Next Steps

1. **DO NOT complete any transfers yet!** (You'll lose inventory)

2. **Run the diagnostic:**
   ```sql
   -- In your Neon SQL editor:
   \i DIAGNOSTIC-STOCK-TRANSFER-CHECK.sql
   ```

3. **Apply the complete fix:**
   ```sql
   -- In your Neon SQL editor:
   \i 🔧-COMPLETE-STOCK-TRANSFER-FIX.sql
   ```

4. **Verify the fix:**
   - Re-run diagnostic
   - Test with a small transfer
   - Check both source and destination inventory

---

## 📝 Summary

| Issue | Severity | Impact |
|-------|----------|--------|
| Incomplete transfer function | 🔴 CRITICAL | Inventory loss |
| Function signature mismatch | 🔴 CRITICAL | Function calls fail |
| Missing reservation system | 🔴 CRITICAL | Overselling possible |
| Missing helper functions | 🟡 HIGH | Limited functionality |
| Incomplete audit logging | 🟡 HIGH | No audit trail |
| Missing branch tracking | 🟡 MEDIUM | Poor reporting |

**Bottom Line:** The stock transfer system is **NOT SAFE TO USE** in its current state. Every completed transfer will cause permanent inventory loss! 💥

You need to apply the complete fix before completing any transfers.

