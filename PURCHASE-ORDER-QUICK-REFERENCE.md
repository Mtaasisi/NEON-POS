# Purchase Order to Inventory - Quick Reference Guide

**Last Updated:** October 20, 2025

---

## 🚀 Quick Start

### Run Verification First
```bash
node verify-po-inventory-setup.js
```

This will check if everything is properly configured.

---

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  PURCHASE ORDER WORKFLOW                    │
└─────────────────────────────────────────────────────────────┘

1. CREATE PO
   └─> lats_purchase_orders (status: 'draft')
   └─> lats_purchase_order_items (quantity_ordered, unit_cost)

2. SEND TO SUPPLIER
   └─> Status: 'draft' → 'sent' → 'confirmed'

3. SUPPLIER SHIPS
   └─> Status: 'confirmed' → 'shipped'

4. RECEIVE GOODS (3 methods)
   
   ┌─────────────────────────────────────────────────────────┐
   │ A) COMPLETE RECEIVE (Most Common)                       │
   └─────────────────────────────────────────────────────────┘
   ├─> Call: complete_purchase_order_receive()
   ├─> Creates: inventory_items (one per unit)
   ├─> Updates: lats_purchase_order_items.quantity_received
   ├─> Status: 'shipped' → 'received'
   └─> Result: Items in inventory, ready for Quality Check
   
   ┌─────────────────────────────────────────────────────────┐
   │ B) PARTIAL RECEIVE                                      │
   └─────────────────────────────────────────────────────────┘
   ├─> Specify quantities per item
   ├─> Creates: inventory_items OR adjustments
   ├─> Status: → 'partial_received'
   └─> Can receive more later
   
   ┌─────────────────────────────────────────────────────────┐
   │ C) WITH SERIAL NUMBERS                                  │
   └─────────────────────────────────────────────────────────┘
   ├─> Enter: IMEI, Serial #, MAC, etc.
   ├─> Creates: inventory_items with serial data
   └─> Enables: Individual item tracking

5. QUALITY CHECK (Optional but Recommended)
   └─> Inspect items (pass/fail)
   └─> Add passed items to inventory
   └─> Update pricing (cost + margin)
   └─> Status: Items become sellable

6. INVENTORY UPDATED
   └─> inventory_items (individual units)
   └─> lats_product_variants.quantity (UI display)
   └─> Products available in POS

┌─────────────────────────────────────────────────────────────┐
│                   INVENTORY TABLES                          │
└─────────────────────────────────────────────────────────────┘

inventory_items                    lats_product_variants
├─ Individual units                ├─ Aggregate count
├─ Status per unit                 ├─ quantity (displayed)
├─ Serial numbers                  ├─ cost_price
├─ Cost/selling price              └─ selling_price
└─ Purchase order link

         ⬆                                 ⬆
         │                                 │
         └─────── Synced via Trigger ──────┘
              (sync_variant_quantity)
```

---

## 🎯 Common Tasks

### Task 1: Receive a Complete Purchase Order
```typescript
// Frontend: Click "Receive Full Order" button
// Backend: Calls PurchaseOrderService.completeReceive()
// Database: complete_purchase_order_receive() function

Result:
✓ Creates N inventory_items (N = total ordered quantity)
✓ Updates PO status to 'received'
✓ Updates quantity_received on each item
✓ Creates audit log entry
```

### Task 2: Receive With Serial Numbers
```typescript
// Frontend: Click "Receive with S/N" button
// Enter serial numbers for each unit
// Backend: Creates inventory_items with serial data

