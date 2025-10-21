# Purchase Order Action Buttons - Quick Test Guide

## 🧪 Manual Testing Checklist

Use this guide to quickly verify all PO action buttons are working correctly.

---

## Test Environment Setup

### Prerequisites:
- [ ] User logged in with appropriate role
- [ ] Database accessible
- [ ] Purchase orders exist in different statuses
- [ ] Payment system configured

### Test Users Needed:
1. **Admin** - Full permissions
2. **Manager** - Full permissions
3. **Staff** - Limited permissions

---

## 1️⃣ DRAFT STATUS TESTS

### Test Order: Create a draft purchase order

**List Page Actions:**
```
✅ Click "View Details" button
   Expected: Navigate to detail page
   
✅ Click "Edit Order" button
   Expected: Navigate to edit page with order data loaded
   
✅ Click "Approve" button
   Expected: Status changes to 'pending_approval', toast success message
   
✅ Click "Delete Order" button
   Expected: Confirmation dialog, order deleted, toast success message
```

**Detail Page Actions:**
```
✅ Click "Edit Order" button
   Expected: Opens edit page in new tab
   
✅ Click "Submit for Approval" button
   Expected: Status → 'pending_approval', toast message, button disabled during load
   
✅ Click "Delete Order" button
   Expected: Confirmation, order deleted, navigate back to list
```

**Permission Tests:**
```
✅ Staff user: Can edit, cannot approve/delete
✅ Manager user: Can edit, approve, delete
✅ Admin user: Can edit, approve, delete
```

---

## 2️⃣ PENDING_APPROVAL STATUS TESTS

### Test Order: Use order from Draft test or create manually

**List Page Actions:**
```
✅ Click "Review Approval" button
   Expected: Navigate to detail page with ?action=approve query param
```

**Detail Page Actions:**
```
✅ Click "Review Approval" button
   Expected: Opens approval modal with Approve/Reject options
   
✅ Click "Approve" in modal
   Expected: Status → 'approved', modal closes, toast success
   
✅ Click "Reject" in modal
   Expected: Status → 'draft', modal closes, toast message
```

**Permission Tests:**
```
✅ Staff user: Cannot see approval buttons
✅ Manager user: Can approve/reject
✅ Admin user: Can approve/reject
```

---

## 3️⃣ APPROVED STATUS TESTS

### Test Order: Use approved order from previous test

**List Page Actions:**
```
✅ Click "Send to Supplier" button
   Expected: Status → 'sent', toast success message
```

**Detail Page Actions:**
```
✅ Click "Send to Supplier" button
   Expected: Status → 'sent', button shows loading state, toast success
```

---

## 4️⃣ SENT STATUS TESTS

### Test Order: Use sent order from previous test

**List Page Actions:**
```
✅ If payment_status = 'unpaid':
   - "Pay" button visible
   - Click "Pay" → Navigate to payment page
   
✅ If payment_status = 'paid':
   - "Receive" button visible
   - Click "Receive" → Order received
```

**Detail Page Actions:**
```
✅ Click "Mark as Confirmed" button
   Expected: Status → 'confirmed', toast success
   
✅ Click "Make Payment" button (if unpaid)
   Expected: Payment modal opens
   
✅ Click "Cancel Order" button (if unpaid)
   Expected: Confirmation dialog, order cancelled
   
✅ Verify: Cannot cancel if payment_status = 'paid'
```

---

## 5️⃣ CONFIRMED STATUS TESTS

### Test Order: Use confirmed order

**Detail Page Actions:**
```
✅ Click "Mark as Shipped" button
   Expected: Status → 'shipped', toast success
   
✅ Click "Make Payment" button (if unpaid)
   Expected: Payment modal opens
   
✅ Click "Cancel Order" button (if unpaid and has permission)
   Expected: Confirmation dialog, order cancelled
```

---

## 6️⃣ SHIPPED STATUS TESTS - PAYMENT GATE

