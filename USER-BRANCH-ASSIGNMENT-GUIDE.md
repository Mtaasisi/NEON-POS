# 🏪 User Branch Assignment - Complete Guide

## 🎯 Overview

You can now assign users to specific branches/stores and control their access! This feature allows you to:

- ✅ Assign users to one or more branches
- ✅ Give users access to all branches
- ✅ Restrict users to only their assigned branches
- ✅ Set a primary branch for each user
- ✅ Control branch-level permissions

---

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Database (30 seconds)

1. Open your Neon database console
2. Copy and paste the contents of `SETUP-USER-BRANCH-ASSIGNMENTS.sql`
3. Run it
4. ✅ Done! You'll see a summary of branches and assignments

### Step 2: Start Your Application

```bash
npm run dev
```

### Step 3: Test the Feature

1. Login as `care@care.com` (password: `123456`)
2. Navigate to **Users** page (from the sidebar or `/users`)
3. Click **"Add User"** or **Edit** an existing user
4. Scroll to the **"Branch Access"** section
5. Try both options:
   - **Access All Branches** - User can see/manage all stores
   - **Assign Specific Branches** - Select which branches they can access

---

## 📋 Feature Details

### 1. Access All Branches Option

When enabled:
- ✅ User can access and view data from ALL branches
- ✅ Perfect for administrators and regional managers
- ✅ No specific branch assignments needed
- ✅ Automatically adapts when new branches are added

**Use Case**: Admin users who need to oversee all locations

### 2. Specific Branch Assignment

When disabled:
- ✅ Select which branches the user can access
- ✅ Multiple branch selection supported
- ✅ First selected branch becomes the primary branch
- ✅ User only sees data from their assigned branches

**Use Case**: Store managers, branch-specific staff

---

## 🎨 User Interface

### Creating a New User

When you create a new user, you'll see:

```
┌─────────────────────────────────────────┐
│  🏢 Branch Access                       │
├─────────────────────────────────────────┤
│                                         │
│  ☑️ Access All Branches                 │
│  User can access and manage all         │
│  branches/stores                        │
│                                         │
├─────────────────────────────────────────┤
│  Assigned Branches                      │
│  ┌───────────────────────────────────┐  │
│  │ ☑️ 📍 Main Store              🟢   │  │
│  │    Dar es Salaam • MAIN            │  │
│  │                                    │  │
│  │ ☐  📍 Downtown Branch              │  │
│  │    Dar es Salaam • DT              │  │
│  │                                    │  │
│  │ ☐  📍 Uptown Branch                │  │
│  │    Dar es Salaam • UT              │  │
│  └───────────────────────────────────┘  │
│  Selected: 1 branch(es)                 │
└─────────────────────────────────────────┘
```

### Editing an Existing User

When you edit a user:
- ✅ Their current branch assignments are automatically loaded
- ✅ You can add or remove branch assignments
- ✅ Changes are saved immediately when you click "Save Changes"
- ✅ Primary branch (first selected) is highlighted

---

## 💾 Database Structure

### user_branch_assignments Table

```sql
CREATE TABLE user_branch_assignments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  branch_id UUID REFERENCES store_locations(id),
  is_primary BOOLEAN,              -- First/main branch for user
  can_manage BOOLEAN,               -- Can manage branch
  can_view_reports BOOLEAN,         -- Can view branch reports
  can_manage_inventory BOOLEAN,     -- Can manage inventory
  can_manage_staff BOOLEAN,         -- Can manage staff
  assigned_at TIMESTAMP,
  assigned_by UUID                  -- Who assigned this
);
```

---

## 🔄 How It Works

### When Creating a User:

1. User fills in basic information (name, email, role, etc.)
2. In "Branch Access" section:
   - If **"Access All Branches"** is checked → No assignments created (user has full access)
   - If **specific branches** are selected → Assignments are created for each selected branch
3. First selected branch becomes the primary branch (`is_primary = true`)
4. User can immediately login and see data from their assigned branches

### When Editing a User:

1. System loads user's current branch assignments
2. Shows them in the UI (checkboxes are pre-selected)
3. You can:
   - Add more branches
   - Remove branches
   - Toggle "Access All Branches"
4. When saved:
   - All old assignments are removed
   - New assignments are created based on selections

### When User Logs In:

1. System checks if user is admin → Full access to all branches
2. System checks `user_branch_assignments` table
3. If assignments exist → User sees only data from assigned branches
4. If no assignments → User has access to all branches (default behavior)

---

## 🧪 Testing Guide

### Test 1: Create User with All Branch Access

1. Navigate to Users page
2. Click "Add User"
3. Fill in:
   - First Name: `Test`
   - Last Name: `AllBranches`
   - Email: `test.all@example.com`
   - Password: `12345678`
   - Role: `Manager`
4. In "Branch Access":
   - ✅ Check "Access All Branches"
5. Click "Create User"
6. ✅ **Expected Result**: User created, can access all branches

### Test 2: Create User with Specific Branches

1. Navigate to Users page
2. Click "Add User"
3. Fill in:
   - First Name: `Test`
   - Last Name: `Specific`
   - Email: `test.specific@example.com`
   - Password: `12345678`
   - Role: `Technician`
4. In "Branch Access":
   - ❌ Uncheck "Access All Branches"
   - ✅ Select "Main Store"
   - ✅ Select "Downtown Branch"
5. Click "Create User"
6. ✅ **Expected Result**: User created, assigned to 2 branches

### Test 3: Edit User Branch Assignments

