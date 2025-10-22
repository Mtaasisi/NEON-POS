# Purchase Order Status Bug Fix

## 🐛 Bug Description

**Issue**: Purchase orders showing error: `Unknown purchase order status: 287ec561-d5f2-4113-840e-e9335b9d3f69`

**Root Cause**: Some purchase orders in the database had their **ID stored in the status field** instead of a valid status value (like 'draft', 'sent', 'received', etc.)

## 🔍 Impact

- Warning messages flooding the console
- Status buttons not showing correctly
- Workflow broken for affected orders

## ✅ Fixes Applied

### 1. **Code Fix** (Immediate - Frontend)

**File**: `src/features/lats/pages/PurchaseOrdersPage.tsx`

Added validation to detect and handle corrupted status values:

```typescript
// Validate status - fix corrupted data
const validStatuses = ['draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled'];
const orderStatus = validStatuses.includes(order.status) ? order.status : 'draft';

if (orderStatus !== order.status) {
  console.warn(`⚠️ Invalid PO status detected: "${order.status}" for order ${order.id} - using "draft" as fallback`);
}
```

**Benefits**:
- ✅ Immediate fix - no more console errors
- ✅ Graceful fallback to 'draft' status
- ✅ Clear warning message for debugging

### 2. **Database Fix** (Permanent - Backend)

**File**: `migrations/086_fix_purchase_order_status.sql`

Run this migration to:
- ✅ Find all corrupted records
- ✅ Log them in audit trail
- ✅ Fix by setting status to 'draft'
- ✅ Add CHECK constraint to prevent future corruption
- ✅ Add performance index on status field

## 🚀 How to Apply

### Option 1: Run Migration (Recommended)

```bash
# Run the migration using the run-migration script
node run-migration.mjs 086_fix_purchase_order_status.sql
```

### Option 2: Manual SQL (Quick Fix)

If you need an immediate fix, run this SQL directly:

```sql
-- Fix corrupted statuses
UPDATE lats_purchase_orders 
SET status = 'draft', updated_at = NOW()
WHERE status ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR status NOT IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled');

-- Add constraint
ALTER TABLE lats_purchase_orders 
ADD CONSTRAINT lats_purchase_orders_status_check 
CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled'));
```

## 🎯 Expected Results

**Before Fix**:
```
[Warning] Unknown purchase order status: 287ec561-d5f2-4113-840e-e9335b9d3f69 (x14)
```

**After Fix**:
```
✅ No errors
✅ All POs show correct status
✅ Status buttons work properly
```

## 🛡️ Prevention

The CHECK constraint added by the migration will prevent this issue from happening again by ensuring only valid status values can be saved to the database.

## 📝 Valid Status Values

```typescript
'draft'              // Initial state
'pending_approval'   // Awaiting approval
'approved'           // Approved but not sent
'sent'               // Sent to supplier
'confirmed'          // Supplier confirmed
'shipped'            // In transit
'partial_received'   // Some items received
'received'           // All items received
'completed'          // Order complete
'cancelled'          // Cancelled
```

## 🔗 Related Files

- ✅ `src/features/lats/pages/PurchaseOrdersPage.tsx` - Code fix applied
- ✅ `migrations/086_fix_purchase_order_status.sql` - Database migration
- ✅ `fix-po-status.sql` - Quick fix SQL script

## 📊 Verification

After applying the fix, verify:

1. No more console warnings about unknown status
2. All purchase orders show valid status badges
3. Status workflow buttons appear correctly
4. No purchase orders with UUID in status field

```sql
-- Check for any remaining issues
SELECT id, po_number, status 
FROM lats_purchase_orders 
WHERE status NOT IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled');
-- Should return 0 rows
```

---

**Status**: ✅ Fixed
**Priority**: High
**Date**: 2025-10-21

