# Quick Fix: Make Installments Visible

## 🎯 The Problem
You can't see the installments you created because the database tables haven't been created yet!

## ✅ The Solution (2 Simple Steps)

### Step 1: Create the Tables in Supabase (5 minutes)

1. Open your **Supabase Dashboard** → https://supabase.com/dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **+ New Query**
4. Open this file on your computer:
   ```
   migrations/create_special_orders_and_installments.sql
   ```
5. Copy ALL the contents and paste into Supabase SQL Editor
6. Click **Run** button (bottom right)
7. Wait for success message ✅

### Step 2: Refresh and Test

1. Go back to your app browser tab
2. **Hard refresh:** 
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`
3. You should now see **"Installment Plans"** in the sidebar 💲
4. Click on it and create a test installment!

## 🎉 That's It!

Your installments will now:
- ✅ Show up immediately when you create them
- ✅ Be filtered by your current branch
- ✅ Work from both the Installments page and POS

---

**Need the detailed guide?** See `SETUP_INSTALLMENTS_COMPLETE_GUIDE.md`

