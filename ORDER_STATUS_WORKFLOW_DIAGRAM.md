# Order Management Status Workflow Diagram

## Complete Purchase Order Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PURCHASE ORDER LIFECYCLE                      │
└─────────────────────────────────────────────────────────────────┘

                         ┌──────────┐
                         │  DRAFT   │ (Gray)
                         │  📝      │
                         └────┬─────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              ┌──────────┐        ┌───────────┐
              │   SENT   │        │ CANCELLED │ (Red)
              │   📤     │        │    ❌     │
              └────┬─────┘        └─────┬─────┘
                   │                    │
       ┌───────────┼────────────┐       │
       │           │            │       │
       ▼           ▼            ▼       │
┌───────────┐ ┌─────────┐ ┌──────────────────┐
│ CONFIRMED │ │ SHIPPED │ │ PARTIAL_RECEIVED │ (Orange)
│    ✅     │ │   🚚    │ │       📦         │
└─────┬─────┘ └────┬────┘ └────────┬─────────┘
      │            │               │
      └────────────┼───────────────┘
                   │
                   ▼
             ┌──────────┐
             │ RECEIVED │ (Green)
             │    ✔️    │
             └────┬─────┘
                  │
                  ▼
            ┌───────────┐
            │ COMPLETED │ (Emerald)
            │    ⭐     │
            └───────────┘
            [FINAL STATE]

┌─────────────────────────────────────────────────────────────────┐
│                   RESTORATION PATH (From Cancelled)              │
└─────────────────────────────────────────────────────────────────┘

      ┌───────────┐           ┌──────────┐
      │ CANCELLED │  ────────>│  DRAFT   │
      │    ❌     │  Restore  │   📝     │
      └───────────┘           └──────────┘
```

---

## Detailed Status Transition Matrix

### 1️⃣ DRAFT (Starting Point)
**Color:** Gray  
**Icon:** 📝 FileText  
**Next States:**
- ✅ **SENT** - Order is sent to supplier
- ❌ **CANCELLED** - Order is cancelled before sending

**Use Case:** Initial order creation, can be edited

---

### 2️⃣ SENT (Order Dispatched)
**Color:** Blue  
**Icon:** 📤 Send  
**Next States:**
- ✅ **CONFIRMED** - Supplier confirms receipt
- 🚚 **SHIPPED** - Supplier ships directly
- 📦 **PARTIAL_RECEIVED** - Some items arrive
- ❌ **CANCELLED** - Order cancelled after sending

**Use Case:** Order sent to supplier, awaiting confirmation

---

### 3️⃣ CONFIRMED (Supplier Acknowledged)
**Color:** Indigo  
**Icon:** ✅ CheckSquare  
**Next States:**
- 🚚 **SHIPPED** - Supplier ships the order
- 📦 **PARTIAL_RECEIVED** - Receiving begins
- ❌ **CANCELLED** - Order cancelled after confirmation

**Use Case:** Supplier has confirmed they will fulfill order

---

### 4️⃣ SHIPPED (In Transit)
**Color:** Purple  
**Icon:** 🚚 Ship  
**Next States:**
- 📦 **PARTIAL_RECEIVED** - Some items arrive
- ✔️ **RECEIVED** - All items arrive

**Use Case:** Order is on the way, tracking available

---

### 5️⃣ PARTIAL_RECEIVED (Incomplete Delivery)
**Color:** Orange  
**Icon:** 📦 Package  
**Next States:**
- ✔️ **RECEIVED** - Remaining items arrive
- ❌ **CANCELLED** - Cancel incomplete order

**Use Case:** Some items received, waiting for rest

---

### 6️⃣ RECEIVED (Fully Delivered)
**Color:** Green  
**Icon:** ✔️ PackageCheck  
**Next States:**
- ⭐ **COMPLETED** - Order finalized and closed

**Use Case:** All items received, quality check passed

---

### 7️⃣ COMPLETED (Finished)
**Color:** Emerald  
**Icon:** ⭐ CheckSquare  
**Next States:**
- (None) - This is a terminal state

**Use Case:** Order complete, archived for records

---

### 8️⃣ CANCELLED (Order Stopped)
**Color:** Red  
**Icon:** ❌ XCircle  
**Next States:**
- 📝 **DRAFT** - Restore order to recreate

**Use Case:** Order cancelled, can be restored if needed

---

## Business Flow Examples

### Example 1: Normal Order Flow (Happy Path)
```
DRAFT → SENT → CONFIRMED → SHIPPED → RECEIVED → COMPLETED
  📝      📤       ✅         🚚         ✔️         ⭐
