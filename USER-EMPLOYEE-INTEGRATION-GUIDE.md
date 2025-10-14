# User-Employee Integration Guide

## Overview

This guide explains how the user authentication system integrates with the employee management system, enabling:
- ✅ Users to be linked to employee records
- ✅ Attendance tracking via user login
- ✅ Employee self-service features
- ✅ Unified user and employee management

## 📋 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Employees Table
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Relationship**: The `user_id` field in the `employees` table links to the `users` table.

## 🔗 Integration Components

### 1. User-Employee Link API (`src/lib/userEmployeeLinkApi.ts`)

Provides comprehensive functions for managing user-employee relationships:

#### Core Functions:

```typescript
// Check if user has employee record
checkUserEmployeeLink(userId: string): Promise<LinkStatus>

// Link by email matching
linkUserToEmployeeByEmail(email: string): Promise<boolean>

// Link specific user to specific employee
linkUserToEmployee(userId: string, employeeId: string): Promise<boolean>

// Unlink user from employee
unlinkUserFromEmployee(employeeId: string): Promise<boolean>

// Create employee record for user
createEmployeeForUser(userId: string, employeeData: object): Promise<string | null>

// Auto-link all by email
autoLinkAllUserEmployees(): Promise<{linked, skipped, errors}>

// Get all links
getAllUserEmployeeLinks(): Promise<UserEmployeeLink[]>

// Get unlinked users/employees
getUnlinkedUsers(): Promise<any[]>
getUnlinkedEmployees(): Promise<any[]>
```

### 2. User-Employee Link Modal (`src/features/users/components/UserEmployeeLinkModal.tsx`)

A comprehensive UI for managing user-employee links with:

#### Features:
- **Linked Tab**: View all linked user-employee pairs
- **Unlinked Tab**: See users without employee records and vice versa
- **Auto-Link**: Automatically link by matching email addresses
- **Manual Link**: Select specific user and employee to link
- **Create Employee**: Create employee record for existing user
- **Unlink**: Remove user-employee link

### 3. Integration with User Management Page

The User Management page now includes:
- **User-Employee Links** button in the header
- Opens the link management modal
- Refreshes users list when links are updated

## 🚀 Quick Start

### Step 1: Run Database Migration

Execute the SQL migration scripts in this order:

```bash
# 1. Migrate employee schema (if not already done)
psql -d your_database < MIGRATE-EMPLOYEE-SCHEMA.sql

# 2. Link users to employees
psql -d your_database < LINK-USERS-TO-EMPLOYEES.sql

# 3. Fix any missing links
psql -d your_database < FIX-MISSING-EMPLOYEE-LINK.sql
```

### Step 2: Auto-Link Existing Data

1. Navigate to **User Management** page
2. Click **User-Employee Links** button
3. Go to the **Unlinked** tab
4. Click **Run Auto-Link** to automatically link by email

### Step 3: Manual Linking (if needed)

For users/employees that couldn't be auto-linked:

1. In the **Unlinked** tab, use the **Manual Link** section
2. Select a user from the dropdown
3. Select an employee from the dropdown
4. Click **Link**

### Step 4: Create Employee for User (if needed)

If a user doesn't have an employee record:

1. Click **Create Employee** in the modal
2. Select the user
3. Fill in position, department, and optional salary
4. Click **Create Employee**

## 📊 Use Cases

### Use Case 1: New Employee Onboarding

**Scenario**: Hiring a new employee

1. Create user account in User Management
2. Open User-Employee Links modal
3. Create employee record for the user
4. Employee can now log in and use self-service features

### Use Case 2: Existing Employee Gets System Access

**Scenario**: Employee exists but needs user account

1. Create user with same email as employee
2. Run auto-link or manually link them
3. Employee can now log in with their credentials

### Use Case 3: Link Existing Records

**Scenario**: User and employee both exist separately

1. Open User-Employee Links modal
2. Use manual link to connect them
3. System is now synchronized

### Use Case 4: Bulk Migration

**Scenario**: Migrating from old system

1. Import all users
2. Import all employees
3. Run auto-link to match by email
4. Review and manually link any remaining records

## 🔐 Benefits of Integration

### For Attendance System:
- **Automatic Employee Identification**: Users are automatically identified as employees when they log in
- **Self-Service Check-in**: Employees can check in/out using their user credentials
- **Attendance History**: Linked to user for reporting and analytics

