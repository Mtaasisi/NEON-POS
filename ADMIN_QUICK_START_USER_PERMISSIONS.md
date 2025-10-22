# Admin Quick Start: User Permissions Management

A simple guide for administrators to quickly create and manage users with permissions.

## 🚀 Quick Start - Create Your First User

### Step 1: Open User Management
1. Navigate to **Users** page from the main menu
2. Click the **"+ Create User"** button in the top right

### Step 2: Enter User Details
Fill in the basic information:
- **First Name**: John
- **Last Name**: Doe  
- **Email**: john.doe@company.com
- **Phone**: +255 123 456 789 (optional)

### Step 3: Select Role
Choose from:
- 🔴 **Admin** - Full system access
- 🟡 **Manager** - Operations + reports  
- 🔵 **Technician** - Repairs + diagnostics
- 🟢 **Customer Care** - Customer support
- ⚪ **User** - Basic access

**The permissions will automatically populate based on the role!**

### Step 4: Review Default Permissions
- Permissions automatically set based on role
- Click **"Show Permissions"** to see what's included
- Default permissions are perfect for most users

### Step 5: Configure Branch Access
Choose one:
- ✅ **Access All Branches** - User can work at any branch
- OR select specific branches from the list

### Step 6: Set Password
- Enter a secure password (minimum 8 characters)
- Confirm the password
- User will use this to login

### Step 7: Create User
- Review the preview
- Click **"Create User"**
- Done! ✅

---

## 🎨 Advanced: Custom Permissions

### When to Use Custom Permissions
- Employee needs access outside their normal role
- Temporary project requires special access
- Unique job position not covered by standard roles

### How to Set Custom Permissions

1. **Create/Edit User**
2. **Toggle "Custom Permissions"** (amber box)
3. **Click "Show Permissions"** to expand the full list
4. **Select/Deselect** permissions as needed
5. **Save**

### Understanding Permission Categories

#### 📊 General Access
Basic system access like Dashboard, POS, Reports

#### 📦 Inventory Management  
Control over products: view, add, edit, delete, adjust stock

#### 👥 Customer Management
Customer records: view, create, edit, delete, view history

#### 🔧 Device & Repair Management
Device repairs, diagnostics, spare parts

#### 💰 Financial Operations
Sales, refunds, discounts, pricing, financial reports

#### 👤 User Management
Create, edit, delete users and manage roles

#### ⚙️ System Administration
Advanced: backups, integrations, database setup

#### ➕ Additional Features
Appointments, WhatsApp, SMS, Loyalty programs

---

## 📋 Common Scenarios

### Scenario 1: Hire a New Sales Person
**Role**: Customer Care
```
✅ What they get automatically:
- Process sales at POS
- View and add customers
- View inventory
- Register devices
- Send SMS/WhatsApp

❌ What they can't do:
- View financial reports
- Delete anything
- Change system settings
- Manage other users
```

### Scenario 2: Promote Employee to Shift Supervisor
**Role**: Start with Technician → Add custom permissions
```
✅ Keep technician permissions
✅ Add: Process Refunds
✅ Add: Apply Discounts
✅ Add: View Reports
```

**How to do it:**
1. Edit the user
2. Enable "Custom Permissions"  
3. Click "Show Permissions"
4. Expand "Financial Operations"
5. Check: Process Refunds, Apply Discounts
6. Expand "General Access"
7. Check: View Reports
8. Save Changes

### Scenario 3: Temporary Access for Inventory Count
**Role**: User → Add temporary inventory permissions
```
✅ Keep basic access
✅ Add: View Inventory
✅ Add: Adjust Stock (for counting)
✅ Add: View Stock History
```

**Remember to revoke after inventory count is complete!**

### Scenario 4: Create an Accountant/Finance User
**Role**: User → Customize for finance work
```
✅ Dashboard
✅ Reports
✅ Financial Reports
✅ View Payments
✅ Process Refunds
❌ No POS access (review only)
❌ No product editing
```

---

## 🎯 Permission Quick Reference

### ⚡ Most Commonly Needed Permissions

| Permission | When to Grant |
|------------|--------------|
| **POS Access** | Anyone who processes sales |
| **Process Refunds** | Supervisors and managers |
| **Apply Discounts** | Authorized sales staff |
| **View Reports** | Anyone who needs to track performance |
| **Financial Reports** | Managers and executives |
| **Adjust Stock** | Inventory staff during stock takes |
| **Add Customers** | Customer-facing staff |
| **Process Sales** | Sales staff at POS |

---

## ✏️ Editing User Permissions