1. Navigate to Users page
2. Click "Edit" on any existing user
3. Scroll to "Branch Access"
4. Change the selections:
   - Add a branch
   - Remove a branch
   - OR toggle "Access All Branches"
5. Click "Save Changes"
6. ✅ **Expected Result**: Changes saved successfully
7. Edit the user again to verify changes persisted

### Test 4: Verify Branch Filtering

1. Login as a user with limited branch access
2. Navigate to different sections (Customers, Sales, Products, etc.)
3. ✅ **Expected Result**: Only data from assigned branches is visible
4. Check the branch selector dropdown
5. ✅ **Expected Result**: Only assigned branches appear in the list

---

## 📊 Database Verification Queries

### Check User Branch Assignments

```sql
SELECT 
  u.email,
  u.role,
  sl.name as branch_name,
  sl.code as branch_code,
  uba.is_primary,
  uba.can_manage,
  uba.can_view_reports
FROM user_branch_assignments uba
JOIN users u ON uba.user_id = u.id
JOIN store_locations sl ON uba.branch_id = sl.id
ORDER BY u.email, uba.is_primary DESC;
```

### Check Users with All Branch Access

```sql
SELECT 
  u.email,
  u.role,
  u.is_active,
  COUNT(uba.id) as branch_assignments
FROM users u
LEFT JOIN user_branch_assignments uba ON u.id = uba.user_id
GROUP BY u.id, u.email, u.role, u.is_active
HAVING COUNT(uba.id) = 0
   OR u.role = 'admin';
```

### Check Branch Usage

```sql
SELECT 
  sl.name as branch_name,
  sl.code,
  COUNT(uba.user_id) as assigned_users
FROM store_locations sl
LEFT JOIN user_branch_assignments uba ON sl.id = uba.branch_id
GROUP BY sl.id, sl.name, sl.code
ORDER BY assigned_users DESC;
```

---

## 🎯 Use Cases

### Scenario 1: Multi-Store Retail Chain

**Setup**:
- Main Store (headquarters)
- 3 Branch stores (Downtown, Uptown, Mall)

**User Assignments**:
- **CEO** → Access All Branches ✅
- **Regional Manager** → Access All Branches ✅
- **Downtown Manager** → Downtown Branch only
- **Uptown Manager** → Uptown Branch only
- **Mall Manager** → Mall Branch only
- **Roaming Technician** → Main Store + Downtown + Uptown

### Scenario 2: Service Center Network

**Setup**:
- Main Service Center
- Express Service Points (3 locations)

**User Assignments**:
- **Admin** → Access All Branches ✅
- **Service Manager** → Main Service Center + Express Point 1
- **Technician A** → Main Service Center only
- **Technician B** → Express Point 2 + Express Point 3

### Scenario 3: Franchise Model

**Setup**:
- Corporate Office
- Franchise Location A
- Franchise Location B

**User Assignments**:
- **Corporate Admin** → Access All Branches ✅
- **Franchise Owner A** → Franchise A only
- **Franchise Owner B** → Franchise B only
- **Corporate Auditor** → Access All Branches ✅

---

## 🐛 Troubleshooting

### Issue 1: Branch assignments not showing

**Solution**:
1. Check if `user_branch_assignments` table exists
2. Run the setup SQL script: `SETUP-USER-BRANCH-ASSIGNMENTS.sql`
3. Verify store_locations table has data

### Issue 2: User can't see any data after assignment

**Possible Causes**:
- No branches assigned AND "Access All" is disabled
- Assigned branches have no data
- User account is inactive

**Solution**:
1. Edit the user
2. Either:
   - Enable "Access All Branches", OR
   - Assign at least one active branch
3. Save changes

### Issue 3: Changes not saving

**Solution**:
1. Check browser console for errors
2. Verify database connection
3. Check if user has permissions to modify user_branch_assignments table
4. Try refreshing the page and retrying

### Issue 4: All users see all branches

**Possible Cause**: BranchContext not filtering properly

**Solution**:
1. Check if user has role = 'admin' (admins see all)
2. Verify assignments exist in database
3. Clear localStorage and re-login

---

## 📚 API Reference

### Get User Branch Assignments
```typescript
import { getUserBranchAssignments } from '@/lib/userBranchApi';

const assignments = await getUserBranchAssignments(userId);
// Returns: UserBranchAssignment[]
```

### Assign User to Branches
```typescript
import { bulkAssignUserToBranches } from '@/lib/userBranchApi';

const branchAssignments = [
  { branch_id: 'branch-1-id', is_primary: true },
  { branch_id: 'branch-2-id', is_primary: false }
];

await bulkAssignUserToBranches(userId, branchAssignments, adminUserId);
```

### Get All Branches
```typescript
import { getAllBranches } from '@/lib/userBranchApi';

const branches = await getAllBranches();
// Returns: Branch[]
```

### Check if User Has All Branch Access
```typescript
import { userHasAccessToAllBranches } from '@/lib/userBranchApi';

const hasAllAccess = await userHasAccessToAllBranches(userId);
// Returns: boolean
```

---

## 🎉 Summary

You now have a complete user branch assignment system! Users can:

- ✅ Be assigned to specific branches
- ✅ Have access to all branches
- ✅ See only data from their assigned branches
- ✅ Have a primary branch set automatically
- ✅ Have granular permissions per branch

The system is production-ready and fully integrated with your existing user management!

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify database setup using the verification queries
3. Check browser console for error messages
4. Review the API reference for proper usage

---

**Created**: October 13, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

