# Purchase Order Status Flow Diagram

## Visual Workflow Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PURCHASE ORDER WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │  DRAFT   │
                              │  Status  │
                              └────┬─────┘
                                   │
                     ┌─────────────┼─────────────┐
                     │             │             │
                ┌────▼────┐   ┌───▼────┐   ┌────▼────┐
                │  EDIT   │   │APPROVE │   │ DELETE  │
                └────┬────┘   └───┬────┘   └─────────┘
                     │            │
                     └────────────┤
                                  │
                         ┌────────▼─────────┐
                         │ PENDING_APPROVAL │
                         │     Status       │
                         └────────┬─────────┘
                                  │
                     ┌────────────┼────────────┐
                     │                         │
                ┌────▼────┐              ┌────▼────┐
                │ APPROVE │              │ REJECT  │
                │         │              │(→Draft) │
                └────┬────┘              └─────────┘
                     │
              ┌──────▼──────┐
              │  APPROVED   │
              │   Status    │
              └──────┬──────┘
                     │
                ┌────▼────┐
                │  SEND   │
                └────┬────┘
                     │
                ┌────▼────┐
                │  SENT   │◄──────┐
                │ Status  │       │
                └────┬────┘       │
                     │            │
         ┌───────────┼───────────┐│
         │           │           ││
    ┌────▼────┐ ┌───▼─────┐ ┌───▼▼────┐
    │ CONFIRM │ │   PAY   │ │ CANCEL  │
    └────┬────┘ └────┬────┘ └─────────┘
         │           │
         │      ┌────▼────────────────────────┐
         │      │ PAYMENT REQUIRED TO PROCEED │
         │      └─────────────────────────────┘
         │
    ┌────▼────────┐
    │  CONFIRMED  │
    │   Status    │
    └──────┬──────┘
           │
      ┌────▼────┐
      │  SHIP   │
      └────┬────┘
           │
      ┌────▼────┐
      │ SHIPPED │◄──────────────────┐
      │ Status  │                   │
      └────┬────┘                   │
           │                        │
           │ ┌──────────────────────┴──────────────────────┐
           │ │  PAYMENT CHECK: Is order fully paid?        │
           │ └──────────────────────┬──────────────────────┘
           │                        │
           │                   ┌────▼────┐
           │                   │   NO    │
           │                   └────┬────┘
           │                        │
           │                   ┌────▼────────┐
           │                   │ SHOW PAYMENT│
           │                   │   BUTTON    │
           │                   └────┬────────┘
           │                        │
           │                   ┌────▼────────┐
           │                   │ BLOCK RECEIVE│
           │                   │   ACTIONS    │
           │                   └──────────────┘
           │
      ┌────▼────────┐
      │  YES (PAID) │
      └────┬────────┘
           │
      ┌────▼─────────────────────────────┐
      │      RECEIVE OPTIONS:             │
      │  1. Full Receive                 │
      │  2. Partial Receive              │
      │  3. Receive with Serial Numbers  │
      └────┬─────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼────┐   ┌───▼──────────┐
│PARTIAL │   │   RECEIVED   │
│RECEIVED│   │    Status    │
└───┬────┘   └───┬──────────┘
    │            │
    │       ┌────▼────────┐
    │       │   QUALITY   │
    │       │    CHECK    │
    │       └────┬────────┘
    │            │
    │       ┌────▼────────┐
    │       │     ADD     │
    │       │ TO INVENTORY│
    │       └────┬────────┘
    │            │
    └────────────┤
                 │
            ┌────▼────┐
            │COMPLETE │
            └────┬────┘
                 │
            ┌────▼─────┐
            │COMPLETED │
            │  Status  │
            │  (FINAL) │
            └──────────┘

┌─────────────────────────────────────────┐
│         SPECIAL FLOWS                   │
└─────────────────────────────────────────┘

Any Status (Non-Final) → CANCEL → CANCELLED Status (FINAL)
                                    
RECEIVED/PARTIAL_RECEIVED → RETURN ORDER → Create Return Record


═══════════════════════════════════════════════════════════════
                    ACTION BUTTONS BY STATUS
