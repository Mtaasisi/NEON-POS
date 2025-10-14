# 🔄 Recurring Expenses - Complete Guide

**Date:** October 13, 2025  
**Feature:** Automatic expense scheduling and processing  
**Use Case:** Salaries, Rent, Utilities, Subscriptions

---

## 🎯 WHAT IS IT?

### Recurring Expenses:
Expenses that happen **automatically on a fixed schedule** - no need to manually create them every time!

### Perfect For:
- 💰 **Salaries** - Monthly employee payments
- 🏢 **Rent** - Monthly office/shop rent
- 💡 **Utilities** - Monthly electricity, water, internet
- 🛡️ **Insurance** - Monthly/yearly premiums
- 📱 **Subscriptions** - Software, services
- 🔧 **Maintenance** - Weekly/monthly services
- 🚗 **Transportation** - Regular fuel/transport costs

---

## 📍 WHERE TO MANAGE

### Location:
```
/finance/payments → Recurring Tab
```

### Navigation:
1. Go to Payment Management
2. Click **"Recurring"** tab (7th tab)
3. See all automatic expenses
4. Add, edit, pause, or delete

---

## ⚡ TWO MODES

### 1. Auto-Process (⚡ Automatic):
- ✅ Expense created **automatically** on due date
- ✅ Balance deducted **automatically**
- ✅ Transaction recorded **automatically**
- ✅ Next due date calculated **automatically**
- ✅ **Zero manual work!**

**Use for:** Fixed, predictable expenses (salaries, rent)

### 2. Manual Approval (📝 Notification Only):
- 📅 You get **notified** when due
- 👤 You **manually approve** in UI
- ✅ Then it processes
- 🔒 More control

**Use for:** Variable expenses (utilities that change)

---

## 🎨 UI INTERFACE

### Main Dashboard:
```
┌───────────────────────────────────────────────────┐
│ Recurring Expenses                                │
│ Automate fixed expenses like salaries & rent      │
│                                                   │
│ [Refresh]  [Add Recurring Expense]               │
├───────────────────────────────────────────────────┤
│                                                   │
│ Summary Cards:                                    │
│ ┌──────────┬──────────┬──────────┬──────────┐   │
│ │ Total: 3 │ Active: 3│ Due: 1   │Month:190K│   │
│ └──────────┴──────────┴──────────┴──────────┘   │
│                                                   │
│ Scheduled Expenses (3):                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🏢 Office Rent                              │ │
│ │ TSh 150,000 • Monthly • Next: Nov 1        │ │
│ │ [Play] [Edit] [Pause] [Delete]             │ │
│ ├─────────────────────────────────────────────┤ │
│ │ 💡 Electricity Bill                         │ │
│ │ TSh 25,000 • Monthly • Next: Nov 1         │ │
│ │ [Play] [Edit] [Pause] [Delete]             │ │
│ ├─────────────────────────────────────────────┤ │
│ │ 🔧 Cleaning Services                        │ │
│ │ TSh 15,000 • Weekly • Next: Oct 20 📅 Soon │ │
│ │ [Play] [Edit] [Pause] [Delete]             │ │
│ └─────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

---

## ➕ HOW TO CREATE

### Step-by-Step:

1. **Click "Add Recurring Expense"**

2. **Fill in the form:**

   **Expense Name*** (What is it?)
   ```
   Example: "Monthly Office Rent"
   Example: "Employee Salaries"
   Example: "Weekly Cleaning"
   ```

   **Account*** (Pay from which account?)
   ```
   Select: Cash / Bank / M-Pesa
   ```

   **Category*** (What type?)
   ```
   Select: Salaries / Rent / Utilities / etc.
   ```

   **Amount (TSh)*** (How much?)
   ```
   Example: 150000 (for rent)
   Example: 500000 (for salaries)
   ```

   **Frequency*** (How often?)
   ```
   • Daily - Every day
   • Weekly - Every week
   • Monthly - Every month (most common!)
   • Yearly - Every year
   ```

   **Start Date*** (When to begin?)
   ```
   Example: 2025-11-01 (next month)
   Example: Today's date
   ```

   **Vendor** (Who gets paid?)
   ```
   Example: "ABC Properties" (for rent)
   Example: "TANESCO" (for electricity)
   ```

   **Reference Prefix** (For transaction references)
   ```
   Example: "RENT" → generates RENT-20251101
   Example: "SAL" → generates SAL-20251101
   ```

   **Auto-Process Checkbox** (⚡ Important!)
   ```
   ☑ Auto-Process = Automatic deduction
   ☐ Manual = Notification only
   ```

3. **Click "Create Recurring Expense"**

4. **Done!** It's now scheduled!

---

## 🎯 EXAMPLE: Monthly Salaries

### Setup:
```
Name: Employee Salaries
Account: Bank
Category: Salaries
Amount: 500,000
Frequency: Monthly
Start Date: 2025-11-01 (next month)
Vendor: Employees
Reference Prefix: SAL
Auto-Process: ✓ YES (automatic!)
```

### What Happens:
```
Nov 1, 2025:
  ⚡ Automatic processing runs
  → Creates expense transaction
  → Deducts TSh 500,000 from Bank
  → Reference: SAL-20251101
  → Next due: Dec 1, 2025

