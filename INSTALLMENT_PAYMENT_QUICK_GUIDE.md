# Installment Payment - Quick Reference Guide

## ✅ The Fix: Payment Amount Now Matches Calculated Price

### What Changed?
The installment payment modal now **automatically** uses the calculated installment price instead of showing the full amount.

---

## 📊 How Installment Amounts Are Calculated

### Formula:
```
Installment Amount = (Total Amount - Down Payment) ÷ Number of Installments
```

### Example:
- **Total Sale:** 500,000 TZS
- **Down Payment:** 100,000 TZS
- **Number of Installments:** 8
- **Calculated Installment Amount:** (500,000 - 100,000) ÷ 8 = **50,000 TZS**

---

## 🎯 What You'll See Now

### When Creating an Installment Plan (POS):

```
┌─────────────────────────────────────────┐
│  Create Installment Plan                │
├─────────────────────────────────────────┤
│  Total Amount: 500,000 TZS              │
│  Down Payment: 100,000 TZS              │
│  Installments: 8                        │
│                                         │
│  ╔═════════════════════════════════╗   │
│  ║ Amount to Finance: 400,000 TZS  ║   │
│  ║ Calculated Per Installment:     ║   │
│  ║ 50,000 TZS                      ║   │
│  ╚═════════════════════════════════╝   │
│                                         │
│  💰 Down payment of 100,000 will be     │
│  recorded when you create this plan.    │
│  Future payments will be 50,000 each.   │
└─────────────────────────────────────────┘
```

### When Recording a Payment:

```
┌─────────────────────────────────────────┐
│  Record Payment - Plan: INS-000123      │
├─────────────────────────────────────────┤
│  Customer: John Doe                     │
│  Installments Paid: 3 / 8               │
│  Remaining Balance: 250,000 TZS         │
│  ─────────────────────────────────────  │
│  Calculated Installment Amount:         │
│  50,000 TZS                             │
├─────────────────────────────────────────┤
│  Payment Amount: [50,000]               │
│                                         │
│  💡 Default amount is set to the        │
│  calculated installment price           │
│  (50,000 TZS). You can adjust if needed.│
└─────────────────────────────────────────┘
```

### For Final Payment:

```
┌─────────────────────────────────────────┐
│  Record Payment - Plan: INS-000123      │
├─────────────────────────────────────────┤
│  Customer: John Doe                     │
│  Installments Paid: 7 / 8               │
│  Remaining Balance: 35,000 TZS          │
│  ─────────────────────────────────────  │
│  Calculated Installment Amount:         │
│  50,000 TZS                             │
│                                         │
│  ⚠️  FINAL PAYMENT                      │
│  This is the last payment. Amount set   │
│  to remaining balance: 35,000 TZS       │
├─────────────────────────────────────────┤
│  Payment Amount: [35,000]               │
│                                         │
│  💡 Final payment adjusted to match     │
│  remaining balance.                     │
└─────────────────────────────────────────┘
```

---

## 🔄 Complete Workflow

### Step 1: Create Installment Plan from POS
1. Add items to cart
2. Select customer
3. Click **"Installment Plan"** button
4. Fill in:
   - Down Payment (optional)
   - Number of Installments
   - Payment Frequency (weekly/bi-weekly/monthly)
   - Start Date
5. **See calculated amounts** in green summary box
6. Select payment account
7. Click **"Create Installment Plan"**

**Result:** 
- ✅ Sale created
- ✅ Installment plan created with calculated amount
- ✅ Down payment automatically recorded (if > 0)

---

### Step 2: Record Future Payments
1. Go to **Installments** page
2. Find the plan
3. Click **"Record Payment"** button
4. **Payment amount auto-filled** with calculated installment price
5. Select payment method and account
6. Click **"Record Payment"**

**Result:**
- ✅ Payment recorded
- ✅ Plan updated (installments_paid +1)
- ✅ Balance due reduced
- ✅ Next payment date updated

