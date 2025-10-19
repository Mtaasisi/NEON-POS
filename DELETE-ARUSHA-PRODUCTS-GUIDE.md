# 🗑️ Delete All Products in Arusha Branch - Guide

## ✅ Setup Complete!

I've created a safe and easy way for you to delete all products in the Arusha branch.

---

## 📋 Two Ways to Delete Products

### **Option 1: Use the UI (Recommended)**

1. **Navigate to Admin Settings:**
   - Go to **Admin Settings** page
   - Click on the **"Branch Isolation Debug"** tab

2. **Find the Product Management Section:**
   - Scroll down to find the **"Branch Products"** card
   - You'll see the total number of products in your current branch (Arusha)

3. **Delete Products:**
   - Click the red **"Delete All Products in This Branch"** button
   - A confirmation modal will appear
   - Type `DELETE ALL PRODUCTS` exactly as shown
   - Click **"Delete All Products"** to confirm
   - The page will refresh automatically after deletion

4. **Done!** ✅
   - You'll see a success message showing:
     - How many products were deleted
     - How many variants were deleted
     - Branch name confirmation

---

### **Option 2: Run SQL Script (Direct Database)**

If you prefer to run SQL directly in your Neon database:

1. **Open Neon SQL Editor:**
   - Go to your Neon dashboard
   - Open the SQL Editor

2. **Run the Migration Script:**
   ```sql
   -- The script is located at:
   migrations/delete_arusha_products.sql
   ```

3. **Copy and paste the entire script** into the SQL Editor and run it.

4. **Done!** ✅
   - The script will show you how many products and variants were deleted

---

## ⚠️ Important Notes

### **What Gets Deleted:**
- ✅ All products belonging to Arusha branch
- ✅ All product variants for those products

### **What Gets Preserved:**
- ✅ Sales history (sale items set to NULL but records remain)
- ✅ Purchase order history (items set to NULL but records remain)
- ✅ Stock movement logs (preserved with NULL reference)

### **Safety Features:**
- 🔒 Only deletes products from the **current selected branch**
- 🔒 Requires typing confirmation text to prevent accidents
- 🔒 Shows product count before deletion
- 🔒 Provides detailed feedback after deletion

---

## 📁 New Files Created

1. **`src/lib/branchProductManagement.ts`**
   - API functions for deleting products
   - `deleteAllBranchProducts()` - deletes current branch products
   - `deleteAllProductsByBranchId()` - deletes by specific branch ID

2. **`src/features/admin/components/BranchProductManagement.tsx`**
   - UI component for product management
   - Shows product count
   - Provides safe deletion interface

3. **`migrations/delete_arusha_products.sql`**
   - SQL script for direct database deletion
   - Finds Arusha branch automatically
   - Provides detailed deletion summary

---

## 🎯 How to Use Right Now

Since you're already in the Arusha branch:

1. Go to **Admin Settings** → **Branch Isolation Debug** tab
2. Scroll down to the **Branch Products** section
3. Click **"Delete All Products in This Branch"**
4. Type `DELETE ALL PRODUCTS` to confirm
5. Click confirm and wait for the success message
6. The page will automatically refresh!

---

## 🚀 Quick Start

Just run your app and navigate to:
```
/admin/settings → Branch Isolation Debug tab
```

That's it! You can now safely delete all Arusha products with just a few clicks.

---

## 💡 Pro Tips

- The UI is safer because it shows you exactly how many products will be deleted
- You can refresh the product count at any time using the refresh icon
- The confirmation modal prevents accidental deletions
- If you cancel, no changes are made to your database
- The operation cannot be undone, so make sure you're in the right branch!

---

## ❓ Troubleshooting

**"No branch selected" message?**
- Use the branch selector at the top of your app to select Arusha branch

**Want to delete products from a different branch?**
- Just switch to that branch using the branch selector
- The UI will automatically show products for the selected branch

**Need to delete products from multiple branches?**
- Switch branches and repeat the process for each one
- Or use the SQL script with specific branch IDs

---

## 📞 Need Help?

If you run into any issues, check the browser console for detailed logs. The deletion process outputs detailed information about what's happening.

Happy cleaning! 🧹✨