Dec 1, 2025:
  ⚡ Automatic processing runs again
  → Deducts TSh 500,000
  → Reference: SAL-20251201
  → Next due: Jan 1, 2026

Continues every month automatically!
```

**You never have to manually create salary expenses again!** 🎉

---

## 📅 FREQUENCIES EXPLAINED

### Daily:
```
Start: Oct 13
Next: Oct 14, 15, 16, 17...
Use for: Daily expenses (rare)
```

### Weekly:
```
Start: Oct 13 (Monday)
Next: Oct 20, 27, Nov 3, 10...
Use for: Cleaning, maintenance
```

### Monthly:
```
Start: Nov 1
Next: Dec 1, Jan 1, Feb 1...
Use for: Salaries, rent, utilities (MOST COMMON)
```

### Yearly:
```
Start: Jan 1, 2026
Next: Jan 1, 2027, 2028...
Use for: Annual insurance, licenses
```

---

## ⚡ AUTO-PROCESS VS MANUAL

### Auto-Process (Automatic):

**How it works:**
```
1. Due date arrives
2. System automatically creates expense
3. Balance deducted automatically
4. Transaction recorded
5. Next due date calculated
```

**Pros:**
- ✅ Zero manual work
- ✅ Never forget
- ✅ Always on time
- ✅ Consistent

**Cons:**
- ⚠️ Less control
- ⚠️ Auto-deducted (could be problem if balance low)

**Best for:** Fixed expenses (salaries, rent)

### Manual Approval:

**How it works:**
```
1. Due date arrives
2. System shows notification
3. You review in UI
4. You click "Process Now"
5. Then it's created
```

**Pros:**
- ✅ Full control
- ✅ Review before paying
- ✅ Can adjust amount
- ✅ Safer

**Cons:**
- ⚠️ Requires manual action
- ⚠️ Can forget

**Best for:** Variable expenses (utilities, supplies)

---

## 🔧 MANAGING RECURRING EXPENSES

### Actions Available:

**▶️ Process Now:**
- Manually trigger early
- Creates expense immediately
- Updates next due date

**✏️ Edit:**
- Change amount, frequency, account
- Update vendor, description
- Modify auto-process setting

**⏸️ Pause:**
- Stop processing temporarily
- Keep the schedule
- Resume later

**▶️ Resume:**
- Restart after pause
- Continue from next due date

**🗑️ Delete:**
- Remove permanently
- Cannot undo!
- Use pause instead if temporary

---

## 📊 HISTORY TRACKING

Every time a recurring expense processes, it's recorded in:
- `account_transactions` - The actual expense
- `recurring_expense_history` - Process log

### View History:
```sql
SELECT * FROM recurring_expense_history
WHERE recurring_expense_id = 'expense-id'
ORDER BY processed_date DESC;
```

Shows:
- When it was processed
- What amount
- Success/failure
- Transaction ID

---

## 🚀 AUTOMATION SETUP

### Option 1: Run Manually
```bash
./process-recurring-expenses.sh
```

### Option 2: Daily Cron Job (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Add line (runs daily at 2 AM):
0 2 * * * cd /path/to/project && ./process-recurring-expenses.sh
```

### Option 3: Windows Task Scheduler
```
1. Open Task Scheduler
2. Create Basic Task
3. Name: "Process Recurring Expenses"
4. Trigger: Daily at 2:00 AM
5. Action: Run process-recurring-expenses.bat
6. Save
```

