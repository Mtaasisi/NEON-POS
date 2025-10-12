# Payment Mirroring Test Guide

## Quick Start

After the fix is deployed, follow these steps to verify everything works correctly.

## 🔧 Pre-Test Setup

### 1. Restart Development Environment
```bash
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
```

### 2. Clear Browser Cache
- Open DevTools (F12)
- Go to Application tab
- Clear Site Data
- Refresh the page

### 3. Open Browser Console
- Press F12
- Go to Console tab
- Keep it open during testing

## 📋 Test Scenarios

### Scenario 1: Single Payment Method ✅

**Steps:**
1. Navigate to POS page
2. Select a customer (e.g., Samuel masika)
3. Add a product to cart (e.g., Samsung Galaxy S24 - 1250 TZS)
4. Click "Complete Payment"
5. Choose ONE payment method:
   - Method: **Cash**
   - Amount: **1250**
6. Click "Process Payment"

**Expected Console Output:**
```
✅ Payment mirrored: Cash - 1250
✅ Finance account [...] balance updated: 10000 + 1250 = 11250
✅ Transaction recorded for account [...]: +1250
✅ Sale saved to database: [sale-id]
```

**Verify in Database:**
```sql
-- Should return 1 payment record
SELECT * FROM customer_payments 
WHERE sale_id = '[sale-id]' 
ORDER BY created_at DESC;
```

---

### Scenario 2: Multiple Payment Methods (Split Payment) ✅

**Steps:**
1. Navigate to POS page
2. Select a customer
3. Add a product to cart (total: 1250 TZS)
4. Click "Complete Payment"
5. Add FIRST payment:
   - Method: **Cash**
   - Amount: **1000**
   - Click "Add Payment"
6. Add SECOND payment:
   - Method: **CRDB Bank**
   - Amount: **250**
7. Verify total shows: **1250** (should match cart total)
8. Click "Process Payment"

**Expected Console Output:**
```
✅ Payment mirrored: Cash - 1000
✅ Finance account [cash-account-id] balance updated: X + 1000 = Y
✅ Transaction recorded for account [cash-account-id]: +1000
✅ Payment mirrored: CRDB Bank - 250
✅ Finance account [bank-account-id] balance updated: X + 250 = Y
✅ Transaction recorded for account [bank-account-id]: +250
✅ Sale saved to database: [sale-id]
```

**Verify in Database:**
```sql
-- Should return 2 payment records
SELECT 
  cp.id,
  cp.method,
  cp.amount,
  cp.reference_number,
  cp.notes
FROM customer_payments cp
WHERE sale_id = '[sale-id]'
ORDER BY created_at;

-- Expected result:
-- Row 1: Cash, 1000
-- Row 2: CRDB Bank, 250
```

---

### Scenario 3: Verify Finance Account Balance Updates ✅

**Before Test:**
```sql
-- Note current balances
SELECT id, name, balance FROM finance_accounts;
```

**After completing a sale with these payments:**
- Cash: 500
- M-Pesa: 300

**Verify:**
```sql
-- Check new balances
SELECT 
  fa.id,
  fa.name,
  fa.balance,
  at.amount,
  at.description,
  at.created_at
FROM finance_accounts fa
LEFT JOIN account_transactions at ON fa.id = at.account_id
WHERE at.transaction_type = 'payment_received'
ORDER BY at.created_at DESC
LIMIT 10;
```

**Expected:**
- Cash account balance increased by 500
- M-Pesa account balance increased by 300

---

### Scenario 4: Verify Payment-Sale Linkage ✅

**Complete a sale and note the sale_number (e.g., SALE-77358826-03CI)**

**Query:**
```sql
SELECT 
  ls.sale_number,
  ls.total_amount,
  ls.payment_status,
  cp.method,
  cp.amount,
  cp.reference_number,
  cp.payment_date
FROM lats_sales ls
INNER JOIN customer_payments cp ON ls.id = cp.sale_id
WHERE ls.sale_number = 'SALE-77358826-03CI'
ORDER BY cp.created_at;
```

**Expected:**
- All payments should be linked to the sale
- Sum of payment amounts should equal sale total_amount

---

## 🔍 Troubleshooting

### Issue: Still seeing "Payment mirroring skipped" error

**Check:**
1. Browser cache cleared?
2. Dev server restarted?
3. Using latest code?

**Debug:**
```javascript
// Open browser console and check:
console.log('Checking sale data structure...');
// The error should now show detailed information instead of {data: null, error: {…}}
```

