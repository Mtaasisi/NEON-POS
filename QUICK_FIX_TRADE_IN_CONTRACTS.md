# ⚡ QUICK FIX - Trade-In Contracts Error

## 🎯 The Problem
Error when signing trade-in contracts: **"violates foreign key constraint"**

## ✅ The Fix (30 seconds)

### Step 1: Open Supabase Dashboard
Go to: **Supabase Dashboard → SQL Editor**

### Step 2: Run This SQL
```sql
ALTER TABLE lats_trade_in_contracts 
DROP CONSTRAINT IF EXISTS lats_trade_in_contracts_customer_id_fkey;

ALTER TABLE lats_trade_in_contracts 
ADD CONSTRAINT lats_trade_in_contracts_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
```

### Step 3: Click "Run"
Done! ✅

## 🧪 Test It
1. Create a trade-in transaction
2. Sign the contract
3. Should work without errors

---

**Need more details?** See: `TRADE_IN_CONTRACT_ERROR_SUMMARY.md`

