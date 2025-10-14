# 🧪 Manual Test Guide - Purchase Order Payment System

## 📋 Pre-Test Checklist

- [ ] Server is running on http://localhost:3000
- [ ] Database connection is active
- [ ] You have the test credentials: care@care.com / 123456

---

## 🎯 Test Scenario 1: Insufficient Balance Protection

### Objective:
Verify that the system prevents payments when account balance is too low.

### Steps:
1. **Login**
   - Go to: http://localhost:3000
   - Email: `care@care.com`
   - Password: `123456`
   - Click "Login"

2. **Navigate to Purchase Orders**
   - Look for "Purchase Orders" in the sidebar/menu
   - Click to open

3. **Check Account Balances**
   - Open Developer Console (F12)
   - Run this query to see balances:
   ```javascript
   // This will show in the console during payment attempts
   console.log('Account balances will be shown when you try to pay')
   ```

4. **Select a Purchase Order**
   - Find an unpaid or partially paid PO
   - Click "Make Payment" or "Add Payment"

5. **Try Payment with Insufficient Balance**
   - Select an account with low/zero balance
   - Enter amount larger than available balance
   - Click "Pay" or "Submit"

### Expected Results:
✅ **Error message appears:**
```
❌ Insufficient balance in [Account Name]!
Available: TZS 1,000
Required: TZS 5,000
Shortfall: TZS 4,000
Please add funds to the account or use a different payment method.
```

❌ **Payment is NOT created**
❌ **Balance is NOT deducted**

---

## 🎯 Test Scenario 2: Successful Payment with Expense Tracking

### Objective:
Verify that valid payments are processed AND tracked as expenses.

### Steps:
1. **Select Purchase Order**
   - Same as above

2. **Check Account Balance BEFORE Payment**
   - Note the current balance of the account you'll use
   - Example: Cash account has TZS 100,000

3. **Make Valid Payment**
   - Select account with sufficient balance (e.g., Cash)
   - Enter payment amount (e.g., TZS 10,000)
   - Add optional reference/notes
   - Click "Pay" or "Submit"

4. **Verify Success**
   - Success message appears
   - Payment appears in PO payment history

5. **Check Account Balance AFTER Payment**
   - Navigate to Finance/Accounts
   - Find the account you paid from
   - Verify balance is reduced
   - Example: Should now be TZS 90,000 (100,000 - 10,000)

6. **Check Expense Was Created**
   - Navigate to Finance/Expenses or Spending Reports
   - Look for recent expense
   - Should see: "Purchase Order Payment: PO-XXXXX"

### Expected Results:
✅ **Payment created successfully**
✅ **Account balance deducted** (100,000 → 90,000)
✅ **Expense record created automatically**
✅ **Expense details match:**
   - Title: "Purchase Order Payment: PO-XXXXX"
   - Category: "Purchase Orders"
   - Amount: Matches payment amount
   - Vendor: Supplier name from PO

---

## 🎯 Test Scenario 3: Database Verification

### Objective:
Confirm that database records are correct.

### Steps:
1. **Open Database Console**
   - Go to: https://console.neon.tech
   - Select your project
   - Open SQL Editor

2. **Check Payment Record**
   ```sql
   SELECT 
     pop.id,
     pop.amount,
     pop.status,
     po.po_number,
     fa.name as account_name,
     fa.balance as current_balance
   FROM purchase_order_payments pop
   JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
   JOIN finance_accounts fa ON fa.id = pop.payment_account_id
   WHERE pop.status = 'completed'
   ORDER BY pop.created_at DESC
   LIMIT 1;
   ```

3. **Check Expense Record**
   ```sql
   SELECT 
     fe.title,
     fe.amount,
     fe.vendor,
     fe.expense_date,
     fec.category_name
   FROM finance_expenses fe
   JOIN finance_expense_categories fec ON fec.id = fe.expense_category_id
   WHERE fec.category_name = 'Purchase Orders'
   ORDER BY fe.created_at DESC
   LIMIT 1;
   ```

4. **Verify Trigger is Active**
   ```sql
   SELECT 
     tgname as trigger_name,
     tgenabled as is_enabled,
     tgtype
   FROM pg_trigger
   WHERE tgname = 'trigger_track_po_payment_spending';
   ```

### Expected Results:
✅ **Payment record exists** with status = 'completed'
✅ **Expense record exists** with matching amount
✅ **Trigger is enabled** (is_enabled = 'O' or true)
✅ **Account balance is correct**

---

## 🎯 Test Scenario 4: Console Logging

### Objective:
Verify that detailed logging helps with debugging.

### Steps:
1. **Open Browser Developer Console**
   - Press F12
   - Go to "Console" tab

2. **Make a Payment**
   - Follow steps from Scenario 2

3. **Watch Console Logs**
   - Should see detailed logs during payment

### Expected Logs:
```
💰 PurchaseOrderPaymentService: Creating purchase order payment...
💰 Balance check: Available=100000, Required=10000
✅ Sufficient balance confirmed: 100000 >= 10000
💳 Deducting payment: 100000 - 10000 = 90000
✅ Account balance updated successfully: 90000
📊 Expense will be automatically tracked via database trigger
   - Category: Purchase Orders
   - Amount: 10000
   - Account: Cash
✅ Purchase order payment created successfully
```

---

## 📊 Success Criteria

### All Tests Must Show:
- ✅ Balance validation works
- ✅ Clear error messages for insufficient funds
- ✅ Successful payments are processed
- ✅ Account balances are deducted
- ✅ Expenses are automatically created
- ✅ Database records are consistent
- ✅ Console logging is helpful

---

## 🐛 If Something Doesn't Work

### Problem: Balance check doesn't work
**Solution:**
- Check browser console for errors
- Verify `purchaseOrderPaymentService.ts` was updated
- Restart the dev server

### Problem: Expense not created
**Solution:**
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_track_po_payment_spending';
   ```
2. If not exists, run:
   ```bash
   node apply-po-expense-tracking-final.mjs
   ```

### Problem: Error messages not showing
**Solution:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check network tab for API errors

---

## 📝 Test Results Template

### Date: _______________
### Tester: _______________

| Test Scenario | Pass/Fail | Notes |
|--------------|-----------|-------|
| Scenario 1: Insufficient Balance | ☐ Pass ☐ Fail | |
| Scenario 2: Successful Payment | ☐ Pass ☐ Fail | |
| Scenario 3: Database Verification | ☐ Pass ☐ Fail | |
| Scenario 4: Console Logging | ☐ Pass ☐ Fail | |

**Overall Result:** ☐ All tests passed ☐ Some tests failed

**Issues Found:**
- 
- 

**Screenshots Attached:**
- [ ] Error message screenshot
- [ ] Success message screenshot
- [ ] Expense list screenshot
- [ ] Database query results

---

## 🎉 After Successful Testing

1. Mark all checkboxes as complete
2. Take screenshots of key features working
3. Update any documentation
4. Consider this feature PRODUCTION READY! 🚀

