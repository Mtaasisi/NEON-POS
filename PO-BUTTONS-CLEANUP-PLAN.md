# Purchase Order Buttons - Cleanup & Reorganization Plan

## 🎯 Current Issues Identified

### 1. **Redundant/Confusing Buttons**

#### ❌ **REMOVE - Status: PENDING_APPROVAL**
**Current:** 
- "Review Approval" button on list page
- "Review Approval" button on detail page

**Problem:** Confusing - users don't know what "Review Approval" means
**Solution:** REMOVE this intermediate status entirely OR rename button to "Approve/Reject"

---

#### ❌ **REMOVE - Status: APPROVED** 
**Current:**
- Separate "Approved" status before "Sent"

**Problem:** Unnecessary step - adds no value
**Solution:** REMOVE "Approved" status, go directly from "pending_approval" → "sent"

---

#### ❌ **SIMPLIFY - Status: CONFIRMED**
**Current:**
- Sent → Confirmed → Shipped (3 separate statuses)

**Problem:** Too many in-between statuses
**Solution:** MERGE "Confirmed" into "Sent" - use a single status

---

#### ❌ **REMOVE - Duplicate Payment Buttons**
**Current:**
- "Make Payment" button appears in multiple places
- Separate "Pay" button on list page
- "Make Payment" button on detail page

**Problem:** Redundant
**Solution:** Keep only ONE payment button location (detail page only)

---

#### ❌ **REMOVE - Unnecessary Edit Options**
**Current:**
- "Edit Order" button on list page
- "Edit Order" button on detail page
- Opens in new tab vs same page

**Problem:** Confusing which one to use
**Solution:** Keep only detail page edit, remove from list page

---

#### ❌ **SIMPLIFY - Receive Options**
**Current:**
- "Receive Full Order"
- "Partial Receive"
- "Receive with S/N"
- "Receive Remaining"

**Problem:** Too many options, confusing
**Solution:** ONE "Receive" button that opens modal with all options inside

---

#### ❌ **REMOVE - Quality Check as Separate Status**
**Current:**
- Quality check happens AFTER receiving
- Separate action button
- Creates extra step

**Problem:** Slows down workflow
**Solution:** Make quality check OPTIONAL during receive process

---

#### ❌ **REMOVE - Return Order Button**
**Current:**
- "Return Order" button on received status

**Problem:** Edge case that clutters UI
**Solution:** Move to dropdown menu or "More Actions"

---

### 2. **Buttons to Keep** ✅

#### Essential Actions:
1. **View Details** - Keep
2. **Approve** - Keep (rename to "Approve Order")
3. **Reject** - Keep (combine with Approve)
4. **Send to Supplier** - Keep
5. **Receive** - Keep (consolidate all receive options)
6. **Complete** - Keep
7. **Cancel** - Keep (with confirmation)
8. **Delete** - Keep (draft only)

#### Document Actions:
1. **Print** - Keep
2. **Export** - Keep (combine PDF/Excel into one dropdown)

#### Secondary Actions:
1. **Notes** - Keep
2. **Duplicate** - Keep (completed orders only)

---

## 🎨 Proposed New Button Layout

### **SIMPLIFIED WORKFLOW:**

```
DRAFT → SENT → SHIPPED → RECEIVED → COMPLETED
```

### **Removed Statuses:**
- ❌ pending_approval (merge into draft)
- ❌ approved (skip to sent)
- ❌ confirmed (merge into sent)
- ❌ quality_checked (make optional)

---

## 📋 Step-by-Step Implementation Plan

### **STEP 1: Simplify Status Progression** 🔄

#### Current:
```
Draft → Pending Approval → Approved → Sent → Confirmed → Shipped → Received → Completed
```

#### New:
```
Draft → Sent → Shipped → Received → Completed
```