---

## 💡 Smart Features

### 1. Automatic Amount Detection
- **Regular payments:** Uses calculated installment amount (e.g., 50,000)
- **Final payment:** Uses remaining balance (e.g., 35,000)
- **No manual calculation needed!**

### 2. Visual Indicators
- 📊 **Green box:** Shows calculation breakdown
- ⚠️ **Yellow warning:** Appears for final payment
- 💰 **Info icon:** Explains down payment handling
- 💡 **Helper text:** Reminds you amount is pre-calculated

### 3. Flexibility
- Can adjust payment amount if needed (partial payments)
- Can overpay to finish early
- System prevents paying more than balance due

---

## 🎓 Common Scenarios

### Scenario 1: Regular Monthly Payment
**Situation:** Customer has 8 monthly payments of 50,000 each

**Action:**
1. Open payment modal
2. See amount: 50,000 (auto-filled)
3. Select payment method
4. Record payment

**Result:** ✅ Payment recorded correctly as 50,000

---

### Scenario 2: Final Payment (Different Amount)
**Situation:** Last payment, balance is 35,000 (not the full 50,000)

**Action:**
1. Open payment modal
2. See amount: 35,000 (auto-filled with balance due)
3. See yellow warning: "FINAL PAYMENT"
4. Record payment

**Result:** ✅ Payment recorded as 35,000, plan completed

---

### Scenario 3: Early Payoff
**Situation:** Customer wants to pay remaining balance early

**Action:**
1. Open payment modal
2. See amount: 50,000 (regular installment)
3. **Change amount** to remaining balance (e.g., 200,000)
4. Record payment

**Result:** ✅ Full balance paid, plan completed immediately

---

## ⚠️ Important Notes

1. **Down Payment is Automatic**
   - When you create a plan with a down payment, it's recorded immediately
   - You don't need to make a separate payment for the down payment
   - The installment amount is calculated AFTER down payment

2. **Amount is Editable**
   - The calculated amount is a smart default
   - You can change it if the customer pays a different amount
   - System prevents exceeding the balance due

3. **Final Payment Auto-Adjusts**
   - The last payment automatically uses the remaining balance
   - No need to manually calculate the difference
   - Yellow warning lets you know it's the final payment

4. **Payment Frequency Options**
   - Weekly: Payments every 7 days
   - Bi-weekly: Payments every 14 days
   - Monthly: Payments every 30 days

---

## 🐛 Troubleshooting

### Issue: "Payment amount seems wrong"
**Check:**
1. Look at the "Calculated Installment Amount" in the plan info
2. Check if it's the final payment (yellow warning)
3. Verify the installment plan was created with correct amounts

### Issue: "Can't find the payment modal"
**Solution:**
1. Go to **Installments** page
2. Find your plan in the list
3. Click the **dollar icon** or **"Record Payment"** button

### Issue: "Down payment wasn't recorded"
**Check:**
1. Look at "Installments Paid" - should show "1 / X" if down payment was recorded as installment #0
2. Check the payment history for the plan
3. Verify payment account was selected when creating the plan

---

## 📱 Quick Tips

- 💰 **Always select a payment account** before creating a plan
- 📊 **Review the calculation summary** before confirming
- 🔍 **Use the search** to quickly find a plan by plan number or customer name
- 📅 **Check "Next Payment Date"** to know when payment is due
- ⏰ **Yellow "Overdue" badge** appears if payment is late
- 📧 **Send reminder** button to WhatsApp customer about payment

---

## 🎉 Benefits of the New System

✅ **No More Confusion:** Amount is automatically correct
✅ **Saves Time:** No manual calculation needed
✅ **Prevents Errors:** System enforces correct amounts
✅ **Clear Communication:** Visual indicators explain everything
✅ **Flexible:** Can still adjust amounts when needed

---

**Need Help?** Check the browser console (F12) for detailed logs marked with 💰 emoji.

