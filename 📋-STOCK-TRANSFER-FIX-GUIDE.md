# 🔧 Stock Transfer Error - Quick Fix Guide

## 🚨 The Problem

You're seeing these errors in your browser console:
```
❌ Failed to fetch transfers: {data: null, error: {…}, count: null}
❌ Failed to get transfer stats: {data: null, error: {…}, count: null}
```

**Root Cause:** The `branch_transfers` table either:
- Doesn't exist in your Neon database
- Has incorrect Row Level Security (RLS) policies blocking access
- Is missing required permissions

---

## ✅ The Solution (2 Steps)

### Step 1: Diagnose the Issue

1. Open your **Neon SQL Editor** (go to your Neon dashboard)
2. Run this file: `🔍-DIAGNOSE-STOCK-TRANSFER-ISSUE.sql`
3. Review the output to see what's missing

### Step 2: Fix the Issue

1. In the same **Neon SQL Editor**
2. Run this file: `🔧-FIX-STOCK-TRANSFER-TABLE-NOW.sql`
3. Wait for the success message ✅
4. **Refresh your browser** (Ctrl+R or Cmd+R)
5. Navigate to Stock Transfers page - errors should be gone!

---

## 📝 What the Fix Does

The fix script will:

✅ **Create the `branch_transfers` table** with all necessary columns:
- Transfer tracking (from/to branches, status, dates)
- Product/variant references
- User tracking (who requested/approved)
- Metadata and notes

✅ **Add 6 performance indexes** for fast queries

✅ **Create 3 helper functions**:
- `reduce_variant_stock()` - Decrease stock when transferring
- `increase_variant_stock()` - Increase stock when receiving
- `update_branch_transfer_timestamp()` - Auto-update timestamps

✅ **Configure permissions** for Neon database (no RLS)

✅ **Add foreign key constraints** to ensure data integrity

---

## 🎯 After Running the Fix

Once you've run the fix script and refreshed your browser, you should be able to:

1. ✅ View the Stock Transfers page without errors
2. ✅ See transfer statistics (pending, approved, in-transit, completed)
3. ✅ Create new stock transfers between branches
4. ✅ Approve/reject incoming transfer requests
5. ✅ Track transfer status and history

---

## 🧪 Testing the Fix

After running the fix, test it by:

1. **Navigate to Stock Transfers** page
2. **Click "New Transfer"** button
3. **Select**:
   - Destination branch
   - Product/variant with stock
   - Quantity to transfer
4. **Submit** the transfer request
5. **Verify** it appears in the list

---

## 🔍 Troubleshooting

### Still seeing errors after running the fix?

1. **Check browser console** for specific error messages
2. **Verify database connection**:
   - Check your `.env` file has correct Neon credentials
   - Test connection to Neon database
   
3. **Re-run the diagnostic**:
   ```sql
   -- Run: 🔍-DIAGNOSE-STOCK-TRANSFER-ISSUE.sql
   ```
   
4. **Check if you have branches and products**:
   - You need at least 2 active branches
   - You need products with stock to transfer

### Error: "store_locations table not found"

The `branch_transfers` table requires the `store_locations` table. Make sure you have:
- Run your branch setup scripts first
- Have at least 2 branches created

### Error: "lats_product_variants table not found"

You need the products/variants table. Make sure you have:
- Set up your LATS products system
- Have products with inventory

---

## 📚 Related Files

- `SETUP-STOCK-TRANSFER-TABLE.sql` - Original setup (Supabase version)
- `FIX-STOCK-TRANSFER-NEON.sql` - Quick Neon fix
- `src/lib/stockTransferApi.ts` - Frontend API code
- `src/features/lats/pages/StockTransferPage.tsx` - UI component

---

## 🎉 Success Indicators

You'll know it's working when:

✅ No console errors on Stock Transfers page  
✅ Stats cards show "0" instead of errors  
✅ "New Transfer" button works  
✅ Transfer list loads (even if empty)  
✅ No red error messages in browser  

---

## 💡 Pro Tips

1. **Always run diagnostics first** - Saves time!
2. **Refresh browser after DB changes** - Clear old cached queries
3. **Check Neon dashboard** - Verify tables exist
4. **Use browser DevTools** - Network tab shows actual error messages

---

## Need Help?

If you're still stuck:

1. Run the diagnostic script and save the output
2. Check the browser console for the full error object
3. Verify your Neon connection string is correct
4. Make sure your database has the required tables (store_locations, lats_product_variants)

---

**Ready to fix it? Run the scripts in order:**

1. `🔍-DIAGNOSE-STOCK-TRANSFER-ISSUE.sql` (diagnose)
2. `🔧-FIX-STOCK-TRANSFER-TABLE-NOW.sql` (fix)
3. Refresh browser ✨