### For Employee Self-Service:
- **View Personal Info**: Employees can view their profile
- **Request Leave**: Submit leave requests through the system
- **View Attendance**: See their own attendance history
- **Update Contact Info**: Keep information current

### For Administrators:
- **Unified Management**: Manage users and employees in one place
- **Access Control**: User roles determine employee permissions
- **Reporting**: Generate reports combining user and employee data
- **Audit Trail**: Track who made changes

## 🛠️ Technical Details

### Link Status Check

```typescript
const status = await checkUserEmployeeLink(userId);

if (status.isLinked) {
  // User has employee record
  console.log('Employee ID:', status.employeeId);
} else if (status.hasUser && !status.hasEmployee) {
  // User exists but no employee record
  // Can create employee or link to existing
} else if (!status.hasUser && status.hasEmployee) {
  // Employee exists but no user account
  // Can create user account
}
```

### Auto-Link Process

The auto-link function:
1. Fetches all active users
2. Fetches all employees without user_id
3. Matches by email (case-insensitive)
4. Updates employee records with user_id
5. Returns count of linked, skipped, and errors

### Data Flow

```
User Account (users table)
    ↓
user_id stored in employee record
    ↓
Employee Record (employees table)
    ↓
Can access attendance, leaves, shifts
```

## 📝 SQL Queries

### Check Link Status
```sql
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.position,
    e.department,
    CASE 
        WHEN e.user_id = u.id THEN 'Linked'
        WHEN e.id IS NOT NULL THEN 'Unlinked'
        ELSE 'No Employee'
    END as status
FROM users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.is_active = true
ORDER BY u.created_at DESC;
```

### Find Unlinked Users
```sql
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name
FROM users u
WHERE u.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.user_id = u.id
);
```

### Find Unlinked Employees
```sql
SELECT 
    e.id,
    e.email,
    e.first_name,
    e.last_name,
    e.position,
    e.department
FROM employees e
WHERE e.user_id IS NULL
AND e.status = 'active';
```

### Link by Email
```sql
UPDATE employees e
SET user_id = u.id, updated_at = NOW()
FROM users u
WHERE LOWER(e.email) = LOWER(u.email)
AND e.user_id IS NULL
AND u.is_active = true;
```

## 🔍 Troubleshooting

### Issue: Auto-link not working

**Possible Causes**:
- Email addresses don't match exactly
- Case sensitivity issues
- Extra whitespace in emails

**Solution**:
- Use manual link for these cases
- Clean up email data in database
- Verify email formats

### Issue: User can't access employee features

**Possible Causes**:
- User not linked to employee
- Employee status is inactive

**Solution**:
- Check link status in modal
- Verify employee status is 'active'
- Link user to employee if needed

### Issue: Duplicate employee records

**Possible Causes**:
- Employee created multiple times
- Import errors

**Solution**:
- Identify duplicate by email
- Merge records manually in database
- Keep the one that's linked to user

## 🎯 Best Practices

1. **Always Use Email as Primary Identifier**
   - Ensure emails are unique
   - Use lowercase for consistency
   - Validate email format

2. **Link During User Creation**
   - When creating a user, check for existing employee
   - Auto-link if email matches
   - Create employee if needed

3. **Regular Audits**
   - Periodically check for unlinked accounts
   - Run auto-link process
   - Clean up inactive records

4. **Documentation**
   - Document which users should have employee records
   - Track role-to-position mappings
   - Keep migration logs

5. **Security**
   - Only admins should manage links
   - Validate before unlinking
   - Audit link/unlink actions

## 📚 Related Documentation

- `MIGRATE-EMPLOYEE-SCHEMA.sql` - Database schema migration
- `LINK-USERS-TO-EMPLOYEES.sql` - Linking scripts
- `FIX-MISSING-EMPLOYEE-LINK.sql` - Fix missing links
- `src/services/employeeService.ts` - Employee service API
- `src/lib/userApi.ts` - User API

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review SQL migration logs
3. Examine browser console for errors
4. Check network requests in DevTools

## 🎉 Success!

Your user and employee systems are now integrated! Users can:
- ✅ Log in and be identified as employees
- ✅ Check in/out for attendance
- ✅ Request leaves
- ✅ View their employee information
- ✅ Access employee self-service features

Administrators can:
- ✅ Manage users and employees in one place
- ✅ Link/unlink accounts as needed
- ✅ Generate unified reports
- ✅ Control access via roles

