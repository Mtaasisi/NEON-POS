# 📝 How to Record Expenses in Payment Accounts

---

## 🎯 Quick Guide

Expenses are automatically deducted from payment account balances when you record them in the `account_transactions` table.

---

## 💰 Method 1: Record Expense via SQL

### Example: Pay Office Rent

```sql
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  reference_number
) VALUES (
  '5e32c912-7ab7-444a-8ffd-02cb99b56a04',  -- Cash account ID
  'expense',
  10000,
  'October Office Rent',
  'RENT-OCT-2025'
);
```

**Result:**
- ✅ Cash balance reduced by TSh 10,000
- ✅ Transaction recorded with before/after balance
- ✅ UI shows updated balance

---

## 💳 Method 2: Common Expense Types

### 1. Utilities (Electricity, Water, Internet)

```sql
INSERT INTO account_transactions 
(account_id, transaction_type, amount, description)
VALUES 
('account-id', 'expense', 5000, 'October Electricity Bill');
```

### 2. Employee Salaries

```sql
INSERT INTO account_transactions 
(account_id, transaction_type, amount, description)
VALUES 
('account-id', 'expense', 50000, 'Employee Salary - John Doe');
```

### 3. Office Supplies

```sql
INSERT INTO account_transactions 
(account_id, transaction_type, amount, description)
VALUES 
('account-id', 'expense', 3000, 'Office Stationery Purchase');
```

### 4. Transportation/Fuel

```sql
INSERT INTO account_transactions 
(account_id, transaction_type, amount, description)
VALUES 
('account-id', 'expense', 8000, 'Vehicle Fuel - October');
```

### 5. Maintenance/Repairs

```sql
INSERT INTO account_transactions 
(account_id, transaction_type, amount, description)
VALUES 
('account-id', 'expense', 15000, 'Shop AC Repair');
```

---

## 🔍 Get Your Account IDs

### Find all payment accounts:

```sql
SELECT 
  id,
  name,
  type,
  balance,
  currency
FROM finance_accounts
WHERE is_payment_method = true
ORDER BY name;
```

**Example Output:**
```
id: 5e32c912-7ab7-444a-8ffd-02cb99b56a04
name: Cash
balance: 56924.5
```

---

## 📊 View Expenses by Account

### All expenses for Cash account:

```sql
SELECT 
  created_at as date,
  description,
  amount,
  balance_before,
  balance_after,
  reference_number
FROM account_transactions
WHERE account_id = '5e32c912-7ab7-444a-8ffd-02cb99b56a04'
  AND transaction_type = 'expense'
ORDER BY created_at DESC;
```

---

## 📈 Expense Summary by Account

### Total expenses per account:

```sql
SELECT 
  fa.name as account,
  fa.balance as current_balance,
  COALESCE(SUM(at.amount), 0) as total_expenses,
  COUNT(*) as expense_count
FROM finance_accounts fa
LEFT JOIN account_transactions at 
  ON fa.id = at.account_id 
  AND at.transaction_type = 'expense'
WHERE fa.is_payment_method = true
GROUP BY fa.id, fa.name, fa.balance
ORDER BY total_expenses DESC;
```

---

## 🎨 Expense Categories Available

Use these in your descriptions:

| Category | Example Description |
|----------|---------------------|
| 🏢 Rent | "October Shop Rent" |
| 💡 Utilities | "Electricity Bill - Oct 2025" |
| 💰 Salaries | "Salary Payment - Employee Name" |
| 📦 Supplies | "Office Supplies Purchase" |
| 🔧 Maintenance | "Equipment Repair" |
| 📢 Marketing | "Facebook Ads Campaign" |
| 🚗 Transportation | "Delivery Vehicle Fuel" |
| 🛡️ Insurance | "Business Insurance Premium" |
| 📝 Taxes | "Monthly Business Tax" |
| 📌 Other | "Miscellaneous Expense" |

---

## ⚡ Quick Copy-Paste Template

```sql
-- Replace values in < >
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  reference_number
) VALUES (
  '<ACCOUNT-ID>',        -- Get from finance_accounts table
  'expense',
  <AMOUNT>,              -- Expense amount in TSh
  '<DESCRIPTION>',       -- What was paid for
  '<REFERENCE-NUMBER>'   -- Optional reference
);

-- Example:
-- Cash account ID: 5e32c912-7ab7-444a-8ffd-02cb99b56a04
-- M-Pesa account ID: e10a3491-2c7a-4dad-a773-59a3144b776e
```

---

## 🔄 What Happens Automatically

When you insert an expense transaction:

1. **Trigger Fires** 🔥
   ```
   update_account_balance() trigger executes
   ```

2. **Balance Calculated** 📊
   ```
   new_balance = current_balance - expense_amount
   ```

3. **Record Updated** 💾
   ```
   - balance_before = old balance
   - balance_after = new balance
   - finance_accounts.balance updated
   ```

4. **UI Updates** 🖥️
   ```
   Payment Accounts tab shows new balance
   Transaction history includes expense
   ```

---

## ✅ Verify Expense Was Recorded

After recording an expense, run this:

```sql
-- Check latest transaction
SELECT 
  created_at,
  description,
  amount,
  balance_before,
  balance_after
FROM account_transactions
WHERE transaction_type = 'expense'
ORDER BY created_at DESC
LIMIT 1;
```

Should show:
- ✅ Your expense description
- ✅ Correct amount
- ✅ Balance before and after
- ✅ Recent timestamp

---

## 🎯 Real Example Walkthrough

### Scenario: Pay TSh 10,000 Rent from Cash

**Step 1:** Get Cash account ID
```sql
SELECT id FROM finance_accounts WHERE name = 'Cash';
-- Result: 5e32c912-7ab7-444a-8ffd-02cb99b56a04
```

**Step 2:** Check current balance
```sql
SELECT balance FROM finance_accounts WHERE name = 'Cash';
-- Result: 56924.5
```

**Step 3:** Record expense
```sql
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description
) VALUES (
  '5e32c912-7ab7-444a-8ffd-02cb99b56a04',
  'expense',
  10000,
  'October Rent Payment'
);
```

**Step 4:** Verify new balance
```sql
SELECT balance FROM finance_accounts WHERE name = 'Cash';
-- Result: 46924.5 ✅
-- (56924.5 - 10000 = 46924.5)
```

**Step 5:** Check transaction history
```sql
SELECT * FROM account_transactions 
WHERE description = 'October Rent Payment';
```

**Result:**
```
amount: 10000
balance_before: 56924.5
balance_after: 46924.5
transaction_type: expense
✅ Perfect!
```

---

## 🎊 That's It!

Expenses are now automatically tracked and reduce account balances. No manual calculations needed!

**Just insert to `account_transactions` with `transaction_type = 'expense'` and the system handles the rest!** 🚀

