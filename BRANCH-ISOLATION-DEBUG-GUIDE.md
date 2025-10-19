# 🔍 Branch Isolation Debugger - Complete Guide

**Date:** October 18, 2025  
**Status:** ✅ **READY TO USE**

---

## 🎯 What Is This?

A comprehensive debugging tool to **verify that your branch data isolation is working correctly**. This helps you ensure that:

- ✅ Isolated data stays isolated (no cross-branch data leaks)
- ✅ Shared data is accessible to all branches
- ✅ Hybrid mode respects your specific settings
- ✅ Each feature (products, customers, inventory, etc.) works as configured

---

## 🚀 How to Use

### Method 1: Using the Admin UI (Recommended)

1. **Navigate to Admin Settings**
   - Go to **Settings** → **Admin Settings**

2. **Open the Debug Panel**
   - Click on **"Branch Isolation Debug"** in the left sidebar
   - You'll see the beautiful debug interface

3. **Select a Branch**
   - Make sure you have a branch selected in the branch selector (usually in the top navigation)

4. **Run the Test**
   - Click the green **"Run Test"** button
   - The system will test all configured features and show you the results

5. **Review Results**
   - ✅ **Green cards** = Isolation working correctly
   - ❌ **Red cards** = Isolation not working (needs attention)
   - ⚠️  **Yellow cards** = Working but with warnings (e.g., no data yet)

### Method 2: Using Browser Console

You can also test isolation directly from the browser console:

```javascript
// Enable debug mode (logs all queries)
window.enableBranchDebug()

// Run a full isolation test
await window.testBranchIsolation()

// Disable debug mode
window.disableBranchDebug()
```

---

## 📊 Understanding the Results

### Test Result Cards

Each feature (Products, Customers, Inventory) gets tested individually:

**Data Count Breakdown:**
- **Current Branch**: Items that belong to the selected branch
- **Other Branches**: Items from other branches (should be 0 in isolated mode)
- **Shared Items**: Items marked as shared or with no branch assignment
- **Total Visible**: Total items the current branch can see

### Expected vs Actual

- **Expected**: What the system should do based on your configuration
- **Actual**: What the system is actually doing

If Expected ≠ Actual, you have an isolation issue!

---

## 🔧 Debug Features

### 1. Debug Mode Toggle

When enabled, logs detailed information about every database query:

```
🔍 ========================================
🔍 QUERY DEBUG: products
🔍 ========================================
   Isolation Mode: isolated
   Filtered by Branch: YES
   Branch ID: abc-123-def
   Timestamp: 2025-10-18T10:30:00.000Z
🔍 ========================================
```

**How to use:**
- Click **"Debug On"** button in the debug panel
- Open browser console (F12)
- Perform actions in your app (view products, customers, etc.)
- See detailed logs about each query

### 2. Auto-Refresh

Continuously monitors isolation every 10 seconds:

- Click **"Auto-refresh On"** to enable
- Tests run automatically in the background
- Perfect for monitoring during development

### 3. Branch Configuration View

Shows your current branch settings at a glance:
- Which features are SHARED
- Which features are ISOLATED
- Current isolation mode (Shared, Isolated, or Hybrid)

---

## 🐛 Common Issues & Solutions

### Issue 1: "Found products from other branches (should be 0)"

**Problem:** You have isolation mode set to `isolated`, but products from other branches are visible.

**Solution:**
1. Check if products have the correct `branch_id`
2. Run this SQL to verify:
   ```sql
   SELECT branch_id, COUNT(*) 
   FROM lats_products 
   GROUP BY branch_id;
   ```
3. Make sure the products were created AFTER enabling isolation

### Issue 2: "No data found for this branch yet"

**Problem:** The test shows a warning that no data exists for the branch.

**This is OK if:**
- You just created the branch
- You haven't added any products/customers yet

**Action needed:**
- Add some test data to verify isolation is working

### Issue 3: Debug logs not appearing

**Problem:** Debug mode is on but you don't see logs in the console.

**Solution:**
1. Make sure you're on the correct browser tab
2. Refresh the page after enabling debug mode
3. Perform an action (like viewing products) to trigger a query

---

## 📋 Test Scenarios

### Scenario 1: Testing Isolated Products

**Setup:**
- Branch A: isolation mode = `isolated`
- Branch A: share_products = `false`

**Add test data:**
1. Switch to Branch A
2. Add 5 products

**Run test:**
- Current Branch: should show 5
- Other Branches: should show 0
- Result: ✅ PASS

### Scenario 2: Testing Shared Customers