**Changes:**
- Remove "Pending Approval" - Approve directly from Draft
- Remove "Approved" - Send directly after approval
- Remove "Confirmed" - Merge into Sent status
- Quality Check becomes optional modal during Receive

---

### **STEP 2: Reorganize List Page Buttons** 📱

#### **DRAFT Status**
```
BEFORE:
[View Details] [Edit Order] [Approve] [Delete]

AFTER:
[Approve] [Delete] [More ▼]
  └─ More dropdown:
     - View Details
     - Edit
     - Notes
```

**Reasoning:** Most common action (Approve) is primary. Details/Edit are secondary.

---

#### **SENT Status**
```
BEFORE:
[View Details] [Pay] [Receive] (based on payment status)

AFTER:
IF UNPAID:
  [Pay] [More ▼]
    └─ More dropdown:
       - View Details
       - Cancel
       - Notes

IF PAID:
  [Receive] [More ▼]
    └─ More dropdown:
       - View Details
       - View Payments
       - Notes
```

**Reasoning:** Primary action (Pay or Receive) is most visible.

---

#### **SHIPPED Status**
```
BEFORE:
[View Details] [Receive options] [Pay]

AFTER:
Same as SENT (merge these statuses)
```

---

#### **RECEIVED Status**
```
BEFORE:
[View Details] [Quality Check] [Complete]

AFTER:
[Complete] [More ▼]
  └─ More dropdown:
     - View Details
     - Quality Check (optional)
     - Return Order
     - Notes
```

**Reasoning:** Complete is the goal, Quality Check is optional.

---

#### **COMPLETED Status**
```
BEFORE:
[View Details] [Create Similar]

AFTER:
[View Details] [Duplicate]
```

**Reasoning:** "Duplicate" is clearer than "Create Similar"

---

### **STEP 3: Reorganize Detail Page Buttons** 📄

#### **Primary Actions Panel** (Right sidebar)

**DRAFT:**
```
┌─────────────────────┐
│  Primary Actions    │
├─────────────────────┤
│ [Approve & Send]    │ ← Combine approve + send
│ [Save as Draft]     │
│ [Delete]            │
└─────────────────────┘
```

---

**SENT (Unpaid):**
```
┌─────────────────────┐
│  Primary Actions    │
├─────────────────────┤
│ [Make Payment]      │ ← Most important
│                     │
│ [Cancel Order]      │
└─────────────────────┘
```

---

**SENT/SHIPPED (Paid):**
```
┌─────────────────────┐
│  Primary Actions    │
├─────────────────────┤
│ [Receive Order]     │ ← Opens modal with options
│                     │
│ Payment: ✅ Paid    │
└─────────────────────┘
```

---

**RECEIVED:**
```
┌─────────────────────┐
│  Primary Actions    │
├─────────────────────┤
│ [Complete Order]    │ ← Primary goal
│                     │
│ [Quality Check]     │ ← Optional
└─────────────────────┘
```

---

**COMPLETED:**
```
┌─────────────────────┐
│  Order Complete ✅  │
├─────────────────────┤
│ [Duplicate Order]   │
└─────────────────────┘
```

---

#### **Secondary Actions Panel** (Moved to bottom)

```
┌─────────────────────────────────────┐
│  Document & Communication Actions   │
├─────────────────────────────────────┤
│ [Print]  [Export ▼]  [Notes]  [•••] │
│           └─ PDF                     │
│           └─ Excel                   │
└─────────────────────────────────────┘
```

---

### **STEP 4: Consolidate Receive Modal** 📦

**NEW Receive Modal Structure:**

```
┌─────────────────────────────────────────┐
│        Receive Purchase Order           │
├─────────────────────────────────────────┤
│                                         │
│  Choose Receive Type:                   │
│                                         │
│  ○ Full Receive (all items)             │
│  ○ Partial Receive (select items)       │
│  ○ With Serial Numbers                  │
│                                         │
│  ☑ Perform Quality Check                │ ← Optional checkbox
│                                         │
│  [Set Pricing] [Cancel] [Receive]       │
│                                         │
└─────────────────────────────────────────┘
```

