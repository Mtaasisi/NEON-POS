# Employee-User-Branch Relationship Guide

## 🎯 Overview

Your POS system now has a **complete 3-way relationship** between Employees, Users, and Branches with proper database structure and management.

---

## 📊 Database Structure

### 1. **Employees Table**
```sql
employees (
    id UUID PRIMARY KEY,
    user_id UUID → REFERENCES users(id),      -- Link to user account
    branch_id UUID → REFERENCES store_locations(id),  -- Home branch
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR UNIQUE,
    position VARCHAR,
    department VARCHAR,
    status VARCHAR,
    ...
)
```

### 2. **Users Table**
```sql
users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE,
    full_name VARCHAR,
    role VARCHAR,  -- admin, manager, technician, etc.
    access_all_branches BOOLEAN,  -- Can access all branches?
    is_active BOOLEAN,
    ...
)
```

### 3. **User-Branch Assignments Table** (Many-to-Many)
```sql
user_branch_assignments (
    id UUID PRIMARY KEY,
    user_id UUID → REFERENCES users(id),
    branch_id UUID → REFERENCES store_locations(id),
    is_primary BOOLEAN,
    can_manage BOOLEAN,
    can_view_reports BOOLEAN,
    can_manage_inventory BOOLEAN,
    can_manage_staff BOOLEAN,
    assigned_at TIMESTAMP,
    assigned_by UUID,
    UNIQUE(user_id, branch_id)
)
```

### 4. **Store Locations Table**
```sql
store_locations (
    id UUID PRIMARY KEY,
    name VARCHAR,
    code VARCHAR,
    city VARCHAR,
    is_main BOOLEAN,
    is_active BOOLEAN,
    data_isolation_mode VARCHAR,  -- shared, isolated, hybrid
    share_products BOOLEAN,
    share_customers BOOLEAN,
    share_inventory BOOLEAN,
    ...
)
```

---

## 🔗 Relationship Flow

### **Relationship Types:**

```
EMPLOYEES ←→ USERS (One-to-One, Optional)
    ├─ One employee can link to one user account
    └─ One user can link to one employee record

EMPLOYEES → BRANCHES (Many-to-One, Required)
    ├─ Each employee belongs to ONE home branch
    └─ One branch can have MANY employees

USERS ←→ BRANCHES (Many-to-Many, Optional)
    ├─ One user can access MULTIPLE branches
    └─ One branch can be accessed by MULTIPLE users
```

---

## 🛠️ How to Use

### **Step 1: Create a Branch/Store**
1. Go to **Settings → Store & Branch Management**
2. Click **"Add Store"**
3. Fill in branch details
4. Configure data isolation settings
5. Save

### **Step 2: Create a User Account**
1. Go to **User Management**
2. Click **"Add User"**
3. Fill in user details:
   - First Name, Last Name
   - Email (must match employee if linking)
   - Role (admin, manager, technician, etc.)
4. **Configure Branch Access:**
   - ✅ **Access All Branches** - User can access all stores
   - OR **Assign Specific Branches** - Select which branches user can access
5. Save user

### **Step 3: Create an Employee**
1. Go to **Employee Management**
2. Click **"Add Employee"**
3. Fill in employee details
4. **Assigned Branch/Store** - Select home branch (Required)
5. **Link to User Account** - Select user account (Optional)
   - If linked, employee can log in to the system
   - If not linked, employee is just a record
6. Save employee

---

## 💡 Use Cases

### **Use Case 1: Store Manager**
```
1. Create User Account:
   - Name: John Doe
   - Role: Manager
   - Access All Branches: NO
   - Assigned Branches: Branch A, Branch B

2. Create Employee Record:
   - Name: John Doe
   - Email: john@store.com
   - Position: Store Manager
   - Assigned Branch: Branch A (home branch)
   - Link to User: John Doe

Result: John can log in and access Branch A & B, but his employee record is in Branch A
```

### **Use Case 2: Admin**
```
1. Create User Account:
   - Name: Jane Admin
   - Role: Admin
   - Access All Branches: YES

2. Create Employee Record:
   - Name: Jane Admin
   - Position: System Administrator
   - Assigned Branch: Main Store
   - Link to User: Jane Admin

Result: Jane can access all branches, employee record is in Main Store
```

