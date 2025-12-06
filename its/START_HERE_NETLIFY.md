# 🚀 START HERE - Netlify WhatsApp Webhook

## ✅ Everything is Ready!

Your Netlify webhook is **100% configured** and ready to deploy. Here's what's been set up:

- ✅ Netlify serverless function created
- ✅ Function dependencies installed
- ✅ Netlify configuration updated
- ✅ Webhook routing configured
- ✅ All code is ready

---

## 🎯 Quick Start (Choose One Method)

### Method 1: Automated Script (Easiest)

```bash
./deploy-netlify-webhook.sh
```

This will guide you through the entire deployment process.

---

### Method 2: Manual Deployment

#### Step 1: Deploy to Netlify

**Option A: Via Netlify CLI**
```bash
# Install CLI (if not installed)
npm install -g netlify-cli

# Login
netlify login

# Build and deploy
npm run build:prod
netlify deploy --prod
```

**Option B: Via Git (if connected)**
```bash
git add netlify/ netlify.toml
git commit -m "Add Netlify WhatsApp webhook"
git push
# Netlify will auto-deploy
```

**Option C: Via Netlify Dashboard**
1. Go to https://app.netlify.com
2. Select your site (or create new)
3. Drag & drop your `dist` folder
4. Or connect your Git repo

---

#### Step 2: Environment Variables (Optional)

**Good news! The function is already configured to use your Neon database:**
```
postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**You don't need to set any environment variables** unless you want to use a different database.

**If you want to override the database connection:**
1. Go to: **Netlify Dashboard** → Your Site → **Site Settings** → **Environment Variables**
2. Add:
   - Key: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
3. Redeploy after adding variables

---

#### Step 3: Get Your Webhook URL

After deployment, your webhook URL is:
```
https://YOUR-SITE-NAME.netlify.app/api/whatsapp/webhook
```

**To find your site name:**
- Netlify Dashboard → Your Site → **Site Settings** → **General**
- Look for **Site name** or check the URL

---

#### Step 4: Configure in WasenderAPI (MOST IMPORTANT!)

**This is what makes messages work!**

1. **Go to:** https://wasenderapi.com/whatsapp/37637/edit
   (Replace `37637` with your session ID if different)

2. **Find "Webhook URL" field:**
   - Usually in a **"Webhook"** tab or **"Settings"** section
   - Look for **"Webhook URL (POST)"** or **"Webhook URL"**

3. **Enter your Netlify webhook URL:**
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

## 🧪 Test Your Webhook

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
  "database_connected": true,
  "db_time": "2025-01-XX..."
}
```

**If `database_connected: false`:**
- Check database connection string
- Verify database is accessible
- Check Netlify function logs for errors

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

## ✅ Success Checklist

Before considering it complete, verify:

- [ ] Site deployed to Netlify
- [ ] Environment variables set in Netlify (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Site redeployed after adding environment variables
- [ ] Health check returns `supabase_configured: true`
- [ ] Webhook URL obtained (`https://YOUR-SITE.netlify.app/api/whatsapp/webhook`)
- [ ] Webhook URL configured in WasenderAPI
- [ ] Events enabled in WasenderAPI (`messages.received`, `messages.upsert`)
- [ ] Webhook enabled toggle is ON
- [ ] Test message sent and received successfully
- [ ] Message appears in WhatsApp Inbox

---

## 🔍 Verify Setup

Run the diagnostic tool:

```bash
node check-netlify-webhook.mjs
```

This checks your local setup and shows what needs to be done.

---

## ❓ Troubleshooting

### Webhook returns 404
- Make sure you deployed after adding the function
- Check Netlify Dashboard → **Functions** tab to see if function is deployed

### `supabase_configured: false`
- Set environment variables in Netlify dashboard
- Redeploy after adding variables

### Messages not appearing
- Verify webhook URL in WasenderAPI
- Check events are enabled (`messages.received`, `messages.upsert`)
- Check Netlify Function Logs for errors

---

## 📖 Additional Resources

- **Complete Setup Guide:** `NETLIFY_WEBHOOK_SETUP.md`
- **Deployment Checklist:** `NETLIFY_DEPLOYMENT_CHECKLIST.md`
- **Quick Reference:** `QUICK_NETLIFY_FIX.md`

---

## 🎉 You're Ready!

Once you complete these steps, your WhatsApp messages will automatically:
1. ✅ Be received from WasenderAPI
2. ✅ Be stored in your Supabase database
3. ✅ Appear in your WhatsApp Inbox

**Your webhook is ready to deploy!** 🚀
