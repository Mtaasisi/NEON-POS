# 🚀 QUICK FIX: ONE USER TABLE

## ⚡ What's the Problem?
`care@care.com` shows as **admin** in database but appears as **technician** in the app!

**Root Cause:** You have TWO user tables (`users` and `auth_users`) with conflicting data! 😱

---

## ✅ SOLUTION (3 Simple Steps)

### Step 1: Run SQL Migration (2 minutes)
1. Go to your **Neon Dashboard**: https://console.neon.tech
2. Open your database → **SQL Editor**
3. Copy and paste the entire content from: `CONSOLIDATE-TO-ONE-USER-TABLE.sql`
4. Click **Run** ▶️

**What this does:**
- ✅ Adds missing columns to `users` table
- ✅ Migrates data from `auth_users` to `users`
- ✅ Fixes `care@care.com` to be **admin**
- ✅ Sets up proper permissions
- ✅ **DROPS the `auth_users` table** (you'll have only ONE table!)

### Step 2: Restart Your App
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Test Login
1. Go to: http://localhost:5173/login
2. Login with:
   - Email: `care@care.com`
   - Password: `123456`
3. ✅ You should now have **admin** access!

---

## 📊 VERIFY IT WORKED

Run this in Neon SQL Editor to check:

```sql
-- Check care@care.com role
SELECT email, role, permissions, is_active 
FROM users 
WHERE email = 'care@care.com';
```

**Expected Result:**
```
email         | role  | permissions | is_active
--------------|-------|-------------|----------
care@care.com | admin | {all}       | true
```

✅ If you see `admin` - SUCCESS! 🎉

---

## 🎯 WHAT CHANGED?

### Before (2 Tables - Confusing! ❌)
```
users table:       care@care.com → admin
auth_users table:  care@care.com → technician  😵
```

### After (1 Table - Clean! ✅)
```
users table:       care@care.com → admin  🎉
(auth_users ignored or deleted)
```

---

## 🔐 ALL USER CREDENTIALS

After the fix, these users are available:

| Email | Password | Role |
|-------|----------|------|
| **care@care.com** | 123456 | **admin** |
| admin@pos.com | admin123 | admin |
| manager@pos.com | manager123 | manager |
| tech@pos.com | tech123456 | technician |
| care@pos.com | care123456 | customer-care |

---

## 🔄 HOW TO CHANGE USER ROLES (Future)

Always use the **users** table:

```sql
-- Change role to admin
UPDATE users 
SET role = 'admin', permissions = ARRAY['all'], updated_at = NOW()
WHERE email = 'user@example.com';

-- Change role to technician
UPDATE users 
SET role = 'technician', 
    permissions = ARRAY['view_devices', 'update_device_status', 'view_customers'], 
    updated_at = NOW()
WHERE email = 'user@example.com';
```

---

## ⏱️ TOTAL TIME: ~3 minutes

1. Run SQL (1 min)
2. Restart app (1 min)
3. Test login (1 min)

---

## ❓ NEED HELP?

### Issue: Still seeing wrong role
- Clear browser cache: `Ctrl+Shift+Delete` or `Cmd+Shift+Delete`
- Clear localStorage: Open DevTools → Application → Local Storage → Clear All
- Restart dev server

### Issue: Can't login
- Check database connection in Neon dashboard
- Verify the SQL script ran successfully (check for green checkmarks)
- Try different user credentials from table above

---

## 🎉 DONE!

You now have **ONE** user table managing everything!

No more confusion, no more syncing issues, just simple user management! ✨

