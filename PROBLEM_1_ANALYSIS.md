# 🔍 Problem #1 Analysis: UUID Parameter Mismatch

## Error Observed
```
❌ SQL Error: "invalid input syntax for type uuid: \"TZS\""
Code: "22P02"
Query: "SELECT * FROM process_purchase_order_payment('3437e897-8877-48bd-a541-eab17594ca5e'::uuid, '5e32c912"
```

---

## 🎯 Diagnostic Results

### Database Function Status: ✅ CORRECT

**Function Signature (Current in Database):**
```sql
process_purchase_order_payment(
  purchase_order_id_param uuid,           -- Position 1 ✅
  payment_account_id_param uuid,          -- Position 2 ✅
  amount_param numeric,                   -- Position 3 ✅
  currency_param varchar DEFAULT 'TZS',   -- Position 4 ✅ (This should be "TZS")
  payment_method_param varchar DEFAULT 'Cash',
  payment_method_id_param uuid DEFAULT NULL,
  user_id_param uuid DEFAULT '00000000-0000-0000-0000-000000000001',
  reference_param text DEFAULT NULL,
  notes_param text DEFAULT NULL
)
```

### TypeScript Code: ✅ CORRECT

**Your code (lines 136-147 in purchaseOrderPaymentService.ts):**
```typescript
await supabase.rpc('process_purchase_order_payment', {
  purchase_order_id_param: data.purchaseOrderId,      // UUID ✅
  payment_account_id_param: data.paymentAccountId,    // UUID ✅
  amount_param: data.amount,                          // Numeric ✅
  currency_param: currency,                           // "TZS" ✅
  payment_method_param: paymentMethod,                // "Cash" ✅
  payment_method_id_param: data.paymentMethodId,      // UUID ✅
  user_id_param: userId,                              // UUID ✅
  reference_param: data.reference || null,
  notes_param: data.notes || null
});
```

---

## 🚨 Root Cause

**The function definition is CORRECT in the database, but:**

### Problem: **CACHING ISSUE** 

The error occurs because somewhere in the chain, an **old function signature is cached**:

1. **Supabase Postgrest Cache**: Supabase's PostgREST API layer caches database schemas
2. **Browser/Client Cache**: Your browser or Supabase JS client has cached the old schema
3. **Neon Connection Pooler**: The connection pooler might have cached metadata

### Why "TZS" ends up as a UUID parameter:

When Supabase's cached schema doesn't match the actual database, it might fall back to **positional parameters** instead of named parameters. This causes:

```
Position 1: '3437e897...' (PO ID)     → Correct ✅
Position 2: '5e32c912...' (Account ID) → Correct ✅
Position 3: 788 (Amount)               → Correct ✅
Position 4: 'TZS' (Currency)           → GOES TO WRONG PARAMETER ❌
```

In the cached (wrong) version, position 4 might be expecting a UUID parameter, hence the error.

---

## 💡 Solution Options

### Option A: Clear All Caches (Quick Fix)

1. **Clear Supabase Cache** (Database side):
   ```sql
   -- Force Supabase to reload schema
   NOTIFY pgrst, 'reload schema';
   ```

2. **Clear Browser Cache**:
   - Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
   - Or clear browser cache completely

3. **Restart Dev Server** (if running locally)

### Option B: Force Function Refresh (Recommended)

Drop and recreate the function with a slightly different approach to bust the cache:

```sql
-- 1. Drop function
DROP FUNCTION IF EXISTS process_purchase_order_payment CASCADE;

-- 2. Recreate with explicit STRICT for better type checking
CREATE OR REPLACE FUNCTION process_purchase_order_payment(...)
RETURNS JSON
LANGUAGE plpgsql
STRICT  -- ← This forces NULL checks and better type matching
SECURITY DEFINER
AS $$
...
$$;
```

### Option C: Test with Direct SQL (Verification)

Run this query directly in your database to verify the function works:

```sql
SELECT process_purchase_order_payment(
  '3437e897-8877-48bd-a541-eab17594ca5e'::uuid,  -- PO ID
  '5e32c912-7ab7-444a-8ffd-02cb99b56a04'::uuid,  -- Account ID
  788::numeric,                                   -- Amount
  'TZS'::varchar,                                 -- Currency
  'Cash'::varchar,                                -- Payment method
  NULL::uuid,                                     -- Payment method ID
  '00000000-0000-0000-0000-000000000001'::uuid,  -- User ID
  NULL::text,                                     -- Reference
  NULL::text                                      -- Notes
);
```

If this works in the database directly but fails from TypeScript, it's definitely a caching issue.

---

## 📋 Recommended Action Plan

1. **First**: Try the Supabase cache clear
2. **Second**: Hard refresh your browser
3. **Third**: If still failing, apply the migration you have open (after fixing Problem #2)
4. **Fourth**: Verify with direct SQL test

---

## 🔗 Related Issues

- **Problem #2**: Missing `related_entity_type` and `related_entity_id` columns (see PROBLEM_2_ANALYSIS.md)
- Both problems need to be fixed for the payment system to work correctly

---

**Status**: Waiting for cache clear or function recreation
**Next Step**: Fix Problem #2 (missing columns) then apply complete fix

