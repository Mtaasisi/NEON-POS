# 🚀 Payment Accounts - Quick Start Guide

## ⚡ NEW FEATURES ADDED TODAY!

### 1. Manual Transactions (Deposit/Withdrawal)
**Button:** Green **(+)** button on each account card

**What you can do:**
- 💰 **Deposit** - Add money (sales, collections, deposits)
- 💸 **Withdrawal** - Remove money (withdrawals, payments, expenses)
- 🔧 **Adjustment** - Fix balance errors or discrepancies

---

### 2. Account Transfers
**Button:** Purple **"Transfer"** button in page header

**What you can do:**
- Transfer money between any two accounts
- Move cash to bank
- Transfer between different currencies
- Consolidate funds

---

## 📱 HOW TO USE

### Add Money to Account (Deposit)
```
1. Find the account card
2. Click the green (+) button
3. Select "Deposit"
4. Enter amount: e.g., 50000
5. Add description: e.g., "Customer payment"
6. Click "Record Transaction"
✅ Balance increases immediately!
```

### Remove Money from Account (Withdrawal)
```
1. Find the account card
2. Click the green (+) button
3. Select "Withdrawal"
4. Enter amount: e.g., 10000
5. Add description: e.g., "ATM withdrawal"
6. Click "Record Transaction"
✅ Balance decreases immediately!
```

### Transfer Between Accounts
```
1. Click "Transfer" button (purple, in header)
2. Select FROM account (source)
3. Select TO account (destination)
4. Enter amount: e.g., 100000
5. Add description: e.g., "Daily bank deposit"
6. Click "Transfer Funds"
✅ Both balances update immediately!
```

---

## 💡 COMMON SCENARIOS

### Scenario 1: Customer Pays Cash
```
Account: Cash Drawer
Action: Deposit
Amount: 45,000 TZS
Description: "Invoice #1234 payment"
```

### Scenario 2: Deposit Cash to Bank
```
From: Cash Drawer
To: CRDB Bank Account
Amount: 500,000 TZS
Description: "Daily cash deposit"
```

### Scenario 3: Bank Withdrawal for Petty Cash
```
Account: CRDB Bank
Action: Withdrawal
Amount: 50,000 TZS
Description: "Petty cash for office"
```

### Scenario 4: Fix Balance Error
```
Account: Cash Drawer
Action: Adjustment
Amount: 2,500 TZS (or -2,500 if too high)
Description: "Cash count reconciliation"
```

---

## 🎯 BUTTON GUIDE

### In Page Header
| Button | Color | Icon | Function |
|--------|-------|------|----------|
| Refresh | White | 🔄 | Reload accounts |
| **Transfer** | **Purple** | **⇄** | **Transfer between accounts** |
| Add Account | Blue | + | Create new account |

### On Account Cards
| Button | Color | Icon | Function |
|--------|-------|------|----------|
| **(+)** | **Green** | **+** | **Add transaction** |
| Edit | White | ✏️ | Edit account details |
| Delete | Red | 🗑️ | Delete account |
| Card itself | - | - | View transaction history |

---

## ✅ VALIDATION RULES

### Deposits
- ✅ Amount must be positive
- ✅ Description required
- ✅ No balance limit

### Withdrawals
- ✅ Amount must be positive
- ✅ Cannot exceed current balance
- ✅ Description required
- ❌ Insufficient balance = blocked

### Transfers
- ✅ Amount must be positive
- ✅ Source must have sufficient balance
- ✅ Source ≠ Destination
- ✅ Description required
- ⚠️ Currency mismatch shows warning (but allowed)

---

## 📊 TRANSACTION TYPES EXPLAINED

| Type | Icon | Meaning | Balance Effect |
|------|------|---------|----------------|
| **payment_received** | 📈 | Money IN | **+** Increases |
| **expense** | 📉 | Money OUT | **-** Decreases |
| **transfer_in** | ⬅️ | Incoming transfer | **+** Increases |
| **transfer_out** | ➡️ | Outgoing transfer | **-** Decreases |
| **adjustment** | 🔧 | Balance correction | **+/-** Either |

---

## 🎨 COLOR CODING

### Transaction Types
- **Green** = Money IN (deposits, transfers in, payments received)
- **Red** = Money OUT (withdrawals, expenses, transfers out)
- **Blue** = Adjustments

### Account Cards
- Each account type has its own icon:
  - 💰 Cash
  - 🏦 Bank
  - 📱 Mobile Money
  - 💳 Credit Card
  - 💎 Savings

---

## 🔍 TRANSACTION HISTORY

**How to View:**
- Click on any account card to open history modal

**What You See:**
- 💼 Initial Balance (starting amount)
- 📈 Total Received (all money in)
- 📉 Total Spent (all money out)
- 💰 Current Balance (available now)
- 📊 Transaction count
- 📜 Detailed transaction list

**Filter Options:**
- All Transactions
- Received Only
- Spent Only
- Transfers In
- Transfers Out

---

## 🚨 IMPORTANT NOTES

### ✅ DO
- Always add descriptive notes to transactions
- Use reference numbers for important transactions
- Verify balances before large transfers
- Check transaction history regularly

### ❌ DON'T
- Don't delete accounts with transaction history (you'll lose data)
- Don't make adjustments without documenting the reason
- Don't transfer without sufficient balance
- Don't forget to refresh if balances seem wrong

---

## 📞 TROUBLESHOOTING

### Problem: Balance doesn't update
**Solution:** Click the Refresh button (white, in header)

### Problem: Can't withdraw enough
**Solution:** Check current balance - you can't withdraw more than available

### Problem: Transfer button disabled
**Solution:** Make sure you have at least 2 active accounts

### Problem: Transaction not showing in history
**Solution:** Click on the account card to open history, then click Refresh

---

## 🎓 TRAINING TIPS

### For New Users
1. Start with small test transactions (100 TZS)
2. Practice deposits first (easiest)
3. Then try withdrawals
4. Finally practice transfers
5. Always check the history after each action

### Best Practices
- Use clear, detailed descriptions
- Keep reference numbers consistent
- Reconcile balances daily
- Review transaction history weekly
- Document all adjustments

---

## ⚡ KEYBOARD SHORTCUTS

None yet, but planned for future updates!

---

## 📈 FORMULA REFERENCE

### Balance Calculation
```
Current Balance = Initial Balance + Total Received - Total Spent
```

### Example
```
Initial Balance: 100,000
Received: +50,000 (deposit)
Spent: -20,000 (withdrawal)
Current Balance: 130,000
```

---

## 🎯 QUICK REFERENCE CARD

```
┌─────────────────────────────────────────────┐
│  PAYMENT ACCOUNTS - QUICK REFERENCE         │
├─────────────────────────────────────────────┤
│                                             │
│  ADD MONEY:                                 │
│  1. Click green (+) button                  │
│  2. Select "Deposit"                        │
│  3. Enter amount & description              │
│                                             │
│  REMOVE MONEY:                              │
│  1. Click green (+) button                  │
│  2. Select "Withdrawal"                     │
│  3. Enter amount & description              │
│                                             │
│  TRANSFER:                                  │
│  1. Click purple "Transfer" button          │
│  2. Select FROM and TO accounts             │
│  3. Enter amount & description              │
│                                             │
│  VIEW HISTORY:                              │
│  1. Click on any account card               │
│  2. See all transactions                    │
│  3. Filter by type if needed                │
│                                             │
└─────────────────────────────────────────────┘
```

---

**Ready to start? Just look for the green (+) buttons! 🚀**

*Last Updated: October 25, 2025*

