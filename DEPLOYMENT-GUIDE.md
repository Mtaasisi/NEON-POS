# 🚀 Production Deployment Guide

## Overview

Your POS system has **2 parts** that need to be deployed:

1. **Frontend** (React app) → Deploy to Vercel/Netlify/Static hosting
2. **Backend** (Node.js API) → Deploy to Railway/Render/Heroku/etc.

---

## 📦 Part 1: Deploy Backend Server (REQUIRED for SMS)

The backend handles SMS notifications through the `/api/sms-proxy` endpoint.

### Option A: Deploy to Railway (Recommended)

1. **Create account** at [railway.app](https://railway.app)

2. **Create new project** → Deploy from GitHub

3. **Configure the deployment:**
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Port: `8000` (or use Railway's `PORT` env variable)

4. **Set environment variables** in Railway:
   ```
   NODE_ENV=production
   PORT=${{ PORT }}
   ```

5. **Get your backend URL:**
   - Railway will give you: `https://your-app.railway.app`
   - Note this URL - you'll need it for the frontend!

### Option B: Deploy to Render

1. Go to [render.com](https://render.com)
2. Create **New Web Service**
3. Connect your repository
4. Configure:
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
5. Get your URL: `https://your-app.onrender.com`

### Option C: Deploy to Heroku

```bash
cd server
heroku create your-app-name
git push heroku main
```

---

## 🌐 Part 2: Deploy Frontend

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Set environment variables** in Vercel dashboard:
   ```
   VITE_DATABASE_URL=your_neon_database_url
   VITE_API_URL=https://your-backend.railway.app
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

   Or connect your GitHub repo to Vercel dashboard for auto-deploy.

### Deploy to Netlify

1. **Create `netlify.toml`** in project root:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Set environment variables** in Netlify dashboard:
   ```
   VITE_DATABASE_URL=your_neon_database_url
   VITE_API_URL=https://your-backend.railway.app
   ```

3. **Deploy** via Netlify dashboard or CLI

---

## ⚙️ Environment Variables Setup

### Frontend (.env):
```bash
# Your Neon/Supabase database connection
VITE_DATABASE_URL=postgresql://user:password@host/database

# Your deployed backend URL (NOT localhost in production!)
VITE_API_URL=https://your-backend.railway.app
```

### Backend (Railway/Render environment):
```bash
NODE_ENV=production
PORT=8000  # Or use platform's PORT variable
```

---

## 🧪 Testing Your Production Setup

### 1. Test Backend Directly:
```bash
curl https://your-backend.railway.app/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

### 2. Test SMS Endpoint:
```bash
curl -X POST https://your-backend.railway.app/api/sms-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "255700000000",
    "message": "Test",
    "apiUrl": "test",
    "apiKey": "test"
  }'
```

### 3. Test Frontend:
- Open your deployed frontend URL
- Try making a sale
- Check browser console for SMS logs
- Should see: `📱 Sending SMS via MShastra backend proxy...`
- URL should be your production backend (not localhost!)

---

## 🔍 Troubleshooting Production Issues

### SMS Still Shows "localhost:8000" Error

**Problem:** Frontend still trying to reach localhost

**Fix:**
1. Check `.env` file has `VITE_API_URL=https://your-backend.com`
2. Rebuild frontend: `npm run build`
3. Redeploy to Vercel/Netlify
4. Clear browser cache

### "CORS Error" in Production

**Problem:** Backend not allowing frontend origin

**Fix:** Update backend `server/src/index.ts`:
```typescript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-frontend.vercel.app',  // Add your frontend URL
    'https://your-custom-domain.com'     // Add custom domain if any
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

### Backend Crashes/Won't Start

**Check:**
1. Logs in Railway/Render dashboard
2. Ensure `package.json` has `"type": "module"`
3. Ensure all dependencies are installed
4. Check Node.js version (use v18 or v20)

### SMS Not Sending in Production

**Check:**
1. Backend is running and accessible
2. SMS integration configured in your database:
   ```sql
   SELECT * FROM integrations WHERE service_type = 'SMS_GATEWAY';
   ```
3. API credentials are correct
4. Check backend logs for SMS errors

---

## 📊 Architecture in Production

```
┌─────────────────────┐
│   User Browser      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│  Frontend (Vercel)  │────────▶│  Database (Neon)    │
│  your-app.vercel.app│         │  postgresql://...   │
└──────────┬──────────┘         └─────────────────────┘
           │
           │ /api/sms-proxy
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│ Backend (Railway)   │────────▶│  SMS Provider       │
│ your-api.railway.app│         │  (MShastra/etc.)    │
└─────────────────────┘         └─────────────────────┘
```

---

## ✅ Deployment Checklist

### Before Deployment:
- [ ] Backend code tested locally
- [ ] Frontend code tested locally
- [ ] Database migrations run
- [ ] SMS integration configured in database
- [ ] Environment variables prepared

### Backend Deployment:
- [ ] Backend deployed to Railway/Render/Heroku
- [ ] Backend URL noted (e.g., `https://your-api.railway.app`)
- [ ] Health endpoint working: `/health`
- [ ] SMS endpoint working: `/api/sms-proxy`

### Frontend Deployment:
- [ ] `VITE_API_URL` set to backend URL (not localhost!)
- [ ] `VITE_DATABASE_URL` set to Neon database
- [ ] Build successful: `npm run build`
- [ ] Deployed to Vercel/Netlify
- [ ] Frontend accessible via HTTPS

### Post-Deployment Testing:
- [ ] Can log in to the app
- [ ] Can view products
- [ ] Can create a sale
- [ ] SMS notification works (check console/logs)
- [ ] Receipt generation works
- [ ] Database updates correctly

---

## 💡 Pro Tips

1. **Use Railway for backend** - Easiest deployment, free tier available
2. **Use Vercel for frontend** - Auto-deploys on git push, super fast
3. **Keep localhost working** - Don't delete local setup, useful for development
4. **Monitor logs** - Check Railway/Render logs regularly for errors
5. **Set up custom domains** - Use your own domain for professional look

---

## 🆘 Need Help?

If you encounter issues:

1. Check browser console (F12) for frontend errors
2. Check backend logs in Railway/Render dashboard
3. Verify environment variables are set correctly
4. Test each component separately (database → backend → frontend)
5. Ensure HTTPS is used (not HTTP) for production

---

## 🎉 Success!

Once deployed, your app will:
- ✅ Work from any device with internet
- ✅ Send real SMS notifications
- ✅ Scale to handle multiple users
- ✅ Have persistent database storage
- ✅ Support your business 24/7
