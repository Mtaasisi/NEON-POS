# 🚂 Railway Deployment - Step by Step

## ✅ Completed Steps

- ✅ Railway CLI installed
- ✅ Server dependencies installed  
- ✅ Server built successfully (TypeScript → JavaScript)

---

## 📋 Next Steps

### Step 1: Login to Railway

```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main/server
railway login
```

**This will:**
- Open your browser
- Ask you to sign in with GitHub or email
- Return to terminal after authentication

---

### Step 2: Initialize Railway Project

```bash
railway init
```

**You'll be asked:**
- "What do you want to name your project?" → Enter: `whatsapp-webhook` (or your preferred name)
- Railway will create a new project

---

### Step 3: Set Environment Variables

**Important:** Get your Supabase Anon Key first!

To find your anon key:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy "anon public" key

Then run:

```bash
# Set Supabase URL
railway variables set VITE_SUPABASE_URL="https://ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech"

# Set your Supabase anon key (replace with actual key)
railway variables set VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Alternative variable names (Railway will use both)
railway variables set SUPABASE_URL="https://ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech"
railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Set environment
railway variables set NODE_ENV="production"

# Set port (Railway auto-detects, but explicit is good)
railway variables set PORT="8000"

# Optional: Generate webhook secret for security
railway variables set WHATSAPP_WEBHOOK_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"
```

---

### Step 4: Deploy to Railway

```bash
railway up
```

**This will:**
- Upload your server code
- Install dependencies on Railway
- Start your server
- Give you a public URL

**Example output:**
```
✓ Build completed
✓ Deployment live at https://whatsapp-webhook-production.up.railway.app
```

---

### Step 5: Get Your Webhook URL

After deployment:

```bash
railway domain
```

This shows your public URL. Your webhook endpoint will be:
```
https://your-app.up.railway.app/api/whatsapp/webhook
```

---

### Step 6: Configure Webhook in WasenderAPI

Run from project root:

```bash
cd ..
node setup-whatsapp-webhook.mjs
```

Enter your Railway URL when prompted:
```
https://your-app.up.railway.app/api/whatsapp/webhook
```

---

### Step 7: Test Your Webhook

**A. Test health check:**
```bash
curl https://your-app.up.railway.app/api/whatsapp/webhook/health
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

**B. Send test WhatsApp message:**
- Send a message to your WhatsApp Business number
- Check if it appears in database:

```sql
SELECT * FROM whatsapp_incoming_messages 
ORDER BY created_at DESC LIMIT 5;
```

---

## 🔍 Useful Railway Commands

```bash
# View logs
railway logs

# Check deployment status
railway status

# Open Railway dashboard
railway open

# View environment variables
railway variables

# Restart service
railway restart

# Link to existing project (if needed)
railway link

# Unlink project
railway unlink
```

---

## 🆘 Troubleshooting

### Issue: "Not logged in"

**Solution:**
```bash
railway logout
railway login
```

### Issue: Build fails

**Solution:**
```bash
# Make sure you're in the server directory
cd /Users/mtaasisi/Downloads/NEON-POS-main/server

# Check build works locally
npm run build

# If successful, try deploy again
railway up
```

### Issue: "Port already in use"

**Solution:** Railway auto-assigns ports. Make sure your code uses:
```typescript
const PORT = process.env.PORT || 8000;
```

This is already set in your `server/src/index.ts` ✅

### Issue: Environment variables not working

**Solution:**
```bash
# List current variables
railway variables

# Set them again if needed
railway variables set VITE_SUPABASE_URL="..."
```

---

## 📊 Monitor Your Deployment

### Railway Dashboard

```bash
railway open
```

This opens your project dashboard where you can see:
- Deployment status
- Logs
- Metrics
- Environment variables
- Custom domains

### View Live Logs

```bash
railway logs --tail
```

---

## 🎯 Quick Commands Summary

```bash
# 1. Login
railway login

# 2. Initialize
railway init

# 3. Set variables (replace with your actual keys)
railway variables set VITE_SUPABASE_URL="https://ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech"
railway variables set VITE_SUPABASE_ANON_KEY="your-actual-anon-key"
railway variables set NODE_ENV="production"

# 4. Deploy
railway up

# 5. Get URL
railway domain

# 6. View logs
railway logs

# 7. Test
curl https://your-app.up.railway.app/api/whatsapp/webhook/health
```

---

## ✅ Success Checklist

- [ ] Railway CLI installed
- [ ] Logged into Railway
- [ ] Project initialized
- [ ] Environment variables set (including Supabase anon key)
- [ ] Deployed successfully
- [ ] Got public URL
- [ ] Health check passing
- [ ] Webhook configured in WasenderAPI
- [ ] Test message received

---

## 🎉 You're Ready!

Once deployed, your webhook will:
- ✅ Receive messages from customers
- ✅ Track delivery/read status
- ✅ Store reactions and calls
- ✅ Auto-link to customer records
- ✅ Scale automatically

**Next:** Complete steps 1-7 above to go live! 🚀

