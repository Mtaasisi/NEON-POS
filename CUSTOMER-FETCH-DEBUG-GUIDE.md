# 🔍 Customer Fetching - Debug Guide

## ✅ What Was Added

Comprehensive debug logging for the **customer fetching process** to track branch filtering and verify data isolation.

## 📝 Debug Sections

### 1. **Fetch Start & Branch Configuration** (Lines 167-183)

When customers are being loaded, you'll see:

```
═══════════════════════════════════════════════════════
👥 FETCHING CUSTOMERS - START
═══════════════════════════════════════════════════════
🏪 Branch Filter Configuration:
   - Current Branch ID: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
✅ Branch filter ACTIVE - fetching only customers from: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
```

**What it tells you:**
- ✅ Which branch is selected
- ⚠️ Warning if NO branch is selected
- 🔒 Whether branch filtering will be applied

### 2. **Customer Count** (Lines 186-228)

Shows how many customers exist for the selected branch:

```
🔍 Step 1: Counting total customers...
   🔒 Applying branch filter to count query...

📊 Count Results:
   ✓ Total customers found: 45
   ✓ For branch: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
```

**What it tells you:**
- Total count of customers in selected branch
- Whether branch filter was applied to count query
- If counting failed (with error details)

### 3. **Pagination Details** (Lines 238-244)

Shows how the data will be fetched:

```
📄 Pagination Setup:
   - Page size: 50 customers per page
   - Total pages: 1
   - Will fetch: 1 pages

🔍 Step 2: Fetching customer data page by page...
```

**What it tells you:**
- How many customers per page
- How many pages total
- Pagination strategy

### 4. **Page-by-Page Fetching** (Lines 252-306)

For each page of customers:

```
📖 Fetching page 1/1 (rows 0-49)...
   🔒 Applying branch filter: branch_id = 24cd45b8-1ce1-486a-b055-29d169c3a8ea
   ✓ Page 1 fetched: 45 customers
   📍 Branch IDs in this page: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
```

**What it tells you:**
- Which page is being fetched
- Row range (from-to)
- Branch filter applied to query
- Number of customers returned
- **Branch IDs present** in the data
- ⚠️ Warning if customers missing `branch_id`

### 5. **Final Summary** (Lines 398-453)

After all customers are fetched:

```
═══════════════════════════════════════════════════════
✅ CUSTOMER FETCH COMPLETE
═══════════════════════════════════════════════════════
📊 Results Summary:
   ✓ Total customers fetched: 45
   ✓ Pages processed: 1

🏪 Branch Filter Verification:
   ✓ Filtered by branch: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
   ✓ Unique branch IDs in results: ['24cd45b8-1ce1-486a-b055-29d169c3a8ea']
   ✅ All customers belong to the correct branch!

📋 Sample customers (first 3):
   1. John Doe (+255746605560)
      - ID: abc-123-def
      - Branch: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
      - Shared: false
   2. Jane Smith (+255746605561)
      - ID: def-456-ghi
      - Branch: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
      - Shared: false
   3. Bob Johnson (+255746605562)
      - ID: ghi-789-jkl
      - Branch: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
      - Shared: false
═══════════════════════════════════════════════════════
```

**What it tells you:**
- Total customers fetched
- Branch filter verification
- **Data integrity checks:**
  - All customers have branch_id
  - No customers from wrong branch
  - Sample of first 3 customers with branch info

## 🎯 What to Look For

### ✅ Success Case

```
✅ Branch filter ACTIVE - fetching only customers from: [branch-id]
📊 Count Results:
   ✓ Total customers found: 45
   ✓ For branch: [branch-id]

🏪 Branch Filter Verification:
   ✓ Unique branch IDs in results: ['[branch-id]']
   ✅ All customers belong to the correct branch!
```

### ⚠️ Warning Cases

#### No Branch Selected:
```
⚠️  WARNING: No branch selected!
⚠️  Will fetch ALL customers from ALL branches
⚠️  This may show customers from other branches
```

#### Customers Missing branch_id:
```
⚠️  5 customers WITHOUT branch_id (will be invisible in filtered view)
```

#### Wrong Branch Data:
```
❌ 3 customers from WRONG branch!
❌ This indicates a filtering problem!
```

## 🔍 Troubleshooting Guide

### Problem: "No branch selected" warning

**Symptoms:**
```
⚠️  WARNING: No branch selected!
⚠️  Will fetch ALL customers from ALL branches
```