### Test Scenario A: Unpaid Order
```
✅ Verify "Receive" buttons are NOT visible
✅ Verify "Make Payment" button IS visible
✅ Verify warning message: "Payment Required: Complete payment to receive this order"
✅ Click "Make Payment" → Payment modal opens
```

### Test Scenario B: Paid Order
```
✅ Verify "Receive Full Order" button IS visible
✅ Verify "Partial Receive" button IS visible
✅ Verify "Receive with S/N" button IS visible
✅ Verify payment warning is NOT displayed
```

**Receive Full Order Test:**
```
✅ Click "Receive Full Order"
   Expected: 
   - Pricing modal opens (SetPricingModal)
   - Can set selling prices
   - Click confirm
   - Status → 'received'
   - All items marked as received
   - Toast success message
```

**Partial Receive Test:**
```
✅ Click "Partial Receive"
   Expected:
   - Partial receive modal opens
   - Can select items to receive
   - Can set quantities
   - Click confirm
   - Status → 'partial_received'
   - Selected items marked as received
   - Toast success message
```

**Receive with Serial Numbers Test:**
```
✅ Click "Receive with S/N"
   Expected:
   - Serial number modal opens
   - Can enter serial numbers/IMEI for each item
   - Click confirm
   - Items added to inventory with serial numbers
   - Status → 'received' or 'partial_received'
   - Toast success message
```

---

## 7️⃣ PARTIAL_RECEIVED STATUS TESTS

### Test Order: Use partially received order

**Paid Order Actions:**
```
✅ Click "Receive Remaining"
   Expected: Remaining items received, status → 'received'
   
✅ Click "Partial More"
   Expected: Partial receive modal opens for remaining items
   
✅ Click "Receive with S/N"
   Expected: Serial number modal opens
```

**Unpaid Order Actions:**
```
✅ Click "Pay Remaining"
   Expected: Payment modal opens
```

---

## 8️⃣ RECEIVED STATUS TESTS

### Test Order: Use received order

**Detail Page Actions:**
```
✅ Click "Quality Check" button
   Expected:
   - Quality check modal opens
   - Can mark items as passed/failed/attention
   - Can add notes
   - Click save
   - Quality check results saved
   - Toast success message
   
✅ After Quality Check:
   - Verify "Add to Inventory" button appears
   - Verify quality check summary shows
   
✅ Click "Add to Inventory"
   Expected:
   - Inventory modal opens
   - Can set profit margin, location
   - Click confirm
   - Items added to main inventory
   - Toast success message
   
✅ Click "Complete Order"
   Expected:
   - Status → 'completed'
   - Toast success message
   - Order marked as final
   
✅ Click "Return Order"
   Expected:
   - Return order modal opens
   - Can select items to return
   - Can add reason
   - Click confirm
   - Return order created
   - Toast success message
```

---

## 9️⃣ COMPLETED STATUS TESTS

### Test Order: Use completed order

**List Page Actions:**
```
✅ Click "Create Similar" button
   Expected: Duplicates order, navigate to new order
```

**Detail Page Actions:**
```
✅ Verify completion message is displayed
✅ Verify green checkmark icon shown
✅ Verify no status change buttons visible
✅ Click "Duplicate" button (if available)
   Expected: Order duplicated, navigate to new order
```

---

## 🔟 CANCELLED STATUS TESTS

### Test Order: Use cancelled order

**Detail Page Actions:**
```
✅ Verify cancellation message is displayed
✅ Verify red X icon shown
✅ Verify no status change buttons visible
✅ Verify document actions still available (Print, Export)
```

---

## 📄 SECONDARY ACTIONS TESTS (All Statuses)

### Document Actions
```
✅ Click "Print" button
   Expected:
   - Print dialog opens with formatted order
   - Business info included
   - All order details visible
   - No errors in console
   
✅ Click "Export PDF" button
   Expected:
   - PDF download starts
   - Filename: PO-{orderNumber}.pdf
   - PDF contains all order information
   - Toast success message
   
✅ Click "Export Excel" button
   Expected:
   - Excel download starts
   - Filename: PO-{orderNumber}.xlsx
   - Excel contains summary and items sheets
   - Toast success message
   
✅ Click "Notes" button
   Expected:
   - Notes modal opens
   - Can view existing notes
   - Can add new note
   - Click save
   - Note added
   - Toast success message
```

