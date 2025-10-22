# 🚀 Quick Setup Guide

You're seeing errors because two critical components are not configured:

## ❌ Current Issues

1. **Supabase Credentials Missing** - The app can't connect to your database
2. **Backend Server Not Running** - The SMS proxy needs a backend server on port 8000

---

## ✅ Solution: 3-Step Fix

### Step 1: Configure Supabase Credentials

A `.env` file has been created for you at the project root. You need to add your Supabase credentials:

1. **Go to your Supabase Dashboard**: https://app.supabase.com
2. **Select your project** (or create one if you don't have it)
3. **Go to**: Settings → API
4. **Copy** the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbGc...`)

5. **Open the `.env` file** in your project root and replace:
   ```env
   VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL_HERE
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
   ```

   With your actual values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdX...
   ```

---

### Step 2: Setup and Start the Backend Server

The SMS functionality requires a backend server running on port 8000.

**Option A: Quick Start (Recommended)**

Open a **new terminal** and run:

```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE/server"
npm install
npm run dev
```

The server will start on http://localhost:8000

**Option B: Check if Already Running**

If you already have the server running, check:
```bash
lsof -i :8000
```

If nothing is running on port 8000, use Option A above.

---

### Step 3: Configure Server Environment (Optional)

The backend server also needs database credentials. Check if `server/.env` exists:

```bash
cd server
ls -la .env
```

If it doesn't exist, create it:
```bash
cd server
cat > .env << 'EOF'
# Server Configuration
PORT=8000
NODE_ENV=development

# Database (same as your Supabase URL but in Postgres format)
# Get this from Supabase: Settings → Database → Connection String → URI
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# JWT Expiration
JWT_EXPIRES_IN=7d

# CORS Settings
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
EOF
```

Then replace `DATABASE_URL` and `JWT_SECRET` with your actual values.

---

## 🎯 Final Steps

1. **Restart your development server** after updating `.env`:
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **Verify everything works**:
   - ✅ No more Supabase credential errors
   - ✅ Backend server running on port 8000
   - ✅ SMS functionality working

---

## 🐛 Troubleshooting

### "Supabase credentials not configured"
- ✅ Make sure `.env` file exists in project root (NOT in server/)
- ✅ Restart your dev server after updating `.env`
- ✅ Check there are no typos in the environment variable names

### "Could not connect to the server" (port 8000)
- ✅ Make sure backend server is running: `cd server && npm run dev`
- ✅ Check if another process is using port 8000: `lsof -i :8000`
- ✅ If port is in use, kill it: `kill -9 <PID>`

### SMS still not working
- ✅ Configure SMS settings in your app (Settings → Integrations → SMS Gateway)
- ✅ Check server logs for detailed error messages
- ✅ For testing, use phone number starting with `255700` (test mode)

---

## 📝 Quick Verification

After setup, your project should have:

```
POS-main NEON DATABASE/
├── .env                    ← Supabase credentials (frontend)
└── server/
    ├── .env                ← Database & JWT config (backend)
    └── node_modules/       ← Dependencies installed
```

**Both servers should be running:**
- ✅ Frontend: http://localhost:5173 (or 3000)
- ✅ Backend: http://localhost:8000

---

## 🎉 Success!

Once configured:
1. Your app can connect to Supabase database
2. SMS proxy works through your backend server
3. No more console errors!

---

*Need help? Check the server/README.md for more details about the backend API.*

