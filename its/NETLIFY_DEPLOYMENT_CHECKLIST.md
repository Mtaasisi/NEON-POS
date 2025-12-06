# ✅ Netlify WhatsApp Webhook - Deployment Checklist

## 🎯 Quick Deployment Guide

### Option 1: Automated Script (Recommended)

```bash
./deploy-netlify-webhook.sh
```

This script will:
- ✅ Install function dependencies
- ✅ Build your project
- ✅ Deploy to Netlify
- ✅ Guide you through next steps

---

### Option 2: Manual Deployment

#### Step 1: Install Function Dependencies
```bash
cd netlify/functions
npm install
cd ../..
```

#### Step 2: Build Project
```bash
npm run build:prod
```

#### Step 3: Deploy to Netlify

**Via Netlify CLI:**
```bash
# Install CLI (if not installed)
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

**Via Git (if connected):**
```bash
git add netlify/ netlify.toml
git commit -m "Add Netlify WhatsApp webhook"
git push
# Netlify will auto-deploy
```

**Via Netlify Dashboard:**
1. Go to https://app.netlify.com
2. Select your site
3. Go to **Deploys** tab
4. Click **Trigger deploy** → **Deploy site**
5. Or drag & drop your `dist` folder

---

## 🔐 Critical: Set Environment Variables

**After deployment, you MUST set these in Netlify:**

1. Go to: **Netlify Dashboard** → Your Site → **Site Settings** → **Environment Variables**

2. Add these 2 variables:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Find your Supabase credentials:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL** → `VITE_SUPABASE_URL`
     - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

4. **Redeploy after adding variables:**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

---

## 🔗 Configure Webhook in WasenderAPI

**This is the MOST IMPORTANT step!**

### Step 1: Get Your Webhook URL

After deployment, your webhook URL is:
```
https://YOUR-SITE-NAME.netlify.app/api/whatsapp/webhook
```

**To find your site name:**
- Netlify Dashboard → Your Site → **Site Settings** → **General**
- Look for **Site name** or check the URL

### Step 2: Configure in WasenderAPI

1. **Go to:** https://wasenderapi.com/whatsapp/37637/edit
   (Replace `37637` with your session ID if different)

2. **Find Webhook Settings:**
   - Look for **"Webhook URL"** or **"Webhook URL (POST)"** field
   - Usually in a **"Webhook"** tab or **"Settings"** section

3. **Enter Your Netlify Webhook URL:**
   ```
   https://YOUR-SITE-NAME.netlify.app/api/whatsapp/webhook
   ```

4. **Enable Events:**
   Check these boxes (or select "All Events"):
   - ✅ `messages.received` ← **MOST IMPORTANT!**
   - ✅ `messages.upsert` ← **ALSO IMPORTANT!**
   - ✅ `messages.update` (for delivery status)
   - ✅ `messages.reaction` (for emoji reactions)
   - ✅ `call.received` (for incoming calls)
   - ✅ `poll.results` (for poll responses)

5. **Enable Webhook:**
   - Turn **ON** the "Enable Webhook" toggle/switch
   - Or check the "Webhook Enabled" checkbox

6. **Save Changes:**
   - Click **"Save"** or **"Update"** button

---

## 🧪 Testing Your Webhook

### Test 1: Health Check

Open in browser:
```
https://YOUR-SITE-NAME.netlify.app/api/whatsapp/webhook
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "timestamp": "2025-01-XX...",
  "environment": "production",
  "message": "WhatsApp webhook endpoint is active",
  "supabase_configured": true
}
```

**If `supabase_configured: false`:**
- Check environment variables in Netlify dashboard
- Redeploy after adding variables

---

### Test 2: Send Test Message

1. **From your phone**, send a WhatsApp message to your business number:
   ```
   "Testing Netlify webhook - hello!"
   ```

2. **Wait 10-15 seconds**

3. **Check Netlify Function Logs:**
   - Go to Netlify Dashboard → Your Site → **Functions** tab
   - Click on `whatsapp-webhook`
   - Check **Logs** for:
     ```
     📨 WhatsApp Webhook Event: { event: 'messages.received', ... }
     ✅ Incoming message stored successfully
     ```

4. **Check Your App:**
   - Go to WhatsApp Inbox in your app
   - Your test message should appear!

---

## 🔍 Verify Setup

Run the diagnostic tool:

```bash
node check-netlify-webhook.mjs
```

This checks:
- ✅ Function file exists
- ✅ Netlify configuration
- ✅ Dependencies installed
- ⚠️  Environment variables (set in Netlify dashboard)

---

## ❓ Troubleshooting

### Problem: Webhook returns 404

**Solutions:**
- Make sure you deployed after adding the function
- Check that `netlify.toml` has the redirect rule
- Verify the function exists in `netlify/functions/whatsapp-webhook.js`
- Check Netlify Dashboard → **Functions** tab to see if function is deployed

---

### Problem: `supabase_configured: false`

**Solutions:**
1. Go to Netlify Dashboard → **Site Settings** → **Environment Variables**
2. Verify these are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Redeploy** after adding variables:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

---

### Problem: Messages not appearing in database

**Checklist:**
1. ✅ Webhook URL configured in WasenderAPI?
2. ✅ Events enabled (`messages.received`, `messages.upsert`)?
3. ✅ Webhook enabled toggle is ON?
4. ✅ Supabase credentials correct?
5. ✅ Environment variables set in Netlify?
6. ✅ Database tables exist? (Run migrations if needed)

**Check Netlify Function Logs:**
- Go to Netlify Dashboard → **Functions** → `whatsapp-webhook` → **Logs**
- Look for error messages
- Check for database connection errors

---

### Problem: Function timeout

**Solution:**
- Netlify functions have a 10-second timeout on free tier
- The function returns 200 immediately and processes async
- If processing takes longer, consider upgrading Netlify plan
- Check logs to see if processing completes

---

## 📊 Monitoring

### View Function Logs

1. Go to Netlify Dashboard
2. Select your site
3. Click **Functions** tab
4. Click on `whatsapp-webhook`
5. View **Logs** or **Real-time logs**

### Check Function Invocations

- Netlify Dashboard → **Functions** → `whatsapp-webhook` → **Analytics**
- See number of invocations, errors, and execution time

---

## ✅ Final Checklist

Before considering it complete, verify:

- [ ] Function dependencies installed (`npm install` in `netlify/functions/`)
- [ ] Project built successfully (`npm run build:prod`)
- [ ] Site deployed to Netlify
- [ ] Environment variables set in Netlify dashboard
- [ ] Site redeployed after adding environment variables
- [ ] Webhook URL obtained (`https://YOUR-SITE.netlify.app/api/whatsapp/webhook`)
- [ ] Webhook URL configured in WasenderAPI
- [ ] Events enabled in WasenderAPI (`messages.received`, `messages.upsert`)
- [ ] Webhook enabled toggle is ON
- [ ] Health check returns `supabase_configured: true`
- [ ] Test message sent and received successfully
- [ ] Message appears in WhatsApp Inbox

---

## 🎉 Success!

Once all steps are complete, your WhatsApp messages will automatically:
1. ✅ Be received from WasenderAPI
2. ✅ Be stored in your Supabase database
3. ✅ Appear in your WhatsApp Inbox

**Your webhook is now live on Netlify!** 🚀

---

## 📖 Additional Resources

- **Full Setup Guide:** `NETLIFY_WEBHOOK_SETUP.md`
- **Quick Reference:** `QUICK_NETLIFY_FIX.md`
- **Diagnostic Tool:** `node check-netlify-webhook.mjs`
