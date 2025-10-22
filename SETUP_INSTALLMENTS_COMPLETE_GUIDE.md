# Complete Guide: Fix Installments Not Showing

## 🎯 Summary of the Issue

You couldn't see installments you created because:
1. The installments tables haven't been created in your database yet
2. Even if they were, the `branch_id` field needs to be properly set

## ✅ What Was Fixed in the Code

### 1. Access Permissions (Already Done ✅)
- Added `customer-care` role to Installments and Special Orders routes
- You can now see the menu items in the sidebar

### 2. Branch ID Support (Already Done ✅)
- Updated `installmentService.ts` to accept and save `branch_id`
- Updated `InstallmentsPage.tsx` to pass `branch_id` when creating
- Updated `POSInstallmentModal.tsx` to pass `branch_id` when creating from POS

## 📋 What You Need to Do Now

### Step 1: Create the Database Tables

You need to run the SQL migration in your Supabase dashboard:

**Instructions:**
1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of this file:
   ```
   migrations/create_special_orders_and_installments.sql
   ```
6. Paste it into the SQL Editor
7. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
8. Wait for "Success. No rows returned" message

**What this does:**
- Creates `customer_installment_plans` table
- Creates `installment_payments` table  
- Creates `customer_special_orders` table
- Creates `special_order_payments` table
- Sets up indexes, triggers, and RLS policies
- **Includes `branch_id` field by default**

### Step 2: Verify Tables Were Created

Run this SQL in Supabase SQL Editor to verify:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'customer_installment_plans',
    'installment_payments',
    'customer_special_orders',
    'special_order_payments'
);
```

You should see 4 tables listed.

### Step 3: Test the Feature

1. **Refresh your browser** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. **Login** as: `care@care.com` / `123456`
3. **Check sidebar** - you should see:
   - 🚚 Special Orders
   - 💲 Installment Plans

4. **Click on "Installment Plans"**
5. **Create a test installment:**
   - Click "Create Installment Plan"
   - Select a customer
   - Fill in the details:
     - Total Amount: 1000000 (1M TZS)
     - Down Payment: 200000 (200K TZS)
     - Number of Installments: 5
     - Payment Frequency: Monthly
     - Start Date: Today
   - Select payment account
   - Click "Create Plan"

6. **Verify** - The new installment should appear in the list immediately

### Step 4: Test from POS (Optional)

1. Go to **POS** page
2. Add items to cart
3. Select a customer
4. Click **"Installment Plan"** payment option
5. Fill in installment details
6. Complete the sale
7. Go back to **Installments** page
8. Verify the new installment appears

## 🔍 Troubleshooting

### Issue: "relation does not exist" error
**Solution:** You haven't run Step 1 yet. Go to Supabase and run the migration SQL.

### Issue: Installments still not showing after creation
**Solution:** 
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors
4. Check Network tab for failed requests
5. Verify you're in the correct branch (check top-right corner of your app)

### Issue: "branch_id" column doesn't exist
**Solution:** The migration file already includes `branch_id`. Make sure you ran the complete migration file.

### Issue: Permission denied errors
**Solution:** 
1. The migration creates RLS policies
2. Make sure you're logged in
3. Try logging out and back in

## 📊 Verify Data in Database

After creating some installments, run these queries in Supabase:

```sql
-- View all installments
SELECT 
  plan_number,
  total_amount,
  down_payment,
  status,
  branch_id,
  created_at
FROM customer_installment_plans
ORDER BY created_at DESC;

-- View installments with customer names
SELECT 
  cip.plan_number,
  c.name as customer_name,
  cip.total_amount,
  cip.installment_amount,
  cip.number_of_installments,
  cip.installments_paid,
  cip.status,
  cip.branch_id
FROM customer_installment_plans cip
LEFT JOIN customers c ON c.id = cip.customer_id
ORDER BY cip.created_at DESC;

-- Check branch filtering works
SELECT 
  branch_id,
  COUNT(*) as total_plans,
  SUM(total_amount) as total_value
FROM customer_installment_plans
GROUP BY branch_id;
```

## 📁 Files Modified

✅ **src/App.tsx** - Added customer-care to routes
✅ **src/layout/AppLayout.tsx** - Added customer-care to navigation
✅ **src/lib/installmentService.ts** - Added branch_id parameter
✅ **src/features/installments/pages/InstallmentsPage.tsx** - Pass branch_id
✅ **src/features/lats/components/pos/POSInstallmentModal.tsx** - Pass branch_id

## 🎉 Expected Result

After completing all steps:
- ✅ You can see "Installment Plans" in the sidebar
- ✅ You can create new installments
- ✅ Installments appear immediately in the list
- ✅ Each installment has the correct branch_id
- ✅ You only see installments from your current branch
- ✅ Creating from POS works perfectly

## 📞 Need Help?

If you're still having issues:
1. Check browser console for errors
2. Verify all tables were created
3. Confirm you're logged in as customer-care user
4. Make sure you selected a branch
5. Try creating an installment step-by-step

---

**Last Updated:** October 22, 2025  
**Status:** Code fixed ✅ | Database migration needed ⏳

