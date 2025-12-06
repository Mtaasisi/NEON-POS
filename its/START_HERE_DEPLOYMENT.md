# 🚀 START HERE - Deploy to Railway

## ✅ Everything is Ready!

Your server is built and ready to deploy. Follow these simple steps:

---

## 📋 Quick Deploy (Option 1 - Automated)

**Open your terminal** (not in Cursor) and run:

```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main
./deploy-to-railway.sh
```

**This script will:**
1. Login to Railway (opens browser)
2. Create a new project
3. Ask for your Supabase Anon Key
4. Set all environment variables
5. Deploy your server
6. Give you the webhook URL

**⚠️ You'll need:** Your Supabase Anon Key (see below)

---

## 📋 Manual Deploy (Option 2 - Step by Step)

If you prefer manual control, open your terminal and run:

### Step 1: Navigate to server directory
```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main/server
```

### Step 2: Login to Railway
```bash
railway login
```
- Opens browser
- Sign in with GitHub or email
- Return to terminal

### Step 3: Initialize project
```bash
railway init
```
- Enter project name: `whatsapp-webhook`
- Railway creates the project

### Step 4: Set environment variables

**First, get your Supabase Anon Key:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings → API**
4. Copy the **"anon public"** key

**Then set variables:**
```bash
# Replace YOUR_ANON_KEY with the actual key you copied
railway variables set VITE_SUPABASE_URL="https://ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech"
railway variables set VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
railway variables set SUPABASE_URL="https://ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech"
railway variables set SUPABASE_ANON_KEY="YOUR_ANON_KEY"
railway variables set NODE_ENV="production"
railway variables set PORT="8000"

# Optional but recommended: Generate webhook secret
railway variables set WHATSAPP_WEBHOOK_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"
```

### Step 5: Deploy
```bash
railway up
```

Deployment takes 1-2 minutes. You'll see:
```
✓ Build completed
✓ Deployment live at https://whatsapp-webhook-production.up.railway.app
```

### Step 6: Get your URL
```bash
railway domain
```

Your webhook URL is:
```
https://YOUR-APP.up.railway.app/api/whatsapp/webhook
```

---

## 🔑 Finding Your Supabase Anon Key

**Method 1: Supabase Dashboard**
1. Visit: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon in sidebar)
4. Click **API**
5. Copy the **"anon public"** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**Method 2: Check your .env file**
Look in your project's `.env` file for:
```
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**⚠️ Important:** Use the **anon** (public) key, NOT the service_role (secret) key!

---

## 🧪 Test Your Deployment

### 1. Test Health Check

Open your terminal and run:
```bash
# Replace with your actual Railway URL
curl https://YOUR-APP.up.railway.app/api/whatsapp/webhook/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "environment": "production",
  "supabaseConfigured": true
}
```

### 2. Configure Webhook in WasenderAPI

**Option A: Automatic**
```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main
node setup-whatsapp-webhook.mjs
```
Enter your Railway URL when prompted.

**Option B: Manual**
1. Go to https://wasenderapi.com/dashboard
2. Select your session
3. Go to Settings
4. Enter webhook URL: `https://YOUR-APP.up.railway.app/api/whatsapp/webhook`
5. Select events to subscribe to
6. Save

### 3. Send Test Message

1. Send a WhatsApp message to your business number
2. Check database:
```sql
SELECT * FROM whatsapp_incoming_messages 
ORDER BY created_at DESC LIMIT 5;
```

3. Check Railway logs:
```bash
railway logs --tail
```

Should see:
```
📨 Webhook Event: messages.received
💬 Incoming Message: { from: '255...' }
✅ Incoming message stored successfully
```

---

## 📊 Monitor Your Deployment

### View Logs
```bash
railway logs --tail
```

### Open Dashboard
```bash
railway open
```

### Check Status
```bash
railway status
```

### View Variables
```bash
railway variables
```

---

## 🆘 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"

Already fixed! ✅ Package was installed.

### "VITE_SUPABASE_ANON_KEY is not set"

Set it:
```bash
railway variables set VITE_SUPABASE_ANON_KEY="your-actual-key"
railway restart
```

### "Health check fails"

1. Check logs: `railway logs`
2. Verify environment variables: `railway variables`
3. Check Supabase connection in Railway dashboard

### Deployment stuck

```bash
# Cancel and redeploy
Ctrl+C
railway up
```

---

## ✅ Deployment Checklist

Before deploying:
- [x] Server built successfully
- [x] Dependencies installed
- [x] Database tables created
- [x] Railway CLI installed

During deployment:
- [ ] Railway login successful
- [ ] Project initialized
- [ ] Supabase anon key obtained
- [ ] All environment variables set
- [ ] Deployment successful
- [ ] Got public URL

After deployment:
- [ ] Health check passing
- [ ] Webhook configured in WasenderAPI
- [ ] Test message sent
- [ ] Message appears in database

---

## 🎯 Quick Reference

**Project Location:**
```
/Users/mtaasisi/Downloads/NEON-POS-main/server
```

**Database:**
```
https://ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech
```

**Webhook Endpoint (after deployment):**
```
https://YOUR-APP.up.railway.app/api/whatsapp/webhook
```

**Health Check:**
```
https://YOUR-APP.up.railway.app/api/whatsapp/webhook/health
```

---

## 🎉 Ready to Deploy!

**Choose one:**

**Option 1 (Easy):** Run automated script
```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main
./deploy-to-railway.sh
```

**Option 2 (Manual):** Follow step-by-step commands above

**After deployment:** Configure webhook and test!

---

## 📖 More Help

- `RAILWAY_DEPLOYMENT_STEPS.md` - Detailed step-by-step guide
- `PRODUCTION_DEPLOYMENT.md` - Complete deployment documentation
- `WEBHOOK_QUICK_START.md` - Quick reference

---

**🚀 Let's deploy!** Open your terminal and start! 

Need the Supabase anon key first? Check the "Finding Your Supabase Anon Key" section above.

