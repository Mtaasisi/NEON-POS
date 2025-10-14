# 📊 Stock Transfer → Inventory Relationship

## Complete Workflow & Inventory Impact

### 🔄 Stock Transfer Lifecycle & Inventory Changes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     STOCK TRANSFER WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

1️⃣ CREATE TRANSFER (Pending)
   ├─ Status: "pending"
   ├─ Inventory Impact:
   │  └─ ✅ RESERVES stock at source branch
   │     - quantity: 100 → 100 (unchanged)
   │     - reserved_quantity: 0 → 10 (increased)
   │     - available: 100 → 90 (reduced by reservation)
   └─ Function: reserve_variant_stock(variant_id, quantity)

↓

2️⃣ APPROVE TRANSFER ✅ (Approved)
   ├─ Status: "pending" → "approved"
   ├─ Inventory Impact:
   │  └─ ⚠️ NO IMMEDIATE INVENTORY CHANGE
   │     - Stock stays RESERVED at source
   │     - No physical movement yet
   └─ Notes:
      - Sets approved_by, approved_at
      - Stock remains reserved
      - Waiting for "Complete" action

↓

3️⃣ MARK IN TRANSIT 🚚 (Optional)
   ├─ Status: "approved" → "in_transit"
   ├─ Inventory Impact:
   │  └─ ⚠️ NO INVENTORY CHANGE
   │     - Stock still reserved
   │     - Physical goods en route
   └─ Purpose: Track physical shipment

↓

4️⃣ COMPLETE TRANSFER ✅✅ (Completed) **ACTUAL INVENTORY MOVEMENT**
   ├─ Status: "approved/in_transit" → "completed"
   ├─ Inventory Impact:
   │  ├─ 📉 SOURCE BRANCH (From):
   │  │  - quantity: 100 → 90 (reduced by transfer qty)
   │  │  - reserved_quantity: 10 → 0 (reservation released)
   │  │  - Stock movement logged: -10 units
   │  │
   │  └─ 📈 DESTINATION BRANCH (To):
   │     - Find or create variant at destination
   │     - quantity: 50 → 60 (increased by transfer qty)
   │     - Stock movement logged: +10 units
   │
   └─ Function: complete_stock_transfer_transaction(transfer_id, user_id)
      ├─ Calls: reduce_variant_stock() on source
      ├─ Calls: find_or_create_variant_at_branch() for destination
      ├─ Calls: increase_variant_stock() on destination
      └─ Creates 2 stock movement records (out + in)

```

---

## 📋 Current Status After APPROVE (Not Complete)

### What Just Happened:
```sql
-- Your transfer was approved but NOT completed yet
-- Current state:

Status: "pending" → "approved" ✅
approved_by: [user_id]
approved_at: [timestamp]

-- Source Branch Inventory:
quantity: 100 (unchanged)
reserved_quantity: 10 (still reserved from creation)
available: 90 (100 - 10)

-- Destination Branch Inventory:
No change yet! ⚠️
```

### ⚠️ IMPORTANT: Approval ≠ Inventory Movement

**APPROVE** only changes the transfer status. 
**COMPLETE** actually moves the inventory!

---

## 🎯 Next Steps to Move Inventory

### Option A: Complete Transfer Immediately
```javascript
// Call this to actually move the inventory
await completeStockTransfer(transferId, userId);
```

This will:
1. ✅ Deduct stock from source branch (100 → 90)
2. ✅ Add stock to destination branch (50 → 60)
3. ✅ Release reservation at source
4. ✅ Create stock movement audit trail
5. ✅ Change status to "completed"

### Option B: Mark In Transit First (Optional)
```javascript
// 1. Mark as in transit
await markTransferInTransit(transferId);

// 2. Later, when goods arrive...
await completeStockTransfer(transferId, userId);
```

---

## 📊 Database Functions & Inventory Relations

### Reserve Stock (On Create)
```sql
CREATE OR REPLACE FUNCTION reserve_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE lats_product_variants
  SET reserved_quantity = COALESCE(reserved_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql;
```

### Complete Transfer (Actual Movement)
```sql
CREATE OR REPLACE FUNCTION complete_stock_transfer_transaction(
  p_transfer_id UUID,
  p_completed_by UUID
)
RETURNS JSONB AS $$
BEGIN
  -- 1. Reduce stock from source
  PERFORM reduce_variant_stock(source_variant_id, quantity);
  
  -- 2. Increase stock at destination
  PERFORM increase_variant_stock(dest_variant_id, quantity);
  
  -- 3. Log movements (2 records: out + in)
  INSERT INTO lats_stock_movements (...) -- Source: -qty
  INSERT INTO lats_stock_movements (...) -- Destination: +qty
  
  -- 4. Update transfer status to 'completed'
  UPDATE branch_transfers SET status = 'completed';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔍 How to Check Current Inventory State

### Check Variant Stock at Source
```sql
SELECT 
  id,
  variant_name,
  sku,
  quantity as total_stock,
  reserved_quantity,
  (quantity - COALESCE(reserved_quantity, 0)) as available_stock,
  branch_id
FROM lats_product_variants
WHERE id = '[variant_id]';
```

### Check Transfer Status
```sql
SELECT 
  id,
  status,
  quantity,
  from_branch_id,
  to_branch_id,
  requested_at,
  approved_at,
  completed_at
FROM branch_transfers
WHERE id = '[transfer_id]';
```

### Check Stock Movements
```sql
SELECT 
  movement_type,
  quantity,
  previous_quantity,
  new_quantity,
  from_branch_id,
  to_branch_id,
  created_at,
  notes
FROM lats_stock_movements
WHERE reference_id = '[transfer_id]'
ORDER BY created_at DESC;
```

---

## 🚨 Common Scenarios

### Scenario 1: Cancel After Approval
```javascript
// Releases reserved stock
await cancelStockTransfer(transferId, reason);
```
Result:
- Status → "cancelled"
- Reserved stock released (10 → 0)
- Available stock restored (90 → 100)
- No inventory movement

### Scenario 2: Reject Instead of Approve
```javascript
// At approval stage, reject instead
await rejectStockTransfer(transferId, userId, reason);
```
Result:
- Status → "rejected"
- Reserved stock released
- No inventory movement
- Transfer request denied

---

## 📊 Visual Summary

```
STOCK STATES THROUGH WORKFLOW:

CREATE (pending):
├─ Source: Reserved ✅
└─ Destination: No change

APPROVE (approved):
├─ Source: Still Reserved ✅
└─ Destination: No change ⚠️

COMPLETE (completed):
├─ Source: Stock Reduced ✅, Reservation Released ✅
└─ Destination: Stock Increased ✅

CANCEL/REJECT:
├─ Source: Reservation Released ✅
└─ Destination: No change
```

---

## 🎯 What You Need to Do Now

Since you just **approved** the transfer, the inventory is still reserved but **not yet moved**.

To actually transfer the inventory, run:

```javascript
// In your UI or console:
await completeStockTransfer('17c39917-8675-4e0f-9038-1cb8f03becfa', userId);
```

This will:
1. Move 10 units from Branch A to Branch B
2. Update both inventories
3. Create audit trail in stock_movements
4. Mark transfer as "completed"

---

## 📝 Key Takeaways

1. **CREATE** = Reserve inventory at source
2. **APPROVE** = Authorization only (no inventory change)
3. **COMPLETE** = Actual inventory movement happens here ✅
4. **CANCEL/REJECT** = Release reservation, no movement

Always remember: **APPROVE ≠ COMPLETE**