**Benefits:**
- All receive options in ONE place
- Clear choice for user
- Quality check is optional checkbox
- Simpler workflow

---

### **STEP 5: Payment Button Consolidation** 💳

**Remove from:**
- ❌ List page "Pay" button
- ❌ Multiple payment buttons on detail page

**Keep only:**
- ✅ ONE "Make Payment" button on detail page when unpaid
- ✅ Clear payment status badge always visible

**New Payment Section:**
```
┌─────────────────────────────────┐
│  Payment Status                 │
├─────────────────────────────────┤
│  Status: UNPAID                 │
│  Total: TSh 5,000,000           │
│  Paid: TSh 0                    │
│  Balance: TSh 5,000,000         │
│                                 │
│  [Make Payment]                 │
│                                 │
│  ⚠️ Payment required to receive │
└─────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### **Phase 1: Backend Changes** (Database)

```sql
-- Update allowed statuses (remove intermediate ones)
ALTER TABLE lats_purchase_orders 
DROP CONSTRAINT IF EXISTS lats_purchase_orders_status_check;

ALTER TABLE lats_purchase_orders 
ADD CONSTRAINT lats_purchase_orders_status_check 
CHECK (status IN (
  'draft',
  'sent',
  'shipped', 
  'partial_received',
  'received',
  'completed',
  'cancelled'
));

-- Migrate existing orders
UPDATE lats_purchase_orders 
SET status = 'sent' 
WHERE status IN ('pending_approval', 'approved', 'confirmed');

UPDATE lats_purchase_orders 
SET status = 'completed' 
WHERE status = 'quality_checked';
```

---

### **Phase 2: Frontend Changes** (Code)

#### **File 1: Update Status Type**

```typescript
// src/features/lats/types/inventory.ts

export type PurchaseOrderStatus = 
  | 'draft'
  | 'sent'
  | 'shipped'
  | 'partial_received'
  | 'received'
  | 'completed'
  | 'cancelled';

// Remove:
// | 'pending_approval'
// | 'approved'
// | 'confirmed'
// | 'quality_checked'
```

---

#### **File 2: Update PurchaseOrdersPage.tsx**

**Location:** `src/features/lats/pages/PurchaseOrdersPage.tsx`

**Changes:**

```typescript
// REMOVE old getSmartActionButtons function (lines 250-425)
// REPLACE with simplified version:

const getSmartActionButtons = (order: any) => {
  const actions = [];
  const paymentStatus = order.payment_status || 'unpaid';
  
  switch (order.status) {
    case 'draft':
      actions.push({
        type: 'approve',
        label: 'Approve & Send',
        icon: <CheckSquare className="w-4 h-4" />,
        color: 'bg-green-600 hover:bg-green-700',
        onClick: () => handleApproveAndSend(order.id)
      });
      if (hasPermission('delete')) {
        actions.push({
          type: 'delete',
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          color: 'bg-red-600 hover:bg-red-700',
          onClick: () => handleDeleteOrder(order.id)
        });
      }
      break;

    case 'sent':
    case 'shipped':
      if (paymentStatus !== 'paid') {
        actions.push({
          type: 'pay',
          label: 'Make Payment',
          icon: <CreditCard className="w-4 h-4" />,
          color: 'bg-orange-600 hover:bg-orange-700',
          onClick: () => navigate(`/lats/purchase-orders/${order.id}?tab=payment`)
        });
      } else {
        actions.push({
          type: 'receive',
          label: 'Receive',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: () => navigate(`/lats/purchase-orders/${order.id}?action=receive`)
        });
      }
      break;
    
    case 'partial_received':
      if (paymentStatus === 'paid') {
        actions.push({
          type: 'receive',
          label: 'Continue Receiving',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: () => navigate(`/lats/purchase-orders/${order.id}?action=receive`)
        });
      }
      break;
    
    case 'received':
      actions.push({
        type: 'complete',
        label: 'Complete',
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'bg-green-600 hover:bg-green-700',
        onClick: () => handleCompleteOrder(order.id)
      });
      break;
    
    case 'completed':
      actions.push({
        type: 'duplicate',
        label: 'Duplicate',
        icon: <Copy className="w-4 h-4" />,
        color: 'bg-blue-600 hover:bg-blue-700',
        onClick: () => navigate(`/lats/purchase-orders/create?duplicate=${order.id}`)
      });
      break;
  }
  
  // Always show "More" dropdown with secondary actions
  actions.push({
    type: 'more',
    label: 'More',
    icon: <MoreVertical className="w-4 h-4" />,
    color: 'bg-gray-600 hover:bg-gray-700',
    onClick: () => showMoreMenu(order.id)
  });
  
  return actions;
};