═══════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────┐
│ DRAFT                                                         │
├──────────────────────────────────────────────────────────────┤
│ Primary Actions:                                             │
│   🔵 View Details                                            │
│   🟢 Edit Order                                              │
│   🟢 Submit for Approval                                     │
│   🔴 Delete Order                                            │
├──────────────────────────────────────────────────────────────┤
│ Permissions: Admin, Manager, Staff (limited)                │
│ Next Status: pending_approval                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PENDING_APPROVAL                                             │
├──────────────────────────────────────────────────────────────┤
│ Primary Actions:                                             │
│   🔵 View Details                                            │
│   🟡 Review Approval (Approve/Reject)                        │
├──────────────────────────────────────────────────────────────┤
│ Permissions: Admin, Manager only                            │
│ Next Status: approved OR draft (if rejected)                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ APPROVED                                                     │
├──────────────────────────────────────────────────────────────┤
│ Primary Actions:                                             │
│   🔵 View Details                                            │
│   🔵 Send to Supplier                                        │
├──────────────────────────────────────────────────────────────┤
│ Permissions: All users                                       │
│ Next Status: sent                                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ SENT                                                         │
├──────────────────────────────────────────────────────────────┤
│ Primary Actions:                                             │
│   🔵 View Details                                            │
│   🟢 Mark as Confirmed                                       │
│   🟠 Make Payment (if unpaid/partial)                        │
│   🔴 Cancel Order (if unpaid)                                │
├──────────────────────────────────────────────────────────────┤
│ Payment Check: Required before receiving                    │
│ Next Status: confirmed                                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ CONFIRMED                                                    │
├──────────────────────────────────────────────────────────────┤
│ Primary Actions:                                             │
│   🔵 View Details                                            │
│   🔵 Mark as Shipped                                         │
│   🟠 Make Payment (if unpaid/partial)                        │
│   🔴 Cancel Order (if unpaid, with permission)               │
├──────────────────────────────────────────────────────────────┤
│ Payment Check: Required before receiving                    │
│ Next Status: shipped                                         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ SHIPPED                                                      │
├──────────────────────────────────────────────────────────────┤
│ IF FULLY PAID:                                               │
│   🟢 Receive Full Order                                      │
│   🟠 Partial Receive                                         │
│   🟣 Receive with Serial Numbers                             │
│                                                              │
│ IF NOT PAID:                                                 │
│   🟠 Make Payment                                            │
│   ⚠️  Warning: Payment Required                              │
├──────────────────────────────────────────────────────────────┤
│ Payment Gate: MUST BE PAID to receive                       │
│ Next Status: received OR partial_received                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PARTIAL_RECEIVED                                             │
├──────────────────────────────────────────────────────────────┤
│ IF FULLY PAID:                                               │
│   🟢 Receive Remaining                                       │
│   🟠 Partial More                                            │
│   🟣 Receive with Serial Numbers                             │
│   🔴 Return Order                                            │
│                                                              │
│ IF NOT PAID:                                                 │
│   🟠 Pay Remaining                                           │
├──────────────────────────────────────────────────────────────┤
│ Next Status: received (when all items received)             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ RECEIVED                                                     │
├──────────────────────────────────────────────────────────────┤
│ Primary Actions:                                             │
│   🔵 View Details                                            │
│   🟣 Quality Check                                           │
│   🔵 Add to Inventory (after QC)                             │
│   🟢 Complete Order                                          │
│   🔴 Return Order                                            │
├──────────────────────────────────────────────────────────────┤
│ Optional: Quality Check before completion                   │
│ Next Status: completed                                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ COMPLETED                                                    │
├──────────────────────────────────────────────────────────────┤
│ Actions:                                                     │
│   🔵 View Details                                            │
│   🟣 Create Similar (Duplicate)                              │
│   📄 Document Actions (Print, PDF, Excel)                    │
│   📝 View History & Notes                                    │
├──────────────────────────────────────────────────────────────┤
│ Status: FINAL - No status changes allowed                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ CANCELLED                                                    │
├──────────────────────────────────────────────────────────────┤
│ Actions:                                                     │
│   🔵 View Details                                            │
│   📄 Document Actions (Print, PDF, Excel)                    │
│   📝 View History & Notes                                    │
├──────────────────────────────────────────────────────────────┤
│ Status: FINAL - No status changes allowed                   │
└──────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════
             SECONDARY ACTIONS (All Statuses)
═══════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────┐
│ DOCUMENT ACTIONS                                             │
├──────────────────────────────────────────────────────────────┤
│   🖨️  Print Order                                            │
│   📄 Export as PDF                                           │
│   📊 Export as Excel                                         │
│   📝 View/Add Notes                                          │
│   📜 View Audit History                                      │
│   📱 Communication (SMS/WhatsApp)                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ BULK ACTIONS (Detail Page)                                  │
├──────────────────────────────────────────────────────────────┤
│   ✅ Update Status (Multiple items)                          │
│   📍 Assign Location (Multiple items)                        │
│   📤 Export Selected Items                                   │
└──────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════
                    PAYMENT WORKFLOW
