# 🧪 BRANCH/STORE INTEGRATION TEST SCRIPT

## ✅ Manual Testing Checklist

This script will guide you through testing the branch/store integration for both User Management and Employee Management.

---

## 📋 Pre-Test Setup

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Login credentials**
   - Email: `care@care.com`
   - Password: `123456`

3. **Ensure you have branches/stores created**
   - Go to Settings → Store Management
   - Create at least 2 branches if none exist

---

## 🧑‍💼 EMPLOYEE MANAGEMENT TESTS

### Test 1: Create Employee with Branch Assignment
1. ✅ Navigate to **Employees** page
2. ✅ Click **"Add Employee"** button
3. ✅ Fill in employee details:
   - First Name: `Test`
   - Last Name: `Employee`
   - Email: `test.employee@example.com`
   - Phone: `+255 123 456 789`
   - Position: `Sales Representative`
   - Department: `Sales`
   - Hire Date: Today's date
   - Salary: `500000`
4. ✅ **Check Branch Selector appears** labeled "Assigned Branch/Store"
5. ✅ Select a branch from dropdown
6. ✅ Verify branch shows with emoji for main branch
7. ✅ Click **"Add Employee"**
8. ✅ Employee should be created successfully

**Expected Result:** ✅ Employee created with branch assignment

---

### Test 2: View Employee List with Branch Column
1. ✅ Stay on **Employees** page
2. ✅ Verify table has **"Branch/Store"** column header
3. ✅ Verify employee row shows:
   - Branch icon (📍)
   - Branch name
   - 🏢 emoji if main branch
4. ✅ Employees without branch show "Unassigned"

**Expected Result:** ✅ Branch information displays correctly in table

---

### Test 3: Filter Employees by Branch
1. ✅ Look for **"Filter by Branch"** dropdown in filters section
2. ✅ Select a specific branch
3. ✅ Verify only employees from that branch are shown
4. ✅ Select "All Branches"
5. ✅ Verify all employees are shown again

**Expected Result:** ✅ Branch filter works correctly

---

### Test 4: Edit Employee and Change Branch
1. ✅ Click **"Edit"** on an employee
2. ✅ Modal opens with employee details
3. ✅ **Branch Selector** shows current branch
4. ✅ Change to a different branch
5. ✅ Click **"Update Employee"**
6. ✅ Verify branch updated in table

**Expected Result:** ✅ Employee branch can be changed

---

### Test 5: Validate Branch is Required
1. ✅ Click **"Add Employee"**
2. ✅ Fill in all required fields EXCEPT branch
3. ✅ Try to submit
4. ✅ Verify error message: "Branch/Store is required"

**Expected Result:** ✅ Validation prevents submission without branch

---

## 👥 USER MANAGEMENT TESTS

### Test 6: View User Management Page
1. ✅ Navigate to **Users** page
2. ✅ Verify page loads successfully
3. ✅ Check if table has users listed

**Expected Result:** ✅ User Management page loads

---

## 🔄 CROSS-FEATURE TESTS

### Test 7: Employee-User Linking with Branches
1. ✅ Go to **Users** page
2. ✅ Click **"User-Employee Links"** button
3. ✅ Link a user to an employee
4. ✅ Verify both have access to same branch

**Expected Result:** ✅ Linked user-employee share branch access

---

### Test 8: Dashboard Branch Context
1. ✅ Go to **Dashboard**
2. ✅ Check if data is filtered by branch (if branch context is active)

**Expected Result:** ✅ Dashboard respects branch context

---

## 🐛 KNOWN ISSUES TO VERIFY FIXED

### Issue 1: Employee Creation Without Branch
- **Before:** Employees could be created without branch assignment
- **After:** ✅ Branch is now required field
- **Test:** Try creating employee without branch

### Issue 2: No Branch Filtering
- **Before:** Could not filter employees by branch
- **After:** ✅ Branch filter dropdown available
- **Test:** Use branch filter

### Issue 3: No Branch Display in Table
- **Before:** Branch assignment not visible
- **After:** ✅ Branch column shows in table with icon
- **Test:** View employee table

---

## 📊 TEST RESULTS SUMMARY

Fill this out as you test:

| Test # | Test Name | Status | Notes |
|--------|-----------|---------|-------|
| 1 | Create Employee with Branch | ⬜ Pass / ⬜ Fail | |
| 2 | View Branch Column | ⬜ Pass / ⬜ Fail | |
| 3 | Filter by Branch | ⬜ Pass / ⬜ Fail | |
| 4 | Edit Employee Branch | ⬜ Pass / ⬜ Fail | |
| 5 | Branch Required Validation | ⬜ Pass / ⬜ Fail | |
| 6 | User Management Page | ⬜ Pass / ⬜ Fail | |
| 7 | Employee-User Linking | ⬜ Pass / ⬜ Fail | |
| 8 | Dashboard Branch Context | ⬜ Pass / ⬜ Fail | |

---

## 🎯 SUCCESS CRITERIA

All tests should pass with:
- ✅ Branch selector appears in forms
- ✅ Branch validation works
- ✅ Branch displays in tables
- ✅ Branch filtering works
- ✅ No console errors
- ✅ No UI glitches

---

## 📝 REPORTING ISSUES

If any test fails, please note:
1. Which test failed
2. What was the expected behavior
3. What actually happened
4. Any error messages in console
5. Screenshots if possible

---

## 🚀 NEXT STEPS AFTER TESTING

Once all tests pass:
1. ✅ Mark this integration as complete
2. ✅ Test in production environment
3. ✅ Update user documentation
4. ✅ Train users on new branch features