Use For:
- Phones (IMEI)
- Electronics (Serial #, MAC)
- High-value items
- Items needing warranty tracking
```

### Task 3: Partial Receive
```typescript
// Frontend: Click "Partial Receive" button
// Specify quantities per item
// Backend: Updates received_quantity incrementally

Use When:
- Shipment arrives in multiple deliveries
- Some items out of stock
- Staggered delivery schedule
```

### Task 4: Quality Check
```typescript
// After receiving (status = 'received')
// Frontend: Click "Quality Check"
// Mark each item: Pass or Fail
// Click "Add to Inventory"
// Backend: add_quality_items_to_inventory_v2()

Result:
✓ Only passed items become sellable
✓ Selling price = cost × (1 + profit_margin%)
✓ Failed items tracked separately
```

---

## 🔧 Troubleshooting

### Issue: "Receive" Button Doesn't Work
```bash
# Check if database function exists:
node verify-po-inventory-setup.js

# If missing, install:
node run-complete-receive-migration.js
```

### Issue: Items Received But Show 0 Stock
```sql
-- Check sync:
SELECT 
  pv.id, 
  pv.quantity as variant_qty,
  (SELECT COUNT(*) FROM inventory_items 
   WHERE variant_id = pv.id AND status = 'available') as actual_count
FROM lats_product_variants pv
WHERE pv.quantity != (
  SELECT COUNT(*) FROM inventory_items 
  WHERE variant_id = pv.id AND status = 'available'
);

-- Fix sync:
node diagnose-and-fix-inventory-sync.js
```

### Issue: Can't Receive Order
**Check Status:**
- Order must be in: 'shipped', 'confirmed', 'sent', or 'partial_received'
- If in 'draft', send order first

**Check Items:**
- Order must have items
- Quantities must be > 0

**Check Payment:**
- Current setting: Allows receiving without payment (warning only)
- To enforce: Modify `handleReceive()` in PurchaseOrderDetailPage

### Issue: Items Not Showing in POS
**Possible Causes:**
1. Quality check pending (items received but not added to inventory yet)
2. Variant quantity not synced
3. Items marked as 'reserved' or 'damaged' instead of 'available'

**Check:**
```sql
-- See item status:
SELECT 
  ii.id,
  p.name as product,
  ii.status,
  ii.notes
FROM inventory_items ii
JOIN lats_products p ON p.id = ii.product_id
WHERE ii.purchase_order_id = 'YOUR_PO_ID';

-- Should show status = 'available' for sellable items
```

---

## 📋 Database Tables Quick Reference

### Purchase Orders
```sql
lats_purchase_orders
├─ id                    -- PO identifier
├─ po_number            -- Display number (PO-123)
├─ supplier_id          -- Who we're buying from
├─ status               -- draft, sent, confirmed, shipped, received
├─ total_amount         -- Total cost
└─ branch_id            -- Which branch owns this PO

lats_purchase_order_items
├─ id
├─ purchase_order_id    -- Parent PO
├─ product_id           -- What we're buying
├─ variant_id           -- Specific variant
├─ quantity_ordered     -- How many ordered
├─ quantity_received    -- How many received so far
├─ unit_cost            -- Cost per unit
└─ subtotal             -- Total for this line
```

### Inventory
```sql
inventory_items (Individual Tracking)
├─ id
├─ purchase_order_id    -- Where it came from
├─ product_id
├─ variant_id
├─ status               -- available, sold, reserved, damaged
├─ serial_number        -- Optional
├─ imei                 -- Optional
├─ cost_price
├─ selling_price
└─ metadata             -- Extra info (JSONB)

lats_product_variants (Aggregate Tracking)
├─ id
├─ product_id
├─ quantity            -- DISPLAYED IN UI ← MUST SYNC
├─ cost_price
└─ selling_price

lats_stock_movements (History)
├─ id
├─ product_id
├─ variant_id
├─ movement_type       -- in, out, adjustment, sale
├─ quantity            -- How many moved
├─ reason              -- Why
└─ created_at          -- When
```

### Quality Control
```sql
purchase_order_quality_checks
├─ id
├─ purchase_order_id
├─ status              -- pending, in_progress, completed
├─ checked_by
└─ checked_at

purchase_order_quality_check_items
├─ id
├─ quality_check_id
├─ purchase_order_item_id
├─ result              -- pass, fail, pending
├─ quantity_passed
├─ quantity_failed
└─ notes
```

---

## 🔑 Key Database Functions

### complete_purchase_order_receive()
**Purpose:** Receive entire purchase order  
**Location:** `migrations/create_complete_purchase_order_receive_function.sql`  
**Called From:** Frontend "Receive Full Order" button

```sql
SELECT complete_purchase_order_receive(
  purchase_order_id := 'YOUR_PO_ID',
  user_id := 'USER_ID',
  receive_notes := 'Received in good condition'
);
```

### add_quality_items_to_inventory_v2()
**Purpose:** Add quality-checked items to inventory with pricing  
**Location:** `migrations/create_quality_check_system.sql`  
**Called From:** Quality check "Add to Inventory" button

```sql
SELECT add_quality_items_to_inventory_v2(
  p_quality_check_id := 'QC_ID',
  p_purchase_order_id := 'PO_ID',
  p_user_id := 'USER_ID',
  p_profit_margin_percentage := 30.0,
  p_default_location := 'Main Warehouse'
);
```

### sync_variant_quantity_from_inventory()
**Purpose:** Keep variant quantity in sync with inventory_items count  
**Location:** `migrations/create_inventory_sync_trigger.sql`  
**Triggered:** Automatically when inventory_items change

---

## 🎓 Best Practices

### 1. Choose the Right Receive Method
- **Complete Receive**: Standard products, full shipment
- **Partial Receive**: Staggered deliveries
- **With Serial Numbers**: Electronics, high-value items
- **Quality Check**: All new suppliers, expensive items

### 2. Always Use Quality Check For
- New suppliers
- Items > $500
- Electronics/fragile items
- Bulk shipments

### 3. Inventory Management
- Run reconciliation weekly: `node check-inventory-discrepancies.sql`
- Check sync monthly: `node verify-po-inventory-setup.js`
- Review stock movements for unusual patterns

### 4. Branch Management
- Each branch has separate POs
- Stock doesn't auto-transfer between branches
- Use stock transfer feature for inter-branch moves

---

## 📞 Need More Help?

**Detailed Analysis:**
- Read: `PURCHASE-ORDER-INVENTORY-ANALYSIS.md` (this directory)

**Fix Guides:**
- Receive not working: `PURCHASE-ORDER-RECEIVE-FIX.md`
- Stock sync issues: `INVENTORY-SYNC-ISSUE-FIXED.md`
- Quality check setup: `QUALITY-CHECK-FIX-COMPLETE.md`

**Run Verification:**
```bash
node verify-po-inventory-setup.js
```

**Emergency Fix:**
```bash
# Fix receive function:
node run-complete-receive-migration.js

# Fix inventory sync:
node diagnose-and-fix-inventory-sync.js

# Check everything:
node verify-po-inventory-setup.js
```

---

## 📊 Status Flowchart

```
Purchase Order Status Flow:

draft → send → sent → confirm → confirmed 
                                    ↓
                              ship → shipped
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            partial_received                    received
                    ↓                               ↓
            (receive more)                   quality_check
                    ↓                               ↓
                received                    add_to_inventory
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
                              ✅ COMPLETE
                              
Inventory Item Status:
available → (can sell)
reserved → (held for customer)
sold → (completed sale)
damaged → (cannot sell)
returned → (sent back to supplier)
```

---

**Quick Reference Version 1.0**  
**Created:** October 20, 2025  
**For:** POS Main NEON DATABASE