```
**Timeline:** 1-2 weeks
**Actions:** Create → Send → Confirm → Ship → Receive → Complete

---

### Example 2: Partial Delivery Flow
```
DRAFT → SENT → SHIPPED → PARTIAL_RECEIVED → RECEIVED → COMPLETED
  📝      📤       🚚            📦            ✔️         ⭐
```
**Timeline:** 2-3 weeks (split deliveries)
**Actions:** Create → Send → Ship → Partial Receive → Full Receive → Complete

---

### Example 3: Direct Receive Flow (Local Supplier)
```
DRAFT → SENT → PARTIAL_RECEIVED → RECEIVED → COMPLETED
  📝      📤          📦             ✔️         ⭐
```
**Timeline:** 1-3 days (local pickup)
**Actions:** Create → Send → Pick Up → Receive → Complete

---

### Example 4: Cancelled Order Flow
```
DRAFT → SENT → CANCELLED
  📝      📤       ❌
```
**Reason:** Out of stock, price change, or business decision

---

### Example 5: Restoration Flow
```
CANCELLED → DRAFT → SENT → ...
    ❌        📝      📤
```
**Use Case:** Recreate cancelled order with modifications

---

## Quick Reference: Button Labels

When viewing an order card, users will see:

| Current Status | Visible Buttons |
|----------------|----------------|
| DRAFT | "Mark as sent" • "Mark as cancelled" |
| SENT | "Mark as confirmed" • "Mark as shipped" • "Mark as partial_received" • "Mark as cancelled" |
| CONFIRMED | "Mark as shipped" • "Mark as partial_received" • "Mark as cancelled" |
| SHIPPED | "Mark as partial_received" • "Mark as received" |
| PARTIAL_RECEIVED | "Mark as received" • "Mark as cancelled" |
| RECEIVED | "Mark as completed" |
| COMPLETED | (No buttons - final state) |
| CANCELLED | "Mark as draft" (restoration) |

---

## Smart Action Buttons vs Quick Status Updates

### Smart Action Buttons (Primary Actions)
- Large buttons at top of expanded order
- Include: Edit, Approve & Send, Receive Items, Make Payment
- Business logic (e.g., "Make Payment" only shows if unpaid)
- Navigate to detailed workflows

### Quick Status Update Buttons (Secondary Actions)
- Smaller buttons at bottom of expanded order
- Simple one-click status changes
- No navigation, updates in place
- Ideal for bulk processing

---

## Status Logic Summary

```typescript
// Simplified Logic
function getNextStatuses(current) {
  if (current === 'draft')           return ['sent', 'cancelled']
  if (current === 'sent')            return ['confirmed', 'shipped', 'partial_received', 'cancelled']
  if (current === 'confirmed')       return ['shipped', 'partial_received', 'cancelled']
  if (current === 'shipped')         return ['partial_received', 'received']
  if (current === 'partial_received') return ['received', 'cancelled']
  if (current === 'received')        return ['completed']
  if (current === 'completed')       return []
  if (current === 'cancelled')       return ['draft']
}
```

---

## Color Coding Reference

```
🎨 Status Colors:

⚪ DRAFT           → Gray    (Neutral, editable)
🔵 SENT            → Blue    (Active, in progress)
🟣 CONFIRMED       → Indigo  (Acknowledged)
🟣 SHIPPED         → Purple  (In transit)
🟠 PARTIAL_RECEIVED → Orange  (Action needed)
🟢 RECEIVED        → Green   (Success)
🟢 COMPLETED       → Emerald (Final success)
🔴 CANCELLED       → Red     (Error/stopped)
```

---

## Performance Considerations

### Database Queries:
- Single query per status update
- Bulk updates use transaction batching
- Optimistic UI updates

### User Experience:
- Instant visual feedback (optimistic update)
- Toast notifications confirm success
- Auto-refresh order list
- Maintains scroll position

---

## Error Handling Flow

```
User clicks "Mark as sent"
         ↓
Frontend validates
         ↓
[Optimistic Update: Show as 'sent']
         ↓
API Call to database
         ↓
    ┌────┴────┐
    │         │
Success?   Failure?
    │         │
    ▼         ▼
Keep UI    Rollback
Update     Show Error
    │      Toast ❌
    ▼
Show Success
Toast ✅
```

---

*Visual reference for developers and users*
*Version: 2.0 - Complete Workflow*
*Last Updated: November 12, 2025*