### **Use Case 3: Branch-Specific Employee**
```
1. Create User Account:
   - Name: Mike Cashier
   - Role: User
   - Access All Branches: NO
   - Assigned Branches: Branch C only

2. Create Employee Record:
   - Name: Mike Cashier
   - Position: Cashier
   - Assigned Branch: Branch C
   - Link to User: Mike Cashier

Result: Mike can only access Branch C for both login and work
```

### **Use Case 4: Employee Without Login**
```
Create Employee Record ONLY:
   - Name: Sarah Worker
   - Position: Part-time Staff
   - Assigned Branch: Branch D
   - Link to User: None

Result: Sarah appears in employee records but cannot log in to the system
```

---

## 🔐 Permission Levels

### **Branch Access (Set in User Management):**
- **Access All Branches**: User can access every branch in the system
- **Specific Branches**: User can only access selected branches
- **Per-Branch Permissions**: Can manage, view reports, manage inventory, manage staff

### **Data Isolation (Set in Branch Settings):**
- Each branch can configure what data it shares:
  - Products & Catalog
  - Customers
  - Inventory
  - Suppliers
  - Categories
  - Employees

---

## 📋 Management Workflow

### **Admin Creates Everything:**

1. **Setup Branches First**
   ```
   Settings → Store & Branch Management → Add Store
   ```

2. **Create User Accounts**
   ```
   User Management → Add User
   └─ Configure branch access
   └─ Set role and permissions
   ```

3. **Create Employee Records**
   ```
   Employee Management → Add Employee
   └─ Assign to home branch
   └─ Link to user account (optional)
   ```

### **What Admins Control:**

✅ **In User Management:**
- Which branches a user can access
- User's system role
- User's permissions
- Whether user has access to all branches

✅ **In Employee Management:**
- Employee's home branch
- Employee's work details
- Link employee to user account

✅ **In Branch Settings:**
- What data branches share
- Branch isolation configuration
- Global isolation rules

---

## 🔍 Key Benefits

### **Flexibility:**
- ✅ Employees can work at one branch but access multiple branches (if user account allows)
- ✅ Users can access branches without being an employee
- ✅ Employees can exist without user accounts (records only)
- ✅ Each branch can have different data isolation settings

### **Security:**
- ✅ Branch access controlled at user level
- ✅ Role-based permissions
- ✅ Data isolation per branch
- ✅ Audit trail for assignments

### **Scalability:**
- ✅ Easy to add/remove branch access
- ✅ Move employees between branches
- ✅ Configure per-branch permissions
- ✅ Manage multiple stores independently

---

## 🚀 Setup Instructions

### **1. Run Database Migration**
```bash
# Execute the SQL file in your database
psql -d your_database -f SETUP-EMPLOYEE-USER-BRANCH-RELATIONSHIP.sql
```

### **2. Verify Setup**
The migration will:
- ✅ Add `branch_id` to employees table
- ✅ Create `user_branch_assignments` table
- ✅ Add `access_all_branches` to users table
- ✅ Create helper functions
- ✅ Set admins to access all branches

### **3. Configure Existing Data**
1. Assign branches to existing employees
2. Link employees to user accounts (by email matching)
3. Configure user branch access

---

## 📱 User Interface

### **1. User Management Page**
- ✅ Create/Edit users
- ✅ Assign branches to users
- ✅ Toggle "Access All Branches"
- ✅ See which branches user can access

### **2. Employee Management Page**
- ✅ Create/Edit employees
- ✅ Assign home branch
- ✅ Link to user account
- ✅ See employee's branch assignment

### **3. Store Management Page**
- ✅ Configure branch isolation settings
- ✅ Set what data branches share
- ✅ See employees per branch
- ✅ Global isolation controls

---

## ✅ Complete!

Your system now has a **proper 3-way relationship** between:
- 👥 **Employees** (work records)
- 🔐 **Users** (system access)
- 🏪 **Branches** (locations)

Each can be managed independently while maintaining proper connections! 🎉

