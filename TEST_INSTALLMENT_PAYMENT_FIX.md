# Test Checklist: Installment Payment Amount Fix

## ✅ Quick Test Guide

Use this checklist to verify the installment payment fix is working correctly.

---

## Test 1: Create New Installment Plan from POS ✓

### Steps:
1. ✅ Open POS page
2. ✅ Add items to cart (any amount, e.g., 500,000 TZS)
3. ✅ Select a customer
4. ✅ Click "Installment Plan" button

### Expected Results:
- [ ] Modal opens with title "Create Installment Plan"
- [ ] Cart total is displayed correctly
- [ ] Down payment field is editable

### Enter Test Data:
- Down Payment: `100,000`
- Number of Installments: `8`
- Payment Frequency: `Monthly`
- Select Payment Account: `(any)`

### Verify Calculations:
- [ ] **"Amount to Finance"** shows: `400,000 TZS` (500,000 - 100,000)
- [ ] **"Calculated Per Installment"** shows: `50,000 TZS` (400,000 ÷ 8)
- [ ] Green calculation box is visible
- [ ] If down payment > 0: Shows message "💰 Down payment of 100,000 will be recorded..."

### Submit:
5. ✅ Click "Create Installment Plan"

### Expected Results:
- [ ] Success toast appears
- [ ] Cart is cleared
- [ ] Modal closes
- [ ] Console shows detailed logs with 💰 emoji

---

## Test 2: Verify Down Payment Was Recorded ✓

### Steps:
1. ✅ Go to Installments page
2. ✅ Find the plan you just created

### Verify:
- [ ] Plan status is "Active"
- [ ] **Total Paid** = `100,000` (the down payment)
- [ ] **Balance Due** = `400,000` (total - down payment)
- [ ] **Installments Paid** = `1` (or `0` depending on your system config)
- [ ] Down payment appears in payment history

---

## Test 3: Record Regular Payment ✓

### Steps:
1. ✅ On Installments page, find an active plan
2. ✅ Click "Record Payment" button (dollar icon)

### Verify Modal Opens:
- [ ] Title shows "Record Payment - Plan: [PLAN_NUMBER]"
- [ ] Customer name is displayed
- [ ] Installments paid count is shown (e.g., "1 / 8")
- [ ] Remaining balance is shown

### Check Key Section:
- [ ] **"Calculated Installment Amount"** is displayed with separator line
- [ ] Amount shows correct installment (e.g., `50,000.00 TZS`)

### Check Payment Amount Field:
- [ ] **Payment Amount** is pre-filled with installment amount (`50,000`)
- [ ] Helper text shows: "💡 Default amount is set to the calculated installment price..."
- [ ] Amount is editable if needed

### Submit Payment:
3. ✅ Select payment method
4. ✅ Select payment account
5. ✅ Click "Record Payment"

### Expected Results:
- [ ] Success toast: "Payment recorded successfully!"
- [ ] Modal closes
- [ ] Plan list refreshes
- [ ] **Installments Paid** increased by 1
- [ ] **Total Paid** increased by installment amount
- [ ] **Balance Due** decreased by installment amount
- [ ] Console shows detailed logs with 💰 emoji

---

## Test 4: Verify Payment Was Recorded Correctly ✓

### Steps:
1. ✅ Click on the plan to view details
2. ✅ Check payment history

### Verify:
- [ ] New payment appears in history
- [ ] Payment amount = `50,000` (the calculated installment)
- [ ] Payment method matches what you selected
- [ ] Payment date is today
- [ ] Status is "Paid"

---

## Test 5: Record Final Payment (Different Amount) ✓

### Setup:
You need a plan that's almost complete. You can either:
- Wait to pay most installments on your test plan, OR
- Create a plan with 2 installments for quick testing

### Create Test Plan:
1. ✅ Create new plan with:
   - Total: `105,000`
   - Down Payment: `5,000`
   - Installments: `2`
   - Result: Installments of `50,000` each

2. ✅ Record first payment of `50,000`

### Now Test Final Payment:
3. ✅ Click "Record Payment" again

### Verify Final Payment Modal:
- [ ] **Balance Due** shows `50,000` OR less
- [ ] If balance < installment amount:
  - [ ] **Yellow warning banner** appears
  - [ ] Banner says "⚠️ FINAL PAYMENT"
  - [ ] Banner explains: "This is the last payment. Amount set to remaining balance..."
  - [ ] Banner shows the exact balance amount

### Check Payment Amount:
- [ ] Payment amount is auto-filled with **remaining balance**
- [ ] Amount matches balance due (not the regular installment amount)

### Record Final Payment:
4. ✅ Complete the payment

### Expected Results:
- [ ] Payment recorded successfully
- [ ] Plan status changes to "Completed"
- [ ] Balance Due = `0`
- [ ] Installments Paid = Total Installments
- [ ] Completion date is set

---

## Test 6: Adjust Payment Amount (Flexibility Test) ✓

### Steps:
1. ✅ Open payment modal for any active plan
2. ✅ Note the pre-filled amount (e.g., `50,000`)

### Test Editing:
3. ✅ Change amount to `25,000` (partial payment)
4. ✅ Record payment

### Expected Results:
- [ ] Payment recorded with `25,000`
- [ ] Balance due decreased by `25,000`
- [ ] Installments paid did NOT increase (partial payment)
- [ ] Plan remains active

