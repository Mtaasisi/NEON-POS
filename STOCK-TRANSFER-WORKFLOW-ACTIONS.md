# 📋 Stock Transfer & Receiving Workflow - Complete Action Breakdown

## 🎯 Overview
Your stock transfer system has **7 main actions** organized into **4 status stages**.

---

## 📊 Complete Workflow Chart

```
┌─────────────────────────────────────────────────────────────────┐
│                    STOCK TRANSFER WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

1️⃣  CREATE TRANSFER (pending)
    ├── Validate branches exist
    ├── Check for duplicate transfers
    ├── Validate stock availability
    ├── Reserve stock at source
    └── Create transfer record
         └── Status: "pending"

2️⃣  APPROVE/REJECT (pending → approved/rejected)
    ├── OPTION A: APPROVE
    │   ├── Validate not self-approval
    │   ├── Keep stock reserved
    │   └── Status: "pending" → "approved"
    │
    └── OPTION B: REJECT
        ├── Release reserved stock
        ├── Record rejection reason
        └── Status: "pending" → "rejected" (END)

3️⃣  MARK IN TRANSIT (approved → in_transit)
    ├── Validate status is "approved"
    ├── Stock remains reserved
    └── Status: "approved" → "in_transit"

4️⃣  COMPLETE TRANSFER (in_transit → completed)
    ├── Find/create variant at destination
    ├── Reduce stock from source
    ├── Release reservation
    ├── Increase stock at destination
    └── Status: "in_transit" → "completed" (END)

5️⃣  CANCEL TRANSFER (any → cancelled)
    ├── Release reserved stock
    └── Status: "any" → "cancelled" (END)
```

---

## 🔢 Action Count Summary

### **Total Actions: 7**

| # | Action | Trigger | Status Change | Database Operations |
|---|--------|---------|---------------|---------------------|
| 1 | **Create** | Sender creates request | → `pending` | Reserve stock |
| 2 | **Approve** | Receiver approves | `pending` → `approved` | Keep reservation |
| 3 | **Reject** | Receiver rejects | `pending` → `rejected` | Release stock |
| 4 | **Mark In Transit** | Sender ships | `approved` → `in_transit` | Keep reservation |
| 5 | **Complete** | Receiver receives | `in_transit` → `completed` | Move stock |
| 6 | **Cancel** | Anyone cancels | `any` → `cancelled` | Release stock |
| 7 | **View/List** | Anyone views | No change | Read only |

---

## 📝 Detailed Action Breakdown

### **1️⃣ CREATE TRANSFER**
**Who:** Source branch user  
**Status:** `→ pending`  
**Function:** `createStockTransfer()`

#### Steps (9 validation checks):
1. ✅ Validate source branch exists and is active
2. ✅ Validate destination branch exists and is active
3. ✅ Ensure branches are different
4. ✅ Check for duplicate pending transfers
5. ✅ Validate product variant exists
6. ✅ Check sufficient available stock (total - reserved)
7. ✅ Validate variant belongs to source branch
8. ✅ **Reserve stock** (prevents overselling)
9. ✅ Create transfer record with status "pending"

#### Database Functions Used:
- `reserve_variant_stock(variant_id, quantity)`
- `check_duplicate_transfer(from_branch, to_branch, entity_id)`

#### Stock Impact:
- **Source:** `reserved_quantity` +X (stock locked)
- **Destination:** No change

---

### **2️⃣ APPROVE TRANSFER**
**Who:** Destination branch manager  
**Status:** `pending → approved`  
**Function:** `approveStockTransfer()`

#### Steps (4 checks):
1. ✅ Fetch transfer details
2. ✅ Validate status is "pending"
3. ✅ Prevent self-approval (disabled in dev)
4. ✅ Update status to "approved" with timestamp

#### Database Functions Used:
- Direct SQL UPDATE

#### Stock Impact:
- **Source:** Stock remains reserved
- **Destination:** No change

---

### **3️⃣ REJECT TRANSFER**
**Who:** Destination branch manager  
**Status:** `pending → rejected`  
**Function:** `rejectStockTransfer()`