═══════════════════════════════════════════════════════════════

                  ┌─────────────┐
                  │ Order Created│
                  └──────┬───────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Sent/Shipped │
                  └──────┬───────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
    ┌──────────────┐          ┌──────────────┐
    │   UNPAID     │          │   PARTIAL    │
    │   Status     │          │   Status     │
    └──────┬───────┘          └──────┬───────┘
           │                         │
           │  ┌──────────────────────┤
           │  │                      │
           ▼  ▼                      │
    ┌─────────────────┐             │
    │  Make Payment   │◄────────────┘
    │     Button      │
    └──────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │  PAID        │
    │  Status      │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ RECEIVE      │
    │ UNLOCKED     │
    └──────────────┘

Key Payment Rules:
✅ Payment required BEFORE receiving
✅ Cannot cancel if fully paid (protection)
✅ Cannot delete if fully paid
✅ Payment status: unpaid → partial → paid


═══════════════════════════════════════════════════════════════
              PERMISSION MATRIX
═══════════════════════════════════════════════════════════════

┌──────────────┬───────┬─────────┬────────┐
│   Action     │ Admin │ Manager │ Staff  │
├──────────────┼───────┼─────────┼────────┤
│ View         │   ✅  │   ✅    │   ✅   │
│ Create       │   ✅  │   ✅    │   ✅   │
│ Edit         │   ✅  │   ✅    │   ✅   │
│ Approve      │   ✅  │   ✅    │   ❌   │
│ Delete       │   ✅  │   ✅    │   ❌   │
│ Cancel       │   ✅  │   ✅    │   ❌   │
│ Receive      │   ✅  │   ✅    │   ✅   │
│ Pay          │   ✅  │   ✅    │   ✅   │
│ Export       │   ✅  │   ✅    │   ✅   │
│ Print        │   ✅  │   ✅    │   ✅   │
└──────────────┴───────┴─────────┴────────┘


═══════════════════════════════════════════════════════════════
              QUALITY CHECK WORKFLOW
═══════════════════════════════════════════════════════════════

    ┌──────────────┐
    │   RECEIVED   │
    │    Status    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Quality Check│
    │    Button    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────┐
    │  QC Modal Opens      │
    │  - Check each item   │
    │  - Mark pass/fail    │
    │  - Add notes         │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  QC Results Saved    │
    │  - Passed: ✅        │
    │  - Failed: ❌        │
    │  - Attention: ⚠️     │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Add to Inventory     │
    │   Button Appears     │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Items Added to       │
    │ Main Inventory       │
    └──────────────────────┘


═══════════════════════════════════════════════════════════════
                STATUS COLOR LEGEND
═══════════════════════════════════════════════════════════════

🟤 DRAFT              - Slate/Gray
🟡 PENDING_APPROVAL   - Amber/Yellow
🔵 APPROVED           - Sky Blue
🔵 SENT               - Blue
🟣 CONFIRMED          - Purple
🟠 PROCESSING         - Orange
🟡 SHIPPING           - Yellow
🔵 SHIPPED            - Cyan
🔵 PARTIAL_RECEIVED   - Teal
🟢 RECEIVED           - Emerald
🟢 QUALITY_CHECKED    - Green
🟢 COMPLETED          - Dark Green
🔴 CANCELLED          - Red

Payment Status Colors:
🔴 UNPAID             - Red
🟡 PARTIAL            - Yellow
🟢 PAID               - Green


═══════════════════════════════════════════════════════════════
              CRITICAL VALIDATION POINTS
═══════════════════════════════════════════════════════════════

🛡️ PAYMENT GATE
   └─ Location: Before Receive Actions
   └─ Check: paymentStatus === 'paid'
   └─ Impact: Blocks all receive operations if not paid

🛡️ PERMISSION GATE
   └─ Location: Approve, Delete, Cancel actions
   └─ Check: hasPermission(action)
   └─ Impact: Restricts access based on user role

🛡️ STATUS PROGRESSION GATE
   └─ Location: All status transitions
   └─ Check: Valid next status in workflow
   └─ Impact: Prevents invalid status jumps

🛡️ PAID ORDER PROTECTION
   └─ Location: Cancel & Delete actions
   └─ Check: paymentStatus !== 'paid'
   └─ Impact: Prevents cancellation of paid orders


═══════════════════════════════════════════════════════════════
                  END OF DIAGRAM
═══════════════════════════════════════════════════════════════