// Add new combined handler
const handleApproveAndSend = async (orderId: string) => {
  try {
    // Approve
    const approveResponse = await approvePurchaseOrder(orderId);
    if (!approveResponse.ok) {
      toast.error('Failed to approve order');
      return;
    }
    
    // Send
    const sendResponse = await updatePurchaseOrder(orderId, { status: 'sent' });
    if (sendResponse.ok) {
      toast.success('Order approved and sent to supplier');
    } else {
      toast.error('Approved but failed to send');
    }
  } catch (error) {
    toast.error('Failed to process order');
  }
};
```

---

#### **File 3: Update PurchaseOrderDetailPage.tsx**

**Location:** `src/features/lats/pages/PurchaseOrderDetailPage.tsx`

**Changes to Action Buttons Section (lines 3018-3450):**

```typescript
{/* SIMPLIFIED Primary Actions */}
<div className="space-y-2">
  {purchaseOrder.status === 'draft' && (
    <>
      <button
        onClick={handleApproveAndSend}
        disabled={isApproving || isSaving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
      >
        <CheckSquare className="w-4 h-4" />
        {isApproving ? 'Processing...' : 'Approve & Send to Supplier'}
      </button>
      
      {hasPermission('delete') && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? 'Deleting...' : 'Delete Order'}
        </button>
      )}
    </>
  )}
  
  {(purchaseOrder.status === 'sent' || purchaseOrder.status === 'shipped') && (
    <>
      {purchaseOrder.paymentStatus !== 'paid' ? (
        <div className="space-y-3">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-1">Payment Required</h4>
                <p className="text-sm text-orange-700">
                  Complete payment to proceed with receiving this order
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleMakePayment}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
          >
            <CreditCard className="w-4 h-4" />
            Make Payment
          </button>
          
          {hasPermission('cancel') && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <XCircle className="w-4 h-4" />
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                Payment Complete - Ready to Receive
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowConsolidatedReceiveModal(true)}
            disabled={isReceiving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
          >
            <Package className="w-4 h-4" />
            {isReceiving ? 'Receiving...' : 'Receive Order'}
          </button>
        </div>
      )}
    </>
  )}
  
  {purchaseOrder.status === 'partial_received' && purchaseOrder.paymentStatus === 'paid' && (
    <button
      onClick={() => setShowConsolidatedReceiveModal(true)}
      disabled={isReceiving}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
    >
      <Package className="w-4 h-4" />
      {isReceiving ? 'Receiving...' : 'Continue Receiving'}
    </button>
  )}
  
  {purchaseOrder.status === 'received' && (
    <>
      <button
        onClick={handleCompleteOrder}
        disabled={isCompleting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
      >
        <CheckCircle className="w-4 h-4" />
        {isCompleting ? 'Completing...' : 'Complete Order'}
      </button>
      
      <button
        onClick={() => setShowQualityCheckModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
      >
        <PackageCheck className="w-4 h-4" />
        Quality Check (Optional)
      </button>
    </>
  )}
  
  {purchaseOrder.status === 'completed' && (
    <div className="text-center py-6">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Order Completed</h3>
      <p className="text-gray-600 text-sm mb-4">
        This order has been successfully completed
      </p>
      <button
        onClick={handleDuplicateOrder}
        disabled={isDuplicating}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
      >
        <Copy className="w-4 h-4" />
        {isDuplicating ? 'Duplicating...' : 'Duplicate Order'}
      </button>
    </div>
  )}
</div>

{/* Secondary Actions - Moved to bottom */}
<div className="pt-4 border-t border-gray-200 mt-4">
  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
    Documents & More
  </h4>
  <div className="grid grid-cols-3 gap-2">
    <button
      onClick={handlePrintOrder}
      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
    >
      <Printer className="w-4 h-4" />
      Print
    </button>
    
    {/* Export Dropdown */}
    <div className="relative">
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
      {showExportMenu && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <button
            onClick={handleExportPDF}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
          >
            Export as PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-t"
          >
            Export as Excel
          </button>
        </div>
      )}
    </div>
    
    <button
      onClick={handleViewNotes}
      className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm"
    >
      <FileText className="w-4 h-4" />
      Notes
    </button>
  </div>
</div>
```

---

#### **File 4: Create Consolidated Receive Modal**

**New File:** `src/features/lats/components/purchase-order/ConsolidatedReceiveModal.tsx`

```typescript
import React, { useState } from 'react';
import { X, Package, PackageCheck, QrCode } from 'lucide-react';

type ReceiveType = 'full' | 'partial' | 'serial';

interface ConsolidatedReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
  onReceive: (type: ReceiveType, includeQC: boolean) => void;
}