### Communication Actions
```
✅ Click "View Communication History"
   Expected:
   - Communication modal opens
   - Shows SMS/WhatsApp history
   - Shows system messages
   
✅ Click "Send SMS" (if supplier has phone)
   Expected:
   - SMS confirmation
   - Message logged
   - Toast success message
   
✅ Click "Send WhatsApp" (if supplier has phone)
   Expected:
   - WhatsApp opens with pre-filled message
   - Message contains order details
```

### Bulk Actions
```
✅ Click "Bulk Actions" button
   Expected:
   - Bulk actions panel appears
   - Can select multiple items (checkboxes)
   
✅ Select items + Click "Update Status"
   Expected:
   - Status update modal opens
   - Can choose new status
   - Click confirm
   - Selected items updated
   - Toast success message
   
✅ Select items + Click "Assign Location"
   Expected:
   - Location modal opens
   - Can choose/enter location
   - Click confirm
   - Selected items updated
   - Toast success message
   
✅ Select items + Click "Export Selected"
   Expected:
   - CSV download starts
   - File contains selected items only
   - Toast success message
```

---

## 🔐 PERMISSION TESTS

### Staff User Tests
```
✅ Draft order:
   - Can edit ✅
   - Cannot approve ❌
   - Cannot delete ❌
   
✅ Sent order:
   - Can view ✅
   - Can pay ✅
   - Cannot cancel ❌
   
✅ Shipped order (paid):
   - Can receive ✅
   
✅ Received order:
   - Can quality check ✅
   - Can add to inventory ✅
```

### Manager User Tests
```
✅ All actions available
✅ Can approve orders
✅ Can delete orders
✅ Can cancel orders
```

### Admin User Tests
```
✅ All actions available
✅ Full system access
```

---

## 💳 PAYMENT INTEGRATION TESTS

### Payment Flow Test
```
1. Create order → Status: draft
2. Approve → Status: sent
3. Verify payment_status: unpaid
4. Try to receive → ❌ Blocked, payment button shown
5. Click "Make Payment"
   - Payment modal opens
   - Add payment entries
   - Total = order total
   - Click confirm
   - Payment saved
6. Verify payment_status: paid
7. Try to receive → ✅ Allowed, receive buttons shown
8. Receive order → ✅ Success
```

### Payment Protection Test
```
1. Create paid order (payment_status = 'paid')
2. Try to cancel → ❌ Should be blocked or warning shown
3. Try to delete → ❌ Should be blocked
```

---

## ⚠️ ERROR HANDLING TESTS

### Network Error Simulation
```
✅ Disconnect network
✅ Try any action
   Expected:
   - Loading state shown
   - Error toast displayed
   - User-friendly error message
   - No console errors breaking the app
   
✅ Reconnect network
✅ Retry action
   Expected: Works correctly
```

### Invalid Data Test
```
✅ Try to receive with invalid quantities
   Expected: Validation error, clear message
   
✅ Try to approve without required fields
   Expected: Validation error, clear message
   
✅ Try to pay more than order total
   Expected: Validation error, clear message
```

---

## 📊 LOADING STATES TESTS

### Verify Loading Indicators
```
✅ Click any action button
   Expected:
   - Button shows loading text (e.g., "Saving..." instead of "Save")
   - Button is disabled during operation
   - Spinner or loading icon shown (if applicable)
   - Cannot click again during loading
   
✅ Wait for operation to complete
   Expected:
   - Button returns to normal state
   - Button re-enabled
   - Loading indicator removed
```

---

## 🔄 AUTO-REFRESH TESTS (If Enabled)

