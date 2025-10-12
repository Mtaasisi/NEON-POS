# Payment Mirroring Fix

## Issue Identified
The payment mirroring functionality was failing silently when processing POS sales with multiple payment methods. The error message showed:
```
⚠️ Payment mirroring skipped due to error: {data: null, error: {…}}
```

## Root Cause
The code in `saleProcessingService.ts` was attempting to insert records into the `customer_payments` table with columns that don't exist in the database schema:

### Fields Being Inserted (INCORRECT):
- `payment_account_id` ❌ - This column doesn't exist
- `currency` ❌ - This column doesn't exist

### Fields Missing:
- `sale_id` - Should be included to link payment to the sale

## Changes Made

### 1. Fixed Payment Insert Structure (Lines 576-598)
**Before:**
```typescript
const paymentInsert: any = {
  customer_id: saleData.customerId,
  device_id: null,
  amount: p.amount,
  method: p.method || (saleData as any)?.paymentMethod?.type || 'cash',
  payment_type: 'payment',
  status: 'completed',
  payment_date: p.timestamp || new Date().toISOString(),
  notes: p.notes || `POS sale ${saleNumber}`,
  reference: p.reference || null,
  payment_account_id: p.accountId || null,  // ❌ Column doesn't exist
  currency: (saleData as any)?.currency || 'TZS',  // ❌ Column doesn't exist
  created_at: new Date().toISOString()
};
```

**After:**
```typescript
const paymentInsert: any = {
  customer_id: saleData.customerId,
  device_id: null,
  sale_id: sale.id, // ✅ Link payment to the sale
  amount: p.amount,
  method: p.method || (saleData as any)?.paymentMethod?.type || 'cash',
  payment_type: 'payment',
  status: 'completed',
  payment_date: p.timestamp || new Date().toISOString(),
  notes: p.notes || `POS sale ${saleNumber} - ${p.method || 'payment'}`,
  reference_number: p.reference || saleNumber, // ✅ Use correct column name
  created_at: new Date().toISOString()
};
```

### 2. Enhanced Error Logging (Lines 636-644)
**Before:**
```typescript
} catch (mirrorErr) {
  console.warn('⚠️ Payment mirroring skipped due to error:', mirrorErr);
}
```

**After:**
```typescript
} catch (mirrorErr: any) {
  console.error('❌ Payment mirroring failed:', {
    error: mirrorErr,
    message: mirrorErr?.message,
    details: mirrorErr?.details,
    hint: mirrorErr?.hint,
    code: mirrorErr?.code
  });
}
```

### 3. Added Success Logging
Added detailed logging for:
- ✅ Payment mirroring success
- ✅ Finance account balance updates with before/after values
- ✅ Account transaction recording
- ⚠️ Better warnings when tables are not available

## Database Schema Reference

### customer_payments Table Structure:
```sql
CREATE TABLE IF NOT EXISTS customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  device_id UUID REFERENCES devices(id),
  sale_id UUID REFERENCES lats_sales(id),
  amount NUMERIC NOT NULL,
  method TEXT DEFAULT 'cash',
  payment_type TEXT DEFAULT 'payment',
  status TEXT DEFAULT 'completed',
  reference_number TEXT,
  transaction_id TEXT,
  notes TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Testing Instructions

### 1. Clear Browser Cache & Restart Dev Server
```bash
# Stop the dev server (Ctrl+C)
# Clear browser cache and local storage
# Restart the dev server
npm run dev
```

### 2. Test Single Payment Method
1. Add a product to cart
2. Select a customer
3. Complete payment with ONE payment method (e.g., Cash)
4. Check console logs for:
   - `✅ Payment mirrored: Cash - 1000`
   - `✅ Finance account [...] balance updated: X + 1000 = Y`
   - `✅ Transaction recorded for account [...]: +1000`

### 3. Test Multiple Payment Methods
1. Add a product to cart (total: 1250)
2. Select a customer
3. Complete payment with MULTIPLE methods:
   - Cash: 1000
   - CRDB Bank: 250
4. Check console logs for:
   - `✅ Payment mirrored: Cash - 1000`
   - `✅ Payment mirrored: CRDB Bank - 250`
   - Two finance account updates
   - Two transaction recordings

### 4. Verify Database Records
After completing a sale, verify in your database:

**Query 1: Check payment records**
```sql
SELECT 
  cp.id,
  cp.sale_id,
  cp.customer_id,
  cp.amount,
  cp.method,
  cp.reference_number,
  cp.notes,
  cp.payment_date
FROM customer_payments cp
ORDER BY cp.created_at DESC
LIMIT 10;
```

**Query 2: Check finance account balances**
```sql
SELECT 
  id,
  name,
  balance,
  currency,
  updated_at
FROM finance_accounts
WHERE id IN (
  'YOUR_CASH_ACCOUNT_ID',
  'YOUR_BANK_ACCOUNT_ID'
);
```

**Query 3: Check account transactions**
```sql
SELECT 
  at.id,
  at.account_id,
  at.transaction_type,
  at.amount,
  at.reference_number,
  at.description,
  at.metadata,
  at.created_at
FROM account_transactions at
ORDER BY at.created_at DESC
LIMIT 10;
```

## Expected Behavior After Fix

### Console Output (Successful Sale):
```
🔍 Sale insert data: {...}
✅ Inserting sale items: [...]
✅ Payment mirrored: Cash - 1000
✅ Finance account 5e32c912-7ab7-444a-8ffd-02cb99b56a04 balance updated: 10000 + 1000 = 11000
✅ Transaction recorded for account 5e32c912-7ab7-444a-8ffd-02cb99b56a04: +1000
✅ Payment mirrored: CRDB Bank - 250
✅ Finance account 71a4d960-0db5-4b9c-a880-5f0cebe9830b balance updated: 50000 + 250 = 50250
✅ Transaction recorded for account 71a4d960-0db5-4b9c-a880-5f0cebe9830b: +250
✅ Sale saved to database: 5d785381-c7b8-4842-a763-ad66abe34cf2
```

## Benefits

1. **Accurate Financial Tracking**: Payments are now correctly recorded in `customer_payments` table
2. **Account Balance Sync**: Finance account balances are updated correctly
3. **Transaction History**: All payment transactions are logged in `account_transactions`
4. **Better Debugging**: Enhanced error logging helps identify issues quickly
5. **Data Integrity**: Proper linking between sales, payments, and accounts

## Related Tables

The payment mirroring system updates three tables:
1. **customer_payments** - Individual payment records with customer and sale linkage
2. **finance_accounts** - Account balances are incremented
3. **account_transactions** - Transaction history for audit trail

## Notes

- The fix removes non-existent columns that were causing the insert to fail
- Added proper sale linkage via `sale_id` foreign key
- Enhanced logging provides visibility into the payment flow
- All changes are backward compatible with existing code