### Option 4: Application Startup
Add to your app initialization:
```typescript
// Run on app startup
if (isAdmin) {
  supabase.rpc('process_due_recurring_expenses');
}
```

---

## 🎯 REAL-WORLD EXAMPLES

### Example 1: Monthly Employee Salaries
```
Name: Employee Salaries - October
Amount: TSh 1,200,000
Frequency: Monthly
Start: 2025-11-01
Auto-Process: ✓ YES

Result: TSh 1.2M deducted automatically every 1st of month
```

### Example 2: Monthly Office Rent
```
Name: Office Rent
Amount: TSh 150,000
Frequency: Monthly
Start: 2025-11-01
Vendor: ABC Properties
Auto-Process: ✓ YES

Result: TSh 150K deducted automatically on 1st of each month
```

### Example 3: Weekly Cleaning Service
```
Name: Office Cleaning
Amount: TSh 15,000
Frequency: Weekly
Start: 2025-10-20 (next Monday)
Auto-Process: ☐ NO (manual approval)

Result: Notified weekly, you approve manually
```

### Example 4: Monthly Electricity (Variable)
```
Name: Electricity Bill
Amount: TSh 25,000 (estimated)
Frequency: Monthly
Auto-Process: ☐ NO (manual - amount varies)

Result: Notified monthly, you adjust amount & approve
```

---

## 📋 SAMPLE SCHEDULES

### Complete Business Setup:

| Expense | Amount | Frequency | Auto | Purpose |
|---------|--------|-----------|------|---------|
| Salaries | 1,200,000 | Monthly | ✓ | Pay employees |
| Office Rent | 150,000 | Monthly | ✓ | Landlord payment |
| Electricity | 25,000 | Monthly | ☐ | TANESCO (varies) |
| Water | 10,000 | Monthly | ☐ | DAWASA (varies) |
| Internet | 50,000 | Monthly | ✓ | Vodacom Business |
| Cleaning | 15,000 | Weekly | ☐ | Cleaning service |
| Insurance | 200,000 | Yearly | ☐ | Business insurance |
| Software | 30,000 | Monthly | ✓ | SaaS subscriptions |

**Total Monthly:** TSh 1,480,000 (automated!)

---

## ✅ BENEFITS

### Time Savings:
- ❌ Before: Create 8 expenses manually every month (20 minutes)
- ✅ After: Zero manual work (0 minutes)
- **100% time saved!**

### Accuracy:
- ✅ Never forget salary day
- ✅ Never miss rent payment
- ✅ Always on time
- ✅ Consistent amounts

### Visibility:
- ✅ See all upcoming expenses
- ✅ Plan cash flow
- ✅ Budget accurately
- ✅ Complete history

### Control:
- ✅ Pause anytime
- ✅ Edit amounts
- ✅ Change schedules
- ✅ Choose auto vs manual

---

## 🔍 MONITORING

### Check Due Expenses:
```sql
SELECT name, category, amount, next_due_date
FROM recurring_expenses
WHERE is_active = true
  AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY next_due_date;
```

### Check Processing History:
```sql
SELECT 
  re.name,
  reh.processed_date,
  reh.amount,
  reh.status
FROM recurring_expense_history reh
JOIN recurring_expenses re ON re.id = reh.recurring_expense_id
ORDER BY reh.processed_date DESC
LIMIT 10;
```

---

## 🎊 SUCCESS!

You now have:
- ✅ **Automatic expense processing**
- ✅ **4 frequency options** (daily/weekly/monthly/yearly)
- ✅ **Auto or manual modes**
- ✅ **Complete UI management**
- ✅ **Processing script** (daily runner)
- ✅ **Full history tracking**
- ✅ **Pause/resume capability**

**Never manually create fixed expenses again!** 🔄⚡💰

---

## 🚀 NEXT STEPS:

1. **Refresh browser:** `Ctrl+Shift+R`
2. **Go to:** `/finance/payments` → **Recurring** tab
3. **See 3 sample expenses** (Rent, Electricity, Cleaning)
4. **Edit one** to match your business
5. **Enable auto-process** for fixed expenses
6. **Set up daily processing** (cron or manual)

---

**Your business expenses are now automated!** 🔄✅

