# 🚀 User Management - Quick Reference

## 🎯 Quick Start (3 Steps)

### 1. Run Database Setup
```sql
-- Execute: SETUP-COMPLETE-USER-MANAGEMENT.sql
-- This adds username, password, permissions support
```

### 2. Go to User Management
```
Navigate to: /user-management
```

### 3. Start Managing!
- Click **"Add User"** to create
- Click **Edit icon** to manage everything

---

## ✨ What You Can Manage

### ✅ When Creating Users:
- First Name & Last Name
- Email Address
- Phone Number
- Role (Admin, Manager, Technician, etc.)
- Department
- **Password** (required, min 8 chars)
- Confirm Password

### ✅ When Editing Users:
- All fields from create
- **Username** (for login)
- **Password Reset** (click "Change Password")
- **Custom Permissions** (10 types available)
- **Active/Inactive Status** (toggle switch)

---

## 🔐 Password Management

### Reset a Password:
1. Edit user
2. Click **"Change Password"**
3. Enter new password (8+ chars)
4. Confirm password
5. Save

**Note:** Leave blank to keep current password

---

## 🛡️ Permissions Available

| Icon | Permission | Who Gets It? |
|------|-----------|--------------|
| ⭐ | All Permissions | Admins only |
| 📦 | Inventory | Managers |
| 👥 | Customers | Managers, Support |
| 📊 | Reports | Managers |
| 👔 | Employees | Managers |
| 🔧 | Devices | Technicians |
| 🔍 | Diagnostics | Technicians, Support |
| ⚙️ | Spare Parts | Technicians |
| 📅 | Appointments | Support |
| 🔒 | Basic Access | Regular users |

**Click any permission card to toggle it on/off!**

---

## 🎨 Visual Indicators

- 🟢 **Green** = Active user
- 🔴 **Red** = Inactive user
- 🔵 **Blue highlight** = Selected permission
- 🟠 **Orange text** = Password will be changed

---

## 💾 Database Columns

| Column | What It Stores |
|--------|----------------|
| `username` | Login username |
| `password` | User password |
| `permissions` | Array of permissions |
| `full_name` | First + Last name |
| `email` | Email address |
| `role` | User role |
| `is_active` | Active/Inactive |
| `phone` | Phone number |
| `department` | Department name |

---

## 🔧 Common Tasks

### Create Admin User
1. Add User
2. Set role to "Administrator"
3. Permissions auto-set to "all"
4. Set strong password
5. Save

### Reset Forgotten Password
1. Find user
2. Edit user
3. Change Password
4. Enter new password
5. Save

### Deactivate User
1. Edit user
2. Toggle Active/Inactive switch to OFF
3. Save

### Change Permissions
1. Edit user
2. Scroll to Permissions section
3. Click permission cards to toggle
4. Watch count update
5. Save

---

## ⚡ Keyboard Shortcuts

- `Esc` - Close modal
- `Tab` - Navigate fields
- `Enter` - Submit form (when focused)

---

## 🐛 Quick Fixes

### Username Missing?
```sql
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
```

### Permissions Empty?
```sql
UPDATE users SET permissions = ARRAY['basic'] WHERE permissions IS NULL;
```

### Can't Save?
- Check all required fields filled
- Verify passwords match
- Check console for errors

---

## 📱 Where to Find Things

### In the App:
- **Main Menu** → User Management
- **Dashboard** → User Management Card

### In Edit Modal:
- **Top** - Active/Inactive toggle
- **Section 1** - User Information (name, email, username, phone)
- **Section 2** - Role & Department
- **Section 3** - Password Reset (click to expand)
- **Section 4** - Permissions (click cards to toggle)
- **Bottom** - User Preview (see all changes)

---

## 🎯 Best Practices

✅ **DO:**
- Use strong passwords
- Review permissions regularly
- Keep usernames unique
- Assign minimal needed permissions
- Deactivate instead of delete

❌ **DON'T:**
- Give everyone admin access
- Use weak passwords
- Leave permissions empty
- Share passwords

---

## 🔒 Security Notes

⚠️ **Development Mode:**
- Passwords stored as plain text
- Suitable for testing only

🔐 **For Production:**
- Implement password hashing (bcrypt)
- Add password complexity rules
- Enable 2FA
- Implement audit logs

---

## 📊 Permission Sets by Role

### Admin
`['all']` - Everything

### Manager
`['inventory', 'customers', 'reports', 'employees']`

### Technician
`['devices', 'diagnostics', 'spare-parts']`

### Customer Care
`['customers', 'diagnostics', 'appointments']`

### User
`['basic']` - Limited access

**You can now customize these!**

---

## 🚀 Files You Got

1. **SETUP-COMPLETE-USER-MANAGEMENT.sql**
   - Database setup script
   - Run once in Neon console

2. **COMPLETE-USER-MANAGEMENT-GUIDE.md**
   - Full detailed guide
   - Read for complete understanding

3. **QUICK-USER-MANAGEMENT-REFERENCE.md** (This File)
   - Quick reference
   - Keep handy for daily use

---

## 💡 Pro Tips

1. **Batch Operations:**
   - Select multiple users
   - Bulk activate/deactivate
   - Bulk delete (be careful!)

2. **Search & Filter:**
   - Use search bar to find users
   - Filter by role
   - Filter by status

3. **Preview Before Save:**
   - Always check the preview section
   - Shows exactly what will be saved
   - Catch mistakes before committing

4. **Username Strategy:**
   - Keep them simple
   - Use first.last format
   - Or firstname only
   - Stay consistent

5. **Permission Strategy:**
   - Start with role defaults
   - Add permissions as needed
   - Remove unnecessary permissions
   - Document special cases

---

## 📞 Need Help?

1. ✅ Check this Quick Reference
2. ✅ Read the Full Guide (COMPLETE-USER-MANAGEMENT-GUIDE.md)
3. ✅ Check browser console for errors
4. ✅ Verify database connection
5. ✅ Test with a simple case first

---

## 🎉 You're All Set!

You now have **complete control** over:
- ✅ Users
- ✅ Passwords  
- ✅ Permissions
- ✅ Usernames
- ✅ Roles
- ✅ Status
- ✅ Everything!

**Happy Managing!** 🚀