#### Steps (5 checks):
1. ✅ Fetch transfer details
2. ✅ Validate status is "pending"
3. ✅ **Release reserved stock** (makes available again)
4. ✅ Record rejection reason
5. ✅ Update status to "rejected"

#### Database Functions Used:
- `release_variant_stock(variant_id, quantity)`

#### Stock Impact:
- **Source:** `reserved_quantity` -X (stock released, available again)
- **Destination:** No change

---

### **4️⃣ MARK IN TRANSIT**
**Who:** Source branch user (shipper)  
**Status:** `approved → in_transit`  
**Function:** `markTransferInTransit()`

#### Steps (3 checks):
1. ✅ Validate status is "approved"
2. ✅ Update status to "in_transit"
3. ✅ Stock remains reserved during shipping

#### Database Functions Used:
- Direct SQL UPDATE

#### Stock Impact:
- **Source:** Stock remains reserved
- **Destination:** No change

---

### **5️⃣ COMPLETE TRANSFER** ⭐ **MOST CRITICAL**
**Who:** Destination branch user (receiver)  
**Status:** `in_transit OR approved → completed`  
**Function:** `completeStockTransfer()`

#### Steps (11 operations in transaction):
1. ✅ Lock transfer record (prevent duplicate completion)
2. ✅ Validate status is "in_transit" or "approved"
3. ✅ Get source variant quantities BEFORE
4. ✅ **Find or create variant** at destination branch
5. ✅ Get destination variant quantity BEFORE
6. ✅ **Reduce stock** from source (-X quantity)
7. ✅ **Release reservation** from source (-X reserved)
8. ✅ **Increase stock** at destination (+X quantity)
9. ✅ Update transfer status to "completed"
10. ✅ Record completion timestamp
11. ✅ Return transaction result with before/after snapshots

#### Database Functions Used:
- `complete_stock_transfer_transaction(transfer_id, user_id)` **← ATOMIC**
  - Calls: `find_or_create_variant_at_branch()`
  - Calls: `reduce_variant_stock()`
  - Calls: `increase_variant_stock()`

#### Stock Impact:
- **Source:** 
  - `quantity` -X (stock physically moved)
  - `reserved_quantity` -X (reservation released)
- **Destination:** 
  - `quantity` +X (stock received)
  - `reserved_quantity` no change

#### Auto-Creation:
If variant doesn't exist at destination:
- Creates new variant with destination branch_id
- Copies: product_id, cost_price, selling_price, reorder_point
- Generates new SKU with branch code suffix
- Starts with 0 quantity, then adds transferred amount

---

### **6️⃣ CANCEL TRANSFER**
**Who:** Source branch user  
**Status:** `any → cancelled`  
**Function:** `cancelStockTransfer()`

#### Steps (3 operations):
1. ✅ Fetch transfer details
2. ✅ **Release reserved stock** (if any)
3. ✅ Update status to "cancelled"

#### Database Functions Used:
- `release_variant_stock(variant_id, quantity)`

#### Stock Impact:
- **Source:** `reserved_quantity` -X (stock released)
- **Destination:** No change

---

### **7️⃣ VIEW/LIST TRANSFERS**
**Who:** Any authenticated user  
**Status:** No change  
**Function:** `getStockTransfers()`

#### Features:
- Filter by branch (sent/received)
- Filter by status
- Search by product name/SKU
- Pagination support
- Shows real-time stock levels

#### No stock impact

---

## 🔄 Status Flow Diagram

```
┌─────────┐
│ CREATE  │
└────┬────┘
     │
     v
┌─────────┐     REJECT      ┌──────────┐
│ PENDING ├───────────────→ │ REJECTED │ (END)
└────┬────┘                 └──────────┘
     │
     │ APPROVE
     v
┌──────────┐    CANCEL      ┌───────────┐
│ APPROVED ├───────────────→│ CANCELLED │ (END)
└────┬─────┘                └───────────┘
     │
     │ MARK IN TRANSIT
     v
┌────────────┐
│ IN_TRANSIT │
└─────┬──────┘
      │
      │ COMPLETE
      v
┌───────────┐
│ COMPLETED │ (END)
└───────────┘
```