export const ConsolidatedReceiveModal: React.FC<ConsolidatedReceiveModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onReceive
}) => {
  const [receiveType, setReceiveType] = useState<ReceiveType>('full');
  const [includeQualityCheck, setIncludeQualityCheck] = useState(false);
  
  if (!isOpen) return null;
  
  const handleReceive = () => {
    onReceive(receiveType, includeQualityCheck);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Receive Purchase Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Order Number</div>
            <div className="text-lg font-semibold text-gray-900">
              {purchaseOrder.orderNumber}
            </div>
          </div>
          
          {/* Receive Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Choose Receive Type
            </label>
            
            <div className="space-y-2">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: receiveType === 'full' ? '#10b981' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="receiveType"
                  value="full"
                  checked={receiveType === 'full'}
                  onChange={(e) => setReceiveType(e.target.value as ReceiveType)}
                  className="mr-3"
                />
                <Package className="w-5 h-5 mr-3 text-green-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Full Receive</div>
                  <div className="text-sm text-gray-500">Receive all items at once</div>
                </div>
              </label>
              
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: receiveType === 'partial' ? '#10b981' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="receiveType"
                  value="partial"
                  checked={receiveType === 'partial'}
                  onChange={(e) => setReceiveType(e.target.value as ReceiveType)}
                  className="mr-3"
                />
                <PackageCheck className="w-5 h-5 mr-3 text-orange-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Partial Receive</div>
                  <div className="text-sm text-gray-500">Select specific items to receive</div>
                </div>
              </label>
              
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: receiveType === 'serial' ? '#10b981' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="receiveType"
                  value="serial"
                  checked={receiveType === 'serial'}
                  onChange={(e) => setReceiveType(e.target.value as ReceiveType)}
                  className="mr-3"
                />
                <QrCode className="w-5 h-5 mr-3 text-purple-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">With Serial Numbers</div>
                  <div className="text-sm text-gray-500">Track items with serial/IMEI numbers</div>
                </div>
              </label>
            </div>
          </div>
          
          {/* Quality Check Option */}
          <div className="flex items-start p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <input
              type="checkbox"
              id="includeQC"
              checked={includeQualityCheck}
              onChange={(e) => setIncludeQualityCheck(e.target.checked)}
              className="mt-1 mr-3"
            />
            <label htmlFor="includeQC" className="flex-1 cursor-pointer">
              <div className="font-medium text-purple-900">Include Quality Check</div>
              <div className="text-sm text-purple-700">
                Perform quality check during receiving process (optional)
              </div>
            </label>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleReceive}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Proceed to Receive
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📊 Before & After Comparison

### **Button Count Reduction:**

| Page | Before | After | Reduction |
|------|--------|-------|-----------|
| List Page - Per Order | 3-4 buttons | 2-3 buttons | **25-33%** |
| Detail Page - Primary | 8-12 buttons | 3-5 buttons | **50-60%** |
| Detail Page - Secondary | 6-8 buttons | 3 + dropdown | **40%** |

### **Status Count Reduction:**

| Type | Before | After | Reduction |
|------|--------|-------|-----------|
| Total Statuses | 11 | 7 | **36%** |
| User Actions | 30+ | 18 | **40%** |

---

## ✅ Benefits of Changes

### **For Users:**
1. ✅ **Clearer workflow** - Fewer steps to complete
2. ✅ **Less confusion** - Fewer button choices
3. ✅ **Faster completion** - Streamlined process
4. ✅ **Better mobile UX** - Fewer buttons = cleaner mobile UI
5. ✅ **Logical grouping** - Related actions together

### **For Developers:**
1. ✅ **Easier maintenance** - Less code to maintain
2. ✅ **Fewer bugs** - Fewer edge cases
3. ✅ **Clearer logic** - Simpler state machine
4. ✅ **Better testing** - Fewer paths to test
5. ✅ **Faster development** - Less complexity

### **For Business:**
1. ✅ **Faster training** - Simpler to teach
2. ✅ **Fewer errors** - Less user confusion
3. ✅ **Better adoption** - Easier to use
4. ✅ **Lower support cost** - Fewer questions
5. ✅ **Higher efficiency** - Faster order processing

---

## 🎯 Migration Plan

### **Week 1: Backend**
- [ ] Update database schema
- [ ] Migrate existing orders
- [ ] Update API endpoints
- [ ] Test migrations

### **Week 2: Frontend - List Page**
- [ ] Update PurchaseOrdersPage.tsx
- [ ] Implement new button layout
- [ ] Add "More" dropdown menu
- [ ] Test all statuses

### **Week 3: Frontend - Detail Page**
- [ ] Update PurchaseOrderDetailPage.tsx
- [ ] Create ConsolidatedReceiveModal
- [ ] Reorganize action buttons
- [ ] Test all workflows

### **Week 4: Testing & Deployment**
- [ ] QA testing
- [ ] User acceptance testing
- [ ] Fix any issues
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 📝 Summary

### **What to Remove:**
1. ❌ "pending_approval" status
2. ❌ "approved" status
3. ❌ "confirmed" status
4. ❌ "quality_checked" status
5. ❌ Edit button from list page
6. ❌ Multiple payment buttons
7. ❌ Separate receive option buttons
8. ❌ Return order button (move to dropdown)

### **What to Keep:**
1. ✅ Approve (rename to "Approve & Send")
2. ✅ Make Payment (single location)
3. ✅ Receive (consolidated modal)
4. ✅ Complete
5. ✅ Delete (draft only)
6. ✅ Cancel
7. ✅ Print
8. ✅ Export (as dropdown)
9. ✅ Notes
10. ✅ Duplicate

### **What to Consolidate:**
1. 🔄 All receive options → One button + modal
2. 🔄 PDF/Excel export → One dropdown
3. 🔄 Approve + Send → One action
4. 🔄 Quality check → Optional checkbox

---

**Result:** Cleaner, simpler, more intuitive Purchase Order management! 🎉

