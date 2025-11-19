# 🔧 CORS Error - Quick Fix Guide

## ⚡ Quick Start (3 Steps)

### 1️⃣ Create `.env` file

```bash
# In your project root, create .env file
echo 'VITE_DATABASE_URL=your_neon_connection_string_here' > .env
echo 'NODE_ENV=development' >> .env
echo 'VITE_APP_ENV=development' >> .env
```

**Replace `your_neon_connection_string_here` with:**
- Go to https://console.neon.tech
- Select your project → "Connection Details"
- **Enable "Pooled connection"** (recommended for browsers)
- Copy the connection string

### 2️⃣ Test Connection

```bash
npm run check:db
```

Look for: `✅ Connection successful!`

### 3️⃣ Restart Dev Server

```bash
npm run dev
```

## ✅ Success Indicators

Open browser console (F12) and look for:
```
✅ Using WebSocket-based connection (browser-compatible)
✅ Neon SQL client created successfully
```

No more CORS errors! 🎉

---

## ❌ Still Having Issues?

### Quick Fixes:

**Issue: "DATABASE_URL is not configured"**
- Check your `.env` file exists
- Make sure it has `VITE_DATABASE_URL` (with VITE_ prefix)
- Restart dev server

**Issue: Still seeing CORS errors**
- Use the **pooled connection string** (port 6543) from Neon
- Enable "Pooled connection" in Neon dashboard → Connection Details
- Restart dev server

**Issue: "Connection test failed"**
- Database might be paused - check Neon dashboard
- Verify connection string is correct (copy-paste from Neon)
- Check internet connection

---

## 📖 Need More Help?

For detailed solutions and troubleshooting:
- **Read**: `CORS_FIX_SUMMARY.md` (step-by-step guide)
- **Read**: `CORS_FIX_GUIDE.md` (all solutions explained)
- **Run**: `npm run check:db` (diagnostic tool)

---

## 🎯 What Was The Problem?

Your app was trying to connect directly to Neon's HTTP API from the browser, which is blocked by CORS security policies.

**The Fix:**
We updated the code to use WebSocket connections instead, which work in browsers without CORS issues.

**File Changed:**
- `src/lib/supabaseClient.ts` - Now uses WebSocket when available

---

## 🚀 Production Tips

For production deployments:
- ✅ Deploy on Vercel, Netlify, or Cloudflare Workers
- ✅ Or use a backend API proxy
- ❌ Don't use direct database connections from browser in production

---

**That's it! Your CORS errors should now be fixed.** 🎉

If you still need help, read the detailed guides mentioned above.