### Test Overpayment:
5. ✅ Open payment modal again
6. ✅ Change amount to full remaining balance
7. ✅ Record payment

### Expected Results:
- [ ] Payment recorded successfully
- [ ] Plan completed
- [ ] Balance due = `0`

---

## Test 7: Check Logging (For Debugging) ✓

### Steps:
1. ✅ Open browser console (F12)
2. ✅ Filter by "Installment" or look for 💰 emoji

### Open Payment Modal:
3. ✅ Click "Record Payment"

### Verify Console Logs:
- [ ] Log shows: "💰 [Installment Payment Modal] Setting payment amount:"
- [ ] Log includes:
  - `planId`
  - `planNumber`
  - `installmentAmount`
  - `balanceDue`
  - `calculatedPaymentAmount`
- [ ] Values match what's displayed in the modal

---

## Test 8: Error Handling ✓

### Test Missing Payment Account:
1. ✅ Open payment modal
2. ✅ Leave payment account empty
3. ✅ Try to submit

### Expected:
- [ ] Error toast: "Please select a payment account"
- [ ] Form doesn't submit

### Test Invalid Amount:
1. ✅ Set amount to `0` or negative
2. ✅ Try to submit

### Expected:
- [ ] HTML5 validation prevents submission (min="0")

### Test Amount > Balance:
1. ✅ Try to enter amount greater than balance due
2. ✅ Try to submit

### Expected:
- [ ] HTML5 validation prevents submission (max={plan.balance_due})

---

## Test 9: Multiple Payment Frequencies ✓

### Test Weekly Plan:
1. ✅ Create plan with "Weekly" frequency
2. ✅ Verify installment amount calculated correctly
3. ✅ Record payment - verify amount is correct

### Test Bi-Weekly Plan:
1. ✅ Create plan with "Bi-Weekly" frequency
2. ✅ Verify installment amount calculated correctly
3. ✅ Record payment - verify amount is correct

### Test Monthly Plan:
1. ✅ Create plan with "Monthly" frequency
2. ✅ Verify installment amount calculated correctly
3. ✅ Record payment - verify amount is correct

### Expected:
- [ ] All frequencies calculate installment amounts correctly
- [ ] Payment modal shows correct amounts for all frequencies

---

## Test 10: Edge Cases ✓

### Test Zero Down Payment:
1. ✅ Create plan with down payment = `0`
2. ✅ Verify amount financed = total amount
3. ✅ Verify no down payment message is shown
4. ✅ Verify installments calculated correctly

### Expected:
- [ ] Works correctly
- [ ] No errors
- [ ] Installment amount = total ÷ installments

### Test Maximum Balance:
1. ✅ Create plan with large amount (e.g., 10,000,000)
2. ✅ Verify calculations
3. ✅ Record payment

### Expected:
- [ ] Numbers formatted correctly
- [ ] No overflow errors
- [ ] Payment recorded correctly

### Test Single Installment:
1. ✅ Create plan with 1 installment
2. ✅ Record payment

### Expected:
- [ ] Amount = total - down payment
- [ ] Plan completes immediately after payment
- [ ] No errors

---

## ✅ Success Criteria

### All tests pass if:
1. ✅ Payment amounts are **always correct** (match calculated installment)
2. ✅ Final payments **auto-adjust** to remaining balance
3. ✅ Visual indicators are **clear and helpful**
4. ✅ Helper text **explains the amounts**
5. ✅ Down payments are **recorded automatically**
6. ✅ Logging is **comprehensive** for debugging
7. ✅ No errors or confusion

---

## 🐛 If Something Fails

### Debugging Steps:
1. Check browser console for errors
2. Look for 💰 emoji logs
3. Verify the plan data:
   - `plan.installment_amount` is set correctly
   - `plan.balance_due` is accurate
   - `plan.total_amount` matches expectations
4. Check payment accounts are configured
5. Verify user is authenticated

### Common Issues:
- **Amount shows 0:** Plan may not have `installment_amount` calculated
- **Amount shows wrong value:** Check plan details, recalculate manually
- **Modal doesn't open:** Check permissions, plan status
- **Payment fails:** Check payment account, database connection

---

## 📊 Test Results Template

```
Date: _______________
Tester: _______________

Test 1: Create Plan            [ Pass / Fail ]
Test 2: Verify Down Payment    [ Pass / Fail ]
Test 3: Record Payment         [ Pass / Fail ]
Test 4: Verify Recorded        [ Pass / Fail ]
Test 5: Final Payment          [ Pass / Fail ]
Test 6: Adjust Amount          [ Pass / Fail ]
Test 7: Check Logging          [ Pass / Fail ]
Test 8: Error Handling         [ Pass / Fail ]
Test 9: Frequencies            [ Pass / Fail ]
Test 10: Edge Cases            [ Pass / Fail ]

Overall Result: [ PASS / FAIL ]

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🎯 Quick Smoke Test (2 minutes)

If you just want to verify the fix quickly:

1. ✅ Create installment plan (500K total, 100K down, 8 installments)
2. ✅ Verify shows "50,000 per installment"
3. ✅ Go to Installments page
4. ✅ Click "Record Payment"
5. ✅ Verify amount is pre-filled with **50,000** (not 500,000)
6. ✅ Check helper text appears
7. ✅ Record payment
8. ✅ Verify payment recorded as 50,000

**If all ✅ → Fix is working!** 🎉

---

**Remember:** The key test is that the payment amount matches the calculated installment price, not the full total amount!

