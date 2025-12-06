# 🚀 Deploy WhatsApp Webhook with Neon Database

## Your Setup

- **Database:** Neon PostgreSQL ✅
- **Connection:** `ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech`
- **Tables:** Already created ✅
- **Server:** Ready to deploy ✅

---

## 🎯 Quick Deploy Commands

Open your **Mac Terminal** and run these commands:

### Step 1: Navigate to server
```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main/server
```

### Step 2: Login to Railway
```bash
railway login
```
_Opens browser - sign in with GitHub_

### Step 3: Create project
```bash
railway init
```
_Enter project name:_ `whatsapp-webhook`

### Step 4: Set environment variables

**Choose Option A or B based on your setup:**

#### Option A: If you have a Supabase project

```bash
# Your Supabase project URL (NOT the Neon URL)
railway variables set VITE_SUPABASE_URL="https://your-project.supabase.co"

# Your Supabase anon/public key  
railway variables set VITE_SUPABASE_ANON_KEY="eyJhbGci..."

# Standard settings
railway variables set NODE_ENV="production"
railway variables set PORT="8000"

# Security (optional but recommended)
railway variables set WHATSAPP_WEBHOOK_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"
```

**Get Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy "Project URL" and "anon public" key

#### Option B: If using Neon directly (without Supabase)

```bash
# Neon database URL
railway variables set DATABASE_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Placeholder values (required by code)
railway variables set VITE_SUPABASE_URL="https://ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech"
railway variables set VITE_SUPABASE_ANON_KEY="neon-direct-access"

# Standard settings
railway variables set NODE_ENV="production"
railway variables set PORT="8000"

# Security
railway variables set WHATSAPP_WEBHOOK_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"
```

### Step 5: Deploy
```bash
railway up
```

_Wait 1-2 minutes for deployment_

### Step 6: Get your webhook URL
```bash
railway domain
```

Your webhook will be at:
```
https://YOUR-APP.up.railway.app/api/whatsapp/webhook
```

---

## 🧪 Test Deployment

### 1. Test health check
```bash
# Replace with your actual Railway URL
curl https://YOUR-APP.up.railway.app/api/whatsapp/webhook/health
```

**Expected:**
```json
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "environment": "production"
}
```

### 2. View logs
```bash
railway logs --tail
```

### 3. Configure webhook

Back to project root:
```bash
cd ..
node setup-whatsapp-webhook.mjs
```

Enter webhook URL:
```
https://YOUR-APP.up.railway.app/api/whatsapp/webhook
```

### 4. Send test message

1. Send WhatsApp to your business number
2. Check database:
```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT * FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;"
```

---

## 🔧 Troubleshooting

### If you get database connection errors:

The webhook code uses Supabase client. You have 2 options:

**Option 1: Connect Supabase to Neon (Recommended)**

1. Go to https://supabase.com
2. Create a new project
3. In project settings, configure it to use your Neon database
4. Get the Supabase URL and anon key
5. Use those in Option A above

**Option 2: Modify code for direct PostgreSQL**

Let me know if you need this - I can modify the webhook code to use direct PostgreSQL connection instead of Supabase client.

---

## 🎯 Recommended: Use Supabase + Neon Together

**Best practice:**
1. Keep Neon as your database (you already have tables there ✅)
2. Create a Supabase project
3. Connect Supabase to your Neon database
4. Use Supabase API/auth features + Neon storage

**Benefits:**
- Supabase provides instant APIs
- Row-level security
- Real-time subscriptions
- Authentication
- Neon handles the database (better performance, cheaper)

---

## 📞 Quick Support

**Verify your setup:**

Do you have a Supabase project? Check:
- Do you login to supabase.com/dashboard?
- Do you see your project there?
- Can you find API settings?

**If YES:** Use Option A (much easier)
**If NO:** Let me modify the webhook code for direct Neon access

---

## ✅ Summary

**What you have:**
- ✅ Neon database with tables created
- ✅ Server code ready
- ✅ Railway CLI ready

**What you need:**
- Supabase project credentials (URL + anon key)
- OR direct Neon connection (needs code modification)

**Recommended next step:**
1. Check if you have Supabase project
2. If yes: Use Option A commands above
3. If no: Use Option B or tell me to modify code

---

**Ready to deploy?** Follow the commands above based on your setup! 🚀