### Background Refresh Test
```
✅ Open detail page
✅ Wait for auto-refresh (30 seconds default)
   Expected:
   - Background loading indicator shown
   - Data refreshes
   - No disruption to user
   - Last refresh timestamp updates
   
✅ Click manual refresh button
   Expected:
   - Immediate refresh
   - Loading indicator shown
   - Data updated
   - Timestamp updates
```

---

## 🐛 EDGE CASES & SPECIAL SCENARIOS

### Concurrent User Actions
```
✅ User A opens order
✅ User B approves same order
✅ User A tries to edit
   Expected: Handled gracefully, status check, or reload
```

### Browser Back/Forward
```
✅ Navigate through workflow
✅ Use browser back button
   Expected: Correct state maintained, data reloaded
```

### Tab Refresh
```
✅ Make changes
✅ Refresh browser tab (F5)
   Expected: Changes persisted, correct state shown
```

### Multiple Tabs
```
✅ Open same order in two tabs
✅ Make change in tab 1
✅ Switch to tab 2
   Expected: Tab 2 shows updated data (with manual refresh if no auto-refresh)
```

---

## ✅ FINAL VERIFICATION CHECKLIST

After completing all tests:

### Functionality Check
- [ ] All status transitions work correctly
- [ ] Payment gate enforced properly
- [ ] Permission checks functioning
- [ ] Loading states display correctly
- [ ] Error handling working
- [ ] Toast notifications appearing
- [ ] Document exports generating correctly
- [ ] Communication features working
- [ ] Bulk actions functioning
- [ ] Quality check system operational
- [ ] Inventory integration working

### UI/UX Check
- [ ] Buttons properly labeled
- [ ] Icons displaying correctly
- [ ] Colors indicate status appropriately
- [ ] Tooltips showing on hover
- [ ] Responsive on mobile devices
- [ ] Disabled states visually clear
- [ ] Loading indicators visible
- [ ] Error messages user-friendly
- [ ] Success messages confirming actions
- [ ] Modal dialogs sized appropriately

### Data Integrity Check
- [ ] Status updates save to database
- [ ] Payment records created correctly
- [ ] Quality check data persisted
- [ ] Inventory items created with correct data
- [ ] Serial numbers saved properly
- [ ] Audit trail complete
- [ ] Notes saved correctly
- [ ] Communication history logged
- [ ] Return orders recorded
- [ ] Timestamps accurate

---

## 🎯 CRITICAL PATH TEST (Quick Full Workflow)

### Complete Order Lifecycle (5-10 minutes)
```
1. ✅ Create draft order
2. ✅ Submit for approval
3. ✅ Approve order (Manager/Admin)
4. ✅ Send to supplier
5. ✅ Mark as confirmed
6. ✅ Mark as shipped
7. ✅ Make payment (full payment)
8. ✅ Verify payment status = 'paid'
9. ✅ Receive full order (with pricing)
10. ✅ Perform quality check
11. ✅ Add to inventory
12. ✅ Complete order
13. ✅ Verify status = 'completed'
14. ✅ Export order as PDF
15. ✅ Duplicate order
```

**Expected Time:** 5-10 minutes for full cycle
**Expected Result:** All actions succeed, no errors, complete audit trail

---

## 📝 TEST REPORT TEMPLATE

After completing tests, document results:

```markdown
# PO Action Buttons Test Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Dev/Staging/Production]
**Browser:** [Chrome/Firefox/Safari]
**User Role:** [Admin/Manager/Staff]

## Test Results Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Blocked: [X]

## Failed Tests
1. [Test Name]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]
   - Screenshot: [Link]
   - Console Error: [Error message]

## Blockers
1. [Issue description]

## Recommendations
1. [Recommendation]

## Sign-off
- [ ] All critical tests passed
- [ ] Documentation updated
- [ ] Known issues logged
```

---

## 🚀 AUTOMATION OPPORTUNITIES

Consider automating these tests with:
- Playwright/Cypress for E2E tests
- Jest for unit tests
- API tests for backend validation

---

**Test Completion Status:** ☐ Not Started | ☐ In Progress | ☐ Completed ✅

**Last Updated:** [Date]