**Setup:**
- Branch A: isolation mode = `hybrid`
- Branch A: share_customers = `true`

**Add test data:**
1. Switch to Branch A, add 3 customers
2. Switch to Branch B, add 2 customers

**Run test from Branch A:**
- Current Branch: should show 3
- Other Branches: should show 2
- Total Visible: should show 5 (all customers)
- Result: ✅ PASS

### Scenario 3: Testing Mixed (Hybrid) Mode

**Setup:**
- Branch A: isolation mode = `hybrid`
- Branch A: share_products = `true`
- Branch A: share_customers = `false`

**Expected behavior:**
- Products test: Should see ALL products (shared)
- Customers test: Should see ONLY Branch A customers (isolated)

---

## 🎯 Best Practices

### During Development

1. **Always test after configuration changes**
   - Changed isolation settings? Run a test!
   - Added a new branch? Run a test!

2. **Use debug mode when building features**
   - Enable debug logging
   - Watch the console as you develop
   - Verify queries are filtering correctly

3. **Test with real data**
   - Create test branches
   - Add sample data to each
   - Verify isolation works with actual records

### In Production

1. **Run tests periodically**
   - Weekly checks to ensure isolation integrity
   - After any database migrations
   - When users report seeing wrong data

2. **Monitor with auto-refresh**
   - Enable during high-traffic periods
   - Watch for unexpected failures

3. **Document your configuration**
   - Which branches use which isolation mode
   - Which features are shared vs isolated
   - Keep this updated when changes are made

---

## 🔐 Security Considerations

### What the debugger checks:

✅ **Data Leakage Prevention**
- Ensures Branch A can't see Branch B's isolated data

✅ **Configuration Validation**
- Verifies settings match actual behavior

✅ **Query Filtering**
- Confirms all queries include proper branch filters

### What to watch for:

⚠️ **Failed Tests**
- Immediate investigation required
- Could indicate a security issue

⚠️ **Inconsistent Counts**
- If numbers don't add up, something's wrong

⚠️ **Missing Filters**
- Debug logs should show filters being applied

---

## 💡 Tips & Tricks

### Quick Console Commands

```javascript
// Test specific feature (coming soon)
// await testProductsIsolation('branch-id')

// Clear branch cache (useful if settings aren't updating)
localStorage.removeItem('current_branch_id')

// View current branch
console.log(localStorage.getItem('current_branch_id'))

// View debug status
console.log(localStorage.getItem('branch_isolation_debug'))
```

### Reading the Console Logs

When debug mode is on, look for these patterns:

**Good (Isolated Mode):**
```
🔒 Filtering products by branch: abc-123
```

**Good (Shared Mode):**
```
📊 No branch filter applied (products are shared)
```

**Bad (If you expect isolation):**
```
📊 No branch filter applied (no branch selected)
```

---

## 📚 Related Documentation

- [Multi-Branch Isolation Guide](./🏪-MULTI-BRANCH-ISOLATION-COMPLETE.md)
- [Branch Isolation Summary](./✨-BRANCH-ISOLATION-SUMMARY.md)
- [Store Isolation Fix Guide](./STORE-ISOLATION-FIX-COMPLETE.md)

---

## 🆘 Need Help?

### The debugger shows failures

1. **Check your data_isolation_mode setting**
   - Go to Store Management Settings
   - Verify each branch's isolation mode

2. **Check individual share flags (Hybrid mode)**
   - Ensure share_products, share_customers, etc. are set correctly

3. **Check branch_id assignments**
   - Run SQL query to see which items have which branch_ids
   ```sql
   SELECT branch_id, COUNT(*) as count 
   FROM lats_products 
   GROUP BY branch_id;
   ```

4. **Re-run database migrations**
   - Make sure all tables have branch_id columns
   - Check that the migrations completed successfully

### Still having issues?

The debug panel provides detailed information about:
- What mode the branch is in
- What the system expects
- What the system is actually doing
- Exact counts of items in each category

Use this information to identify where the isolation is breaking down.

---

## 🎉 Success Indicators

You know isolation is working when:

1. ✅ All tests show **PASSED**
2. ✅ "Other Branches" count = 0 (in isolated mode)
3. ✅ "Total Visible" matches expected counts
4. ✅ Debug logs show correct filtering
5. ✅ Users report seeing only their branch's data

---

**Remember:** The debugger is your friend! Use it often, especially when making configuration changes or adding new branches. It's better to catch isolation issues early than to discover them when users report seeing wrong data.

Happy debugging! 🐛🔍

