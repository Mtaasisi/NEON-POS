# 🔧 Trade-In Contracts Foreign Key Fix

**Date:** October 22, 2025  
**Issue:** Foreign key constraint violation when creating trade-in contracts  
**Status:** ⚠️ REQUIRES DATABASE UPDATE

---

## 🐛 Problem

When creating a trade-in contract, the following error occurs:

```
Failed to load resource: the server responded with a status of 400 ()
❌ SQL Error: insert or update on table "lats_trade_in_contracts" violates foreign key constraint "lats_trade_in_contracts_customer_id_fkey"
Code: 23503
```

### Root Cause

The `lats_trade_in_contracts` table has a foreign key constraint on `customer_id` that references the **`lats_customers`** table, but your application uses the **`customers`** table.

```sql
-- Current (WRONG):
customer_id UUID REFERENCES lats_customers(id)

-- Should be (CORRECT):
customer_id UUID REFERENCES customers(id)
```

This mismatch causes the insert to fail because the `customer_id` from the `customers` table doesn't exist in the `lats_customers` table.

---

## 🔍 How This Happened

1. The original trade-in system migration (`create_trade_in_system.sql`) referenced `lats_customers`
2. Your app was already using the `customers` table for customer management
3. A previous fix was applied to `lats_trade_in_transactions` to reference `customers` (see `fix_trade_in_customer_fk.sql`)
4. However, the `lats_trade_in_contracts` table was not updated at that time

---

## ✅ Solution

Update the foreign key constraint on `lats_trade_in_contracts` to reference the correct `customers` table.

### Option 1: Run SQL Directly in Supabase Dashboard (RECOMMENDED)

1. **Open your Supabase Dashboard**
2. **Navigate to: SQL Editor**
3. **Copy and paste this SQL:**

```sql
-- Fix trade-in contracts to reference the correct customers table
-- The lats_trade_in_contracts table referenced lats_customers but the app uses customers table

-- Drop the old foreign key constraint
ALTER TABLE lats_trade_in_contracts 
DROP CONSTRAINT IF EXISTS lats_trade_in_contracts_customer_id_fkey;

-- Add the correct foreign key constraint referencing customers table
ALTER TABLE lats_trade_in_contracts 
ADD CONSTRAINT lats_trade_in_contracts_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Verify the fix
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'lats_trade_in_contracts'
    AND kcu.column_name = 'customer_id';
```

4. **Click "Run"**
5. **Verify the output shows:**
   ```
   table_name: lats_trade_in_contracts
   column_name: customer_id
   foreign_table_name: customers  ← Should be "customers" not "lats_customers"
   foreign_column_name: id
   ```

### Option 2: Run via Browser (Alternative)

1. Open `fix-trade-in-contracts-fk.html` in your browser
2. Click the "🚀 Run Fix Now" button
3. Monitor the execution log

### Option 3: Run via Node Script

```bash
node fix-contracts-customer-fk.mjs
```

> **Note:** This requires your Supabase credentials in environment variables

---

## 🧪 Testing the Fix

After running the fix:

1. **Go to your Trade-In POS page**
2. **Create a new trade-in transaction**
3. **Try to create/sign a contract**
4. **The contract should now save successfully** ✅

---

## 📊 What Changed

### Before:
```sql
lats_trade_in_contracts.customer_id → lats_customers.id ❌
```

### After:
```sql
lats_trade_in_contracts.customer_id → customers.id ✅
```

---

## 🔗 Related Files

- **SQL Fix:** `fix-trade-in-contracts-customer-fk.sql`
- **Node Script:** `fix-contracts-customer-fk.mjs`
- **Browser Tool:** `fix-trade-in-contracts-fk.html`
- **Previous Similar Fix:** `migrations/fix_trade_in_customer_fk.sql` (for transactions table)

---

## 🎯 Impact

**Before Fix:**
- ❌ Cannot create trade-in contracts
- ❌ Error: Foreign key constraint violation
- ❌ Workflow blocked

**After Fix:**
- ✅ Trade-in contracts save successfully
- ✅ Full trade-in workflow works
- ✅ No foreign key errors

---

## 💡 Why This is Safe

1. **Non-destructive:** Only updates the foreign key constraint
2. **No data loss:** Existing data remains unchanged
3. **Consistent with transactions:** The `lats_trade_in_transactions` table already uses `customers`
4. **Aligns with app code:** The app queries `customer:customers(...)` throughout

---

## 🚨 Important Notes

- This fix should be run in your **production database** as well as development
- After running the fix, test the complete trade-in workflow
- The fix is **idempotent** - safe to run multiple times
- If you have existing contracts (unlikely since the error prevented creation), they will still reference the correct customers

---

## 📞 Need Help?

If you encounter any issues:

1. Check that both `customers` and `lats_customers` tables exist
2. Verify you have permissions to alter the table
3. Ensure no contracts are currently being created (lock conflicts)
4. Check the verification query output to confirm the fix

---

**Status:** Ready to apply ✅  
**Urgency:** High - Blocking trade-in contract creation  
**Complexity:** Low - Simple constraint update

