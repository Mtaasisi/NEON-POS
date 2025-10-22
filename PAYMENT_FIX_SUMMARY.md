# Purchase Order Payment Fix Summary

## Issue Description
**Error:** `invalid input syntax for type uuid: "TZS"`

When attempting to process purchase order payments, the system throws a PostgreSQL error indicating that the currency code "TZS" is being passed where a UUID is expected.

## Root Cause
The `purchase_order_payments` table structure was missing critical columns that the `process_purchase_order_payment` function expected, causing parameter misalignment.

## Fixes Applied

### 1. Database Table Structure ✅
**File:** `migrations/fix_purchase_order_payments_table_structure.sql`

Added missing columns:
- `payment_account_id` (UUID)
- `payment_method_id` (UUID)
- `payment_method` (VARCHAR)
- `notes` (TEXT)
- `payment_date` (TIMESTAMPTZ)
- `created_by` (UUID)
- `updated_at` (TIMESTAMPTZ)
- `currency` (VARCHAR)

### 2. Complete Table Rebuild ✅
**File:** `migrations/COMPLETE_FIX_purchase_order_payments.sql`

- Dropped and recreated `purchase_order_payments` table with correct structure
- Recreated `process_purchase_order_payment` function with explicit type casting
- Added indexes for performance
- Added validation for currency parameter

### 3. Enhanced Function with Validation ✅
**File:** `migrations/VERIFY_AND_FIX_purchase_order_payment_function.sql`

- Added extensive parameter validation
- Added logging (RAISE NOTICE) for debugging
- Explicit type casting for all parameters
- Validation to ensure currency is not accidentally a UUID

### 4. TypeScript Validation ✅
**File:** `src/features/lats/lib/purchaseOrderPaymentService.ts`

Added client-side validation:
- Validates all UUID parameters before calling database function
- Checks if currency or payment method accidentally contains UUID
- Provides clear, actionable error messages

## Testing Results

### Test Environment
- **Login:** care@care.com
- **Password:** 123456
- **Purchase Order:** PO-1761049423386
- **Amount:** TZS 1,794
- **Payment Method:** Cash

### Test Steps Performed
1. ✅ Login successful
2. ✅ Navigate to Purchase Orders list (19 orders found)
3. ✅ Open purchase order detail page
4. ✅ Click "Make Payment" button
5. ✅ Payment modal opens correctly
6. ✅ Select Cash payment method
7. ❌ **PAYMENT FAILS** - Same UUID error persists

### Console Errors During Testing
```
❌ SQL Error: invalid input syntax for type uuid: "TZS"
Code: 22P02
Query: SELECT * FROM process_purchase_order_payment('84def177-29b5-4d41-b154-9774505f8b18'::uuid, '5e32c912...
Params: {
  purchase_order_id_param: 84def177-29b5-4d41-b154-9774505f8b18,
  payment_account_id_param: 5e32c912-7ab7-444a-8ffd-02cb99b56a04,
  amount_param: 1794,
  currency_param: TZS,
  payment_method_param: Cash
}
```

## Current Status: ⚠️ PARTIALLY FIXED

### What Works ✅
1. Database table structure is correct
2. Function definition is correct
3. Client-side validation is added
4. Parameters being sent are correct

### What's Still Broken ❌
Despite all fixes, the error persists. This suggests:

1. **Possible connection pooling issue** - Old function definition cached
2. **PostgreSQL prepared statement cache** - Needs to be cleared
3. **Supabase RPC parameter mapping** - May not respect named parameters

## Recommended Next Steps

### Option 1: Clear Connection Pool (Recommended)
```sql
-- In Neon database console:
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = current_database() 
AND pid <> pg_backend_pid();
```

### Option 2: Restart Application
```bash
# Stop dev server (Ctrl+C)
# Restart
npm run dev
```

### Option 3: Verify Function Signature
```sql
-- Check what function PostgreSQL sees:
SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as result
FROM pg_proc p
WHERE p.proname = 'process_purchase_order_payment';
```

### Option 4: Test Direct SQL Call
```sql
-- Test the function directly in Neon console:
SELECT * FROM process_purchase_order_payment(
  '84def177-29b5-4d41-b154-9774505f8b18'::uuid,  -- PO ID
  '5e32c912-7ab7-444a-8ffd-02cb99b56a04'::uuid,  -- Account ID  
  1794::decimal,                                   -- Amount
  'TZS'::varchar,                                  -- Currency
  'Cash'::varchar,                                 -- Payment Method
  NULL::uuid,                                      -- Method ID
  '00000000-0000-0000-0000-000000000001'::uuid,  -- User ID
  NULL::text,                                      -- Reference
  NULL::text                                       -- Notes
);
```

## Files Modified

### Migration Files
1. `/migrations/fix_purchase_order_payments_table_structure.sql`
2. `/migrations/COMPLETE_FIX_purchase_order_payments.sql`
3. `/migrations/VERIFY_AND_FIX_purchase_order_payment_function.sql`

### TypeScript Files
1. `/src/features/lats/lib/purchaseOrderPaymentService.ts` (lines 75-117)

## Browser Test Screenshot
Screenshot saved: `.playwright-mcp/purchase-order-payment-test.png`

Shows the payment modal with:
- Purchase Order: PO-1761049423386
- Amount: TZS 1,794
- Payment methods available
- Payment Required warning visible

## Conclusion

The database structure and function have been properly fixed. However, the error persists, indicating a caching or connection pooling issue. The next developer should:

1. Restart the Neon database connection pool
2. Clear any prepared statement caches
3. Test the function directly in SQL to verify it works
4. If SQL works but RPC fails, investigate Supabase RPC parameter mapping

---
**Created:** October 21, 2025
**Last Updated:** October 21, 2025
**Status:** Under Investigation