### Quick Edit
1. Go to Users page
2. Click **pencil icon** next to user
3. Make changes
4. Click **"Save Changes"**

### Changing User Permissions
1. Click **"Show Permissions"**
2. Toggle **"Custom Permissions"** if needed
3. Select/deselect permissions
4. **Save Changes**

### Changing User Role
1. Edit user
2. Select new role from dropdown
3. Permissions automatically update (unless using custom)
4. Review changes
5. **Save Changes**

---

## 🔒 Security Best Practices

### ✅ DO:
- Start with the lowest role needed
- Add permissions only when necessary
- Review permissions regularly
- Remove access when employees leave
- Use role defaults when possible
- Document why custom permissions were granted

### ❌ DON'T:
- Give everyone Admin access
- Grant "Full Access" unless truly needed
- Leave permissions unchecked
- Forget to review periodically
- Give financial access to everyone

---

## 🚨 Important Notes

### Full Access Permission
- **Only grant to trusted administrators**
- Gives complete system access
- Can delete data, change settings, manage users
- Cannot be combined with other permissions (it includes everything)

### Custom Permissions
- Override role defaults
- Require manual management
- Don't auto-update when role changes
- Document why they're custom

### Branch Access
- **All Branches**: User can work anywhere
- **Specific Branches**: User limited to assigned locations
- First assigned branch becomes primary branch

---

## 📞 Need Help?

### Permission Not Working?
1. Check if user has the specific permission
2. Verify user's role
3. Check if "Custom Permissions" is enabled
4. Look for "Full Access" - it overrides everything
5. Ensure user is active (not disabled)

### User Can't Access Feature?
1. Open Users page
2. Edit the user
3. Click "Show Permissions"
4. Find the relevant permission category
5. Enable needed permission
6. Save changes
7. User may need to logout/login again

### Role vs Custom Permissions?
- **Role Permissions**: Automatic, standard, easy to manage
- **Custom Permissions**: Manual, specific needs, requires documentation
- **Recommendation**: Use role permissions when possible

---

## 💡 Pro Tips

1. **Start Restrictive**: Give minimal permissions, add more as needed
2. **Document Custom**: Note why custom permissions were granted
3. **Regular Audits**: Review user permissions quarterly
4. **Permission Templates**: Use roles as starting points
5. **Test First**: Create test users to verify permissions work
6. **Training**: Train users on their access levels
7. **Feedback Loop**: Ask users if they need additional access

---

## 🎓 Understanding Roles at a Glance

### Admin 🔴
**Best for**: System administrators, IT staff, business owners
- Full access to everything
- Can create/delete users
- Can change all settings
- Manage all data

### Manager 🟡  
**Best for**: Store managers, department heads, supervisors
- Run daily operations
- View all reports
- Manage inventory
- Process refunds
- Can't change system settings

### Technician 🔵
**Best for**: Repair technicians, service staff
- Register and repair devices
- Run diagnostics
- View customer info
- View inventory
- Limited reports

### Customer Care 🟢
**Best for**: Sales staff, customer service, receptionists
- Process sales
- Manage customers
- Register devices
- Send communications
- Basic reports

### User ⚪
**Best for**: View-only access, trainees, temporary staff
- View dashboard
- View inventory (read-only)
- View customers (read-only)
- Minimal access

---

## ✅ Checklist: Before Creating a User

- [ ] Know their name and email
- [ ] Determined their role
- [ ] Decided on branch access
- [ ] Generated secure password
- [ ] Reviewed default permissions
- [ ] Added any custom permissions needed
- [ ] Documented custom permissions (if any)
- [ ] Ready to share login credentials securely

---

## 📱 Mobile/Quick Access

For quick user creation on mobile:
1. Stick with role defaults
2. Fill minimum required fields
3. Assign "Access All Branches" for simplicity
4. Use generated password
5. Fine-tune permissions later from desktop

---

**Last Updated**: October 22, 2025  
**Feature Version**: 1.0.0  
**Status**: Production Ready ✅

---

## Quick Command Reference

| Task | Action |
|------|--------|
| Create User | Users → + Create User |
| Edit Permissions | Users → Edit (pencil icon) → Show Permissions |
| Change Role | Users → Edit → Select new role |
| Grant Full Access | Show Permissions → Grant Full Access button |
| Custom Permissions | Toggle "Custom Permissions" → Select individual |
| Save Changes | Review → Save Changes button |
| Cancel Changes | Cancel button (prompts if unsaved) |

---

That's it! You're now ready to manage users and permissions like a pro! 🎉