---

## 🎯 Common Workflows

### **Normal Flow (Happy Path) - 4 actions**
```
1. CREATE → pending
2. APPROVE → approved
3. MARK IN TRANSIT → in_transit
4. COMPLETE → completed ✅
```

### **Quick Receive Flow - 3 actions**
```
1. CREATE → pending
2. APPROVE → approved
3. COMPLETE → completed ✅
   (Skip "in transit" for same-day/local transfers)
```

### **Rejection Flow - 2 actions**
```
1. CREATE → pending
2. REJECT → rejected ❌
```

### **Cancellation Flow - 2+ actions**
```
1. CREATE → pending
2. CANCEL → cancelled ❌
   (Or cancel at any stage)
```

---

## 🔐 Database Functions (7 total)

| Function | Purpose | Called By |
|----------|---------|-----------|
| `reserve_variant_stock()` | Lock stock during transfer | CREATE |
| `release_variant_stock()` | Unlock stock | REJECT, CANCEL |
| `reduce_variant_stock()` | Remove from source | COMPLETE |
| `increase_variant_stock()` | Add to destination | COMPLETE |
| `find_or_create_variant_at_branch()` | Setup destination | COMPLETE |
| `check_duplicate_transfer()` | Prevent duplicates | CREATE |
| `complete_stock_transfer_transaction()` | Atomic completion | COMPLETE |

---

## 📊 Action Statistics

### **By User Role:**
- **Source Branch:** CREATE (1), MARK IN TRANSIT (1), CANCEL (1) = **3 actions**
- **Destination Branch:** APPROVE (1), REJECT (1), COMPLETE (1) = **3 actions**
- **Both:** VIEW (1) = **1 action**

### **By Stock Impact:**
- **Reserve stock:** 1 action (CREATE)
- **Release stock:** 2 actions (REJECT, CANCEL)
- **Move stock:** 1 action (COMPLETE)
- **No stock change:** 3 actions (APPROVE, MARK IN TRANSIT, VIEW)

### **By Database Operations:**
- **Read-only:** 1 action (VIEW)
- **Update status:** 2 actions (APPROVE, MARK IN TRANSIT)
- **Simple operations:** 2 actions (REJECT, CANCEL)
- **Complex operations:** 2 actions (CREATE, COMPLETE)

---

## ⏱️ Typical Timeline

| Action | Time | Cumulative |
|--------|------|------------|
| CREATE | Instant | 0 mins |
| APPROVE | 5-30 mins | 5-30 mins |
| MARK IN TRANSIT | Instant | 5-30 mins |
| **Physical transit** | **Hours/days** | **Varies** |
| COMPLETE | 1-5 mins | Hours/days |

---

## ✅ Success Criteria

### **For Each Action:**
- ✅ CREATE: Stock reserved, transfer created
- ✅ APPROVE: Status updated, stock remains reserved
- ✅ REJECT: Stock released, reason recorded
- ✅ MARK IN TRANSIT: Status updated, notification sent
- ✅ COMPLETE: Stock moved, both branches updated
- ✅ CANCEL: Stock released, transfer marked cancelled

---

## 🚨 Error Prevention

Each action includes multiple validation checks:
- ✅ Status validation (can't complete pending transfer)
- ✅ Stock availability (can't over-transfer)
- ✅ Duplicate prevention (no duplicate pending transfers)
- ✅ Transaction safety (atomic operations)
- ✅ Reservation tracking (prevents overselling)

---

**Total Actions: 7**  
**Main Workflow Steps: 4** (Create → Approve → In Transit → Complete)  
**Database Functions: 7**  
**Status States: 5** (pending, approved, in_transit, completed, rejected/cancelled)

---
**Last Updated:** November 8, 2025  
**System:** LATS POS - Stock Transfer Module