---

### Issue: Payment records not appearing in database

**Check:**
```sql
-- 1. Does customer_payments table exist?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'customer_payments'
);

-- 2. Check table structure
\d customer_payments;

-- 3. Check recent errors in logs
SELECT * FROM customer_payments 
ORDER BY created_at DESC 
LIMIT 5;
```

**If table is missing:**
Run the schema creation script from `complete-database-schema.sql`

---

### Issue: Finance account balances not updating

**Check:**
```sql
-- 1. Does finance_accounts table exist?
SELECT * FROM finance_accounts;

-- 2. Check if accounts exist and are active
SELECT id, name, is_active, balance 
FROM finance_accounts 
WHERE id IN (
  'YOUR_CASH_ACCOUNT_ID',
  'YOUR_BANK_ACCOUNT_ID'
);
```

**Console should show:**
```
✅ Finance account [...] balance updated: X + Y = Z
```

If you see:
```
⚠️ finance_accounts table not available
```
The table needs to be created.

---

## 📊 Validation Queries

### Query 1: Today's Payment Summary
```sql
SELECT 
  method,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount
FROM customer_payments
WHERE DATE(payment_date) = CURRENT_DATE
GROUP BY method
ORDER BY total_amount DESC;
```

### Query 2: Payment Reconciliation
```sql
WITH sale_totals AS (
  SELECT 
    ls.id,
    ls.sale_number,
    ls.total_amount,
    ls.created_at
  FROM lats_sales ls
  WHERE ls.created_at >= NOW() - INTERVAL '1 day'
),
payment_totals AS (
  SELECT 
    cp.sale_id,
    SUM(cp.amount) as payments_sum,
    COUNT(*) as payment_count
  FROM customer_payments cp
  WHERE cp.created_at >= NOW() - INTERVAL '1 day'
  GROUP BY cp.sale_id
)
SELECT 
  st.sale_number,
  st.total_amount as sale_total,
  COALESCE(pt.payments_sum, 0) as payments_total,
  COALESCE(pt.payment_count, 0) as payment_count,
  st.total_amount - COALESCE(pt.payments_sum, 0) as difference,
  CASE 
    WHEN st.total_amount = COALESCE(pt.payments_sum, 0) THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as status
FROM sale_totals st
LEFT JOIN payment_totals pt ON st.id = pt.sale_id
ORDER BY st.created_at DESC;
```

### Query 3: Account Transaction History
```sql
SELECT 
  at.account_id,
  fa.name as account_name,
  at.transaction_type,
  at.amount,
  at.reference_number,
  at.description,
  at.created_at
FROM account_transactions at
LEFT JOIN finance_accounts fa ON at.account_id = fa.id
WHERE at.transaction_type = 'payment_received'
  AND at.created_at >= NOW() - INTERVAL '1 day'
ORDER BY at.created_at DESC
LIMIT 20;
```

---

## ✅ Success Criteria

After testing all scenarios, you should have:

- [x] No "Payment mirroring skipped" errors in console
- [x] Console shows "✅ Payment mirrored" for each payment method
- [x] Console shows "✅ Finance account balance updated"
- [x] Console shows "✅ Transaction recorded"
- [x] customer_payments table has records for each payment
- [x] finance_accounts balances are correctly updated
- [x] account_transactions has transaction records
- [x] All payments are linked to their sales via sale_id
- [x] Payment reconciliation query shows no mismatches

---

## 📞 Support

If you encounter any issues:

1. Check console for detailed error messages
2. Verify database schema using `VERIFY-PAYMENT-MIRRORING-SCHEMA.sql`
3. Review the changes in `FIX-PAYMENT-MIRRORING.md`
4. Check that all payment accounts exist and are active

---

## 🎯 Quick Visual Test

**Before Fix:**
```
⚠️ Payment mirroring skipped due to error: {data: null, error: {…}}
```

**After Fix:**
```
✅ Payment mirrored: Cash - 1000
✅ Finance account 5e32c912-... balance updated: 10000 + 1000 = 11000
✅ Transaction recorded for account 5e32c912-...: +1000
✅ Payment mirrored: CRDB Bank - 250
✅ Finance account 71a4d960-... balance updated: 50000 + 250 = 50250
✅ Transaction recorded for account 71a4d960-...: +250
✅ Sale saved to database: 5d785381-c7b8-4842-a763-ad66abe34cf2
```

If you see the "After Fix" output, the fix is working correctly! 🎉

