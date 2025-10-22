# Payment Recording Test Guide

## Test Login Credentials
- **Email**: care@care.com
- **Password**: 123456

## What Gets Recorded When Making a Payment

### For POS Sales:
1. **lats_sales** table - Main sale record
2. **lats_sale_items** table - Items in the sale
3. **finance_accounts** table - Account balance updated
4. **account_transactions** table - Transaction record
5. **payment_transactions** table - Payment details (via triggers)
6. **customers** table - Customer stats updated

### For Purchase Order Payments:
1. **purchase_order_payments** table - Payment record
2. **lats_purchase_orders** table - Payment status & total_paid updated
3. **finance_accounts** table - Account balance deducted

### For Repair Payments:
1. **customer_payments** table - Payment record
2. **finance_accounts** table - Account balance updated

## Manual Test Steps

### Test 1: POS Sale Payment
1. Login with care@care.com / 123456
2. Navigate to POS page
3. Select a customer (required)
4. Add product(s) to cart
5. Click "Pay Now"
6. Select payment method and account
7. Complete payment
8. ✅ Check database records (see verification below)

### Test 2: Purchase Order Payment
1. Navigate to LATS → Purchase Orders
2. Find an unpaid or partially paid order
3. Click "Make Payment"
4. Enter payment details
5. Submit payment
6. ✅ Check database records

### Test 3: Repair Payment
1. Navigate to Devices/Repairs
2. Find a repair job
3. Make a payment
4. ✅ Check database records

## Database Verification Queries

Run these in your database to verify payments are being recorded:

### Check Recent POS Sales
```sql
SELECT 
  id,
  sale_number,
  customer_name,
  total_amount,
  payment_status,
  payment_method,
  created_at
FROM lats_sales
ORDER BY created_at DESC
LIMIT 5;
```

### Check Sale Items
```sql
SELECT 
  si.product_name,
  si.variant_name,
  si.quantity,
  si.unit_price,
  si.total_price,
  s.sale_number
FROM lats_sale_items si
JOIN lats_sales s ON s.id = si.sale_id
ORDER BY si.created_at DESC
LIMIT 10;
```

### Check Finance Account Transactions
```sql
SELECT 
  at.transaction_type,
  at.amount,
  at.reference_number,
  at.description,
  at.created_at,
  fa.account_name
FROM account_transactions at
JOIN finance_accounts fa ON fa.id = at.account_id
ORDER BY at.created_at DESC
LIMIT 10;
```

### Check Finance Account Balances
```sql
SELECT 
  account_name,
  balance,
  currency,
  updated_at
FROM finance_accounts
ORDER BY updated_at DESC;
```

### Check Purchase Order Payments
```sql
SELECT 
  pop.amount,
  pop.currency,
  pop.payment_method,
  pop.status,
  pop.payment_date,
  po.po_number
FROM purchase_order_payments pop
JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
ORDER BY pop.created_at DESC
LIMIT 10;
```

### Check Customer Payments (Repairs)
```sql
SELECT 
  cp.amount,
  cp.method,
  cp.payment_type,
  cp.status,
  c.name as customer_name,
  cp.created_at
FROM customer_payments cp
LEFT JOIN customers c ON c.id = cp.customer_id
ORDER BY cp.created_at DESC
LIMIT 10;
```

## Common Issues to Check

### Issue 1: Payment Not Recording
- **Check**: Browser console for errors
- **Check**: Network tab for failed API calls
- **Check**: Database for any constraint violations

### Issue 2: Balance Not Updating
- **Check**: `finance_accounts` table for updated_at timestamp
- **Check**: Console logs for balance update errors
- **Check**: Account permissions

### Issue 3: Transaction Not Created
- **Check**: `account_transactions` table
- **Check**: Database triggers are enabled
- **Check**: Console warnings about transaction creation

## Test Checklist

- [ ] Login successful with test credentials
- [ ] POS sale creates record in `lats_sales`
- [ ] Sale items recorded in `lats_sale_items`
- [ ] Finance account balance increases
- [ ] Transaction record created in `account_transactions`
- [ ] Customer stats updated (total_spent, total_orders)
- [ ] Inventory quantities decreased
- [ ] Purchase order payment creates record
- [ ] Purchase order status updates (unpaid → partial → paid)
- [ ] Repair payment creates customer_payment record

## Expected Console Messages

Look for these in browser console:

### Successful Payment:
```
✅ User authenticated: care@care.com
🔄 Processing sale...
✅ Sale saved to database: [sale-id]
💳 Updating finance account: [account-id]
✅ Finance account balance updated: [old] + [amount] = [new]
📝 Recording account transaction for account: [account-id]
✅ Transaction recorded for account [account-id]: +[amount]
✅ Sale processed successfully
```

### Errors to Watch For:
```
❌ Error creating sale: [message]
❌ Error updating inventory: [message]
❌ Error creating purchase order payment: [message]
⚠️ account_transactions insert failed: [message]
```

