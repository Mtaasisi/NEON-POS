# 🔧 FIX LOGIN ISSUE - INSTRUCTIONS

## Problem
You're getting "Invalid login credentials" error when trying to log in.

## Quick Fix

### Option 1: Run the Node.js Diagnostic Script (RECOMMENDED)

This script will:
- Test the database connection
- List all existing users
- Create test users with correct passwords
- Test login for each user
- Give you detailed diagnostics

#### Steps:

1. **Make sure you have your DATABASE_URL configured**
   ```bash
   # Check if .env file exists and has VITE_DATABASE_URL
   cat .env | grep VITE_DATABASE_URL
   ```

2. **Run the diagnostic script**
   ```bash
   node test-login-directly.mjs
   ```

3. **Try logging in with one of the test credentials:**
   - Email: `care@care.com` | Password: `123456` (Admin)
   - Email: `admin@pos.com` | Password: `admin123` (Admin)
   - Email: `tech@pos.com` | Password: `tech123` (Technician)
   - Email: `manager@pos.com` | Password: `manager123` (Manager)

### Option 2: Run SQL Script Manually

If you have direct SQL access to your Neon database:

1. **Connect to your database using psql or Neon SQL Editor**

2. **Run the diagnostic script:**
   ```bash
   psql "YOUR_DATABASE_URL" < diagnose-login-issue.sql
   ```

   Or copy and paste the contents of `diagnose-login-issue.sql` into Neon SQL Editor.

3. **Try logging in with the test credentials above**

## What the Fix Does

1. **Checks if the `users` table exists** and has the correct structure
2. **Lists all existing users** to see what's in the database
3. **Removes any existing test users** to avoid conflicts
4. **Creates fresh test users** with known passwords:
   - care@care.com / 123456 (admin)
   - admin@pos.com / admin123 (admin)
   - tech@pos.com / tech123 (technician)
   - manager@pos.com / manager123 (manager)
5. **Tests the login query** to ensure it works correctly

## Common Issues

### 1. No users in database
**Solution:** The script will create test users for you.

### 2. Password doesn't match
**Solution:** The script deletes and recreates users with correct passwords.

### 3. User is not active (is_active = false)
**Solution:** The script sets `is_active = true` for all test users.

### 4. DATABASE_URL not configured
**Solution:** 
- Create a `.env` file in the project root
- Add your Neon database URL:
  ```
  VITE_DATABASE_URL=postgres://username:password@host/database
  ```

### 5. Table structure mismatch
**Solution:** Check the diagnostic output for table structure issues.

## Verify the Fix

After running the script:

1. **Start your application:**
   ```bash
   npm run dev
   ```

2. **Navigate to the login page:**
   ```
   http://localhost:5173/login
   ```

3. **Try logging in with:**
   - Email: `care@care.com`
   - Password: `123456`

4. **You should see:**
   - ✅ No console errors
   - ✅ Redirected to dashboard
   - ✅ User data loaded in the app

## Debugging

If login still fails after running the script:

1. **Check browser console for errors:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for errors starting with ❌

2. **Check the test script output:**
   - Look for any ❌ markers in the output
   - Check if the login query returned results

3. **Verify database connection:**
   - Make sure `VITE_DATABASE_URL` is correctly set in `.env`
   - Test connection: `node -e "import('@neondatabase/serverless').then(m => new m.Pool({connectionString: process.env.VITE_DATABASE_URL}).query('SELECT 1').then(() => console.log('✅ Connected')))"`

4. **Check the login query in the browser:**
   - Open DevTools Console
   - You should see: `🔐 Attempting login with: { email: '...', password: '...' }`
   - Then: `🔍 Login query result: { result: [...], length: 1 }`
   - If length is 0, the user doesn't exist or password doesn't match

## Still Having Issues?

If you still can't log in after trying these steps:

1. Check that the `supabaseClient.ts` file has the correct login query
2. Verify that the `users` table has all required columns
3. Check for any RLS (Row Level Security) policies blocking access
4. Make sure your Neon database is accessible (not paused or deleted)

## Additional Notes

- The password is stored in **plain text** for development purposes
- In production, you should hash passwords using bcrypt or similar
- Make sure to change default passwords before deploying to production
- The test users have `permissions: ['all']` which gives them full access

---

**Last Updated:** November 8, 2025

