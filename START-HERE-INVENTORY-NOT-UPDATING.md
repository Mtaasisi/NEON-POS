# 🚀 START HERE: Inventory Not Updating After Receiving

## The Issue
When you receive purchase orders and set prices, the inventory stock quantities don't update.

---

## ⚡ Quick Fix (Choose ONE)

### **Option 1: Easiest (Terminal)**
```bash
./run-inventory-sync-fix.sh
```
Select option **3** and follow the prompts.

---

### **Option 2: Fastest (SQL)**
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy ALL contents from `apply-inventory-sync-trigger.sql`
3. Paste and click **Run**
4. Done! ✅

---

## ✅ How to Test It Worked

1. Create a test purchase order (2-3 items)
2. Click "Set Pricing" and enter selling prices
3. Click "Confirm & Receive Items"
4. Go to **Inventory** page
5. **Check:** Stock counts should show the received quantities ✅

---

## 📖 Need More Details?

See: **`INVENTORY-NOT-UPDATING-FIX.md`** for:
- Detailed explanations
- Troubleshooting steps
- What the fix does technically
- Alternative methods

---

## 🆘 Still Not Working?

Run diagnostics:
```bash
node diagnose-inventory-sync.js
```

This will show you exactly what's wrong.

---

**Estimated Time:** 2-5 minutes
**Difficulty:** Easy
**Risk:** None (safe to run)

