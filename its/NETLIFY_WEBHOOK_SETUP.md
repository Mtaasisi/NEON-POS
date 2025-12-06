# 🚀 Netlify WhatsApp Webhook Setup Guide

## ✅ What's Been Created

1. ✅ **Netlify Serverless Function** - `/netlify/functions/whatsapp-webhook.js`
2. ✅ **Netlify Configuration** - Updated `netlify.toml` with function routing
3. ✅ **Function Package** - Created `netlify/functions/package.json`

---

## 📋 Step-by-Step Setup (5 Minutes)

### Step 1: Install Function Dependencies

```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main/netlify/functions
npm install
```

This installs `@supabase/supabase-js` for the function.

---

### Step 2: Configure Environment Variables in Netlify (Optional)

**The function is already configured to use your Neon database by default!**

If you want to override the database connection, go to your Netlify Dashboard:

1. Navigate to: **Site Settings** → **Environment Variables**
2. Optionally add:

```
DATABASE_URL=postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Note:** The function uses the Neon database connection by default, so you don't need to set this unless you want to use a different database.

---

### Step 3: Deploy to Netlify

#### Option A: Deploy via Git (Recommended)

If your project is connected to GitHub/GitLab:

1. **Commit the changes:**
   ```bash
   git add netlify/ netlify.toml NETLIFY_WEBHOOK_SETUP.md
   git commit -m "Add Netlify WhatsApp webhook function"
   git push
   ```

2. **Netlify will auto-deploy** (if connected to your repo)

#### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

#### Option C: Manual Deploy via Netlify Dashboard

1. Go to: https://app.netlify.com
2. Select your site
3. Go to **Deploys** tab
4. Click **Trigger deploy** → **Deploy site**
5. Or drag & drop your `dist` folder

---

### Step 4: Get Your Webhook URL

After deployment, your webhook URL will be:

```
https://YOUR-SITE-NAME.netlify.app/api/whatsapp/webhook
```

**Or directly:**
```
https://YOUR-SITE-NAME.netlify.app/.netlify/functions/whatsapp-webhook
```

**To find your site name:**
- Go to Netlify Dashboard → Your Site → **Site Settings** → **General**
- Look for **Site name** or **Custom domain**

---

### Step 5: Configure Webhook in WasenderAPI

**This is the most important step!**

1. **Go to WasenderAPI:**
   ```
   https://wasenderapi.com/whatsapp/37637/edit
   ```
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
   - ✅ `messages.received` (MOST IMPORTANT!)
   - ✅ `messages.upsert` (ALSO IMPORTANT!)
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
  "timestamp": "2025-01-XX...",
  "environment": "production",
  "message": "WhatsApp webhook endpoint is active",
  "supabase_configured": true
}
```

If `supabase_configured` is `false`, check your environment variables!

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

4. **Check Database:**
   ```sql
   SELECT from_phone, message_text, created_at 
   FROM whatsapp_incoming_messages 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

5. **Check Your App:**
   - Go to WhatsApp Inbox in your app
   - Your test message should appear!

---

## 🔍 Troubleshooting

### Problem: Webhook returns 404

**Solution:**
- Make sure you deployed after adding the function
- Check that `netlify.toml` has the redirect rule
- Verify the function exists in `netlify/functions/whatsapp-webhook.js`

---

### Problem: `supabase_configured: false`

**Solution:**
1. Go to Netlify Dashboard → **Site Settings** → **Environment Variables**
2. Verify these are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Redeploy** after adding variables

---

### Problem: Messages not appearing in database

**Checklist:**
1. ✅ Webhook URL configured in WasenderAPI?
2. ✅ Events enabled (`messages.received`, `messages.upsert`)?
3. ✅ Webhook enabled toggle is ON?
4. ✅ Supabase credentials correct?
5. ✅ Database tables exist? (Run migrations if needed)

**Check Netlify Function Logs:**
- Go to Netlify Dashboard → **Functions** → `whatsapp-webhook` → **Logs**
- Look for error messages

---

### Problem: Function timeout

**Solution:**
- Netlify functions have a 10-second timeout on free tier
- The function returns 200 immediately and processes async
- If processing takes longer, consider upgrading Netlify plan

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

## 🔄 Updating the Webhook

After making changes to the function:

1. **Edit** `/netlify/functions/whatsapp-webhook.js`
2. **Commit and push** (if using Git)
3. **Or redeploy** via Netlify CLI or dashboard
4. **Netlify will automatically rebuild** the function

---

## ✅ Success Checklist

- [ ] Function dependencies installed (`npm install` in `netlify/functions/`)
- [ ] Environment variables set in Netlify dashboard
- [ ] Site deployed to Netlify
- [ ] Webhook URL obtained (`https://YOUR-SITE.netlify.app/api/whatsapp/webhook`)
- [ ] Webhook URL configured in WasenderAPI
- [ ] Events enabled in WasenderAPI (`messages.received`, `messages.upsert`)
- [ ] Webhook enabled toggle is ON
- [ ] Health check returns `supabase_configured: true`
- [ ] Test message sent and received successfully

---

## 🎉 You're Done!

Once all steps are complete, your WhatsApp messages will automatically:
1. ✅ Be received from WasenderAPI
2. ✅ Be stored in your Supabase database
3. ✅ Appear in your WhatsApp Inbox

**Your webhook is now live on Netlify!** 🚀