**Solutions:**
1. Check if a branch is selected in the UI
2. Verify `localStorage.current_branch_id` exists:
   ```javascript
   localStorage.getItem('current_branch_id')
   ```
3. Select a branch from the branch selector

### Problem: Customers missing branch_id

**Symptoms:**
```
⚠️  10 customers missing branch_id
```

**What this means:**
- These customers were created without branch assignment
- They won't appear when branch filtering is active
- They're "orphaned" customers

**Solutions:**
1. Run the SQL script to assign existing customers to branches:
   ```sql
   UPDATE customers 
   SET branch_id = '[your-main-branch-id]' 
   WHERE branch_id IS NULL;
   ```

2. Make sure customers are created with branch_id going forward (already fixed in code)

### Problem: Customers from wrong branch appearing

**Symptoms:**
```
❌ 5 customers from WRONG branch!
❌ This indicates a filtering problem!
```

**What this means:**
- Branch filtering is NOT working
- Database query is not applying the filter correctly

**Solutions:**
1. Check database permissions
2. Verify `branch_id` column exists in `customers` table
3. Check for database trigger issues
4. Review Supabase RLS policies

### Problem: No customers returned

**Symptoms:**
```
📊 Count Results:
   ✓ Total customers found: 0
   ✓ For branch: [branch-id]
```

**Possible causes:**
1. **No customers in this branch** (legitimate)
2. **All customers missing branch_id** (run SQL fix)
3. **Wrong branch selected** (switch branch)
4. **RLS policies blocking data** (check Supabase permissions)

## 📊 Field Mapping Reference

The code maps these fields from database to app:

| Database Column | App Field | Purpose |
|-----------------|-----------|---------|
| `branch_id` | `branchId` | **CRITICAL** - Used for filtering |
| `is_shared` | `isShared` | Whether customer is shared |
| `created_by_branch_id` | N/A | Metadata (not mapped) |
| `created_by_branch_name` | N/A | Metadata (not mapped) |

## 🎯 Key Debug Points

### Point 1: Branch Filter Applied?

Look for this line during count:
```
🔒 Applying branch filter to count query...
```

And during fetch:
```
🔒 Applying branch filter: branch_id = [branch-id]
```

If you DON'T see these lines, branch filtering is NOT active!

### Point 2: Data Integrity

Check the final summary:
```
✅ All customers belong to the correct branch!
```

This confirms:
- ✅ All customers have `branch_id`
- ✅ All customers match the selected branch
- ✅ No "wrong branch" customers slipped through

### Point 3: Sample Data

Review the sample customers:
```
1. John Doe (+255746605560)
   - Branch: 24cd45b8-1ce1-486a-b055-29d169c3a8ea  ← Should match selected branch
   - Shared: false  ← Should be false for branch-specific customers
```

## 🚀 How to Use This Debug Info

### 1. Open Browser Console (F12)

### 2. Navigate to Customers Page

You'll immediately see:
```
═══════════════════════════════════════════════════════
👥 FETCHING CUSTOMERS - START
═══════════════════════════════════════════════════════
```

### 3. Watch the Logs

Monitor the entire fetch process from start to finish.

### 4. Check the Summary

At the end, verify:
- ✅ Customer count matches expectations
- ✅ All customers have correct branch_id
- ✅ No warnings or errors

### 5. Debug Issues

If something's wrong, the logs will tell you:
- Which step failed
- What the error was
- What data was involved

## 📈 Performance Monitoring

The logs also help you monitor performance:

```
📄 Pagination Setup:
   - Page size: 50 customers per page
   - Total pages: 10
   - Will fetch: 10 pages
```

You can see:
- How many API calls will be made
- How long each page takes
- If pagination is working efficiently

## ✅ Combined with Customer Creation Debug

You now have **complete visibility** into:

1. **Customer Creation** (CUSTOMER-BRANCH-DEBUG-ADDED.md)
   - Branch assignment during creation
   - Database insert verification
   - Branch_id confirmation

2. **Customer Fetching** (This guide)
   - Branch filter application
   - Data retrieval
   - Data integrity verification

Together, these ensure:
- ✅ Customers are created with correct branch
- ✅ Customers are fetched with correct filter
- ✅ Branch isolation works end-to-end

---

**Last Updated:** October 13, 2025  
**File Modified:** `src/lib/customerApi/core.ts`  
**Debug Level:** Comprehensive  
**Production Safe:** Yes (console.log is safe in production)

