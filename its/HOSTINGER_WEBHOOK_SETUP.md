# 🚀 Hostinger Webhook Setup (5 Minutes)

## ✅ Super Simple! You Already Have Everything!

Since dukani.site is on Hostinger, just upload one PHP file!

---

## 📁 File Created For You

**Location:** `public/api/whatsapp/webhook.php`

**What it does:**
- ✅ Receives WhatsApp webhook events
- ✅ Stores incoming messages in your Neon database
- ✅ Tracks delivery & read status
- ✅ Handles reactions, calls, polls
- ✅ Auto-links to customers
- ✅ Production-ready with error handling

---

## 🎯 Upload to Hostinger (3 Steps)

### Step 1: Access Hostinger File Manager

**Option A: Via Hostinger Panel**
1. Login to https://hpanel.hostinger.com
2. Go to your website (dukani.site)
3. Click "File Manager"

**Option B: Via FTP**
1. Use FileZilla or any FTP client
2. Connect to dukani.site
3. Navigate to `public_html/`

### Step 2: Create Folder Structure

In your `public_html/` directory, create:

```
public_html/
  └── api/
      └── whatsapp/
          └── (upload webhook.php here)
```

**Folders to create:**
- `api/` (if doesn't exist)
- `api/whatsapp/` (new folder)

### Step 3: Upload webhook.php

1. **Navigate to:** `public_html/api/whatsapp/`
2. **Upload:** The file from `public/api/whatsapp/webhook.php`
3. **Set permissions:** 644 (should be default)

**That's it!** ✅

---

## 🌐 Your Webhook URL

After upload, your webhook URL is:

```
https://dukani.site/api/whatsapp/webhook.php
```

---

## 🧪 Test Immediately

### Test 1: Health Check

Open browser or run:
```bash
curl https://dukani.site/api/whatsapp/webhook.php
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "timestamp": "2025-12-02T21:40:00+00:00",
  "environment": "production",
  "message": "WhatsApp webhook endpoint is active"
}
```

### Test 2: Database Connection

The webhook will automatically connect to your Neon database using the credentials in the PHP file.

**No configuration needed!** The database connection string is already in the file.

---

## 🔗 Configure in WasenderAPI

### Manual Configuration:

1. Go to: https://wasenderapi.com/dashboard
2. Click on your session
3. Go to **Settings** or **Webhooks**
4. **Webhook URL:** `https://dukani.site/api/whatsapp/webhook.php`
5. **Select events:**
   - ✅ messages.received
   - ✅ messages.update
   - ✅ messages.reaction
   - ✅ call.received
   - ✅ poll.results
6. **Enable** webhook
7. **Save**

### Or Use Setup Script:

```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main
node setup-whatsapp-webhook.mjs
```

Enter: `https://dukani.site/api/whatsapp/webhook.php`

---

## 🧪 Test Receiving Messages

### Step 1: Send Test Message

From your personal phone, send a WhatsApp message to your business number:
```
"Test incoming message from PHP webhook"
```

### Step 2: Check Database

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;"
```

**Expected:**
```
from_phone   | message_text                              | created_at
255XXXXXXXXX | Test incoming message from PHP webhook    | 2025-12-02 21:42:00
```

### Step 3: Check Hostinger Logs (Optional)

In Hostinger panel:
- Go to "Error Logs" or "Access Logs"
- Look for entries with "WhatsApp Webhook"

---

## 📊 File Structure on Hostinger

```
public_html/
├── index.html (your website)
├── dist/ (your React build)
└── api/
    ├── sms-proxy.php (existing)
    └── whatsapp/
        └── webhook.php ← Upload this!
```

---

## ✅ Advantages of Hostinger vs Railway

| Feature | Hostinger | Railway |
|---------|-----------|---------|
| **Cost** | ✅ Free (you have it) | Free tier limited |
| **Setup Time** | ✅ 5 minutes | 30+ minutes |
| **Complexity** | ✅ Upload one file | Multiple steps |
| **Maintenance** | ✅ Zero | Config management |
| **Same Domain** | ✅ dukani.site | Different domain |
| **Performance** | ✅ Fast | Fast |

---

## 🔒 Security (Optional but Recommended)

### Add .htaccess for extra security:

Create `public_html/api/whatsapp/.htaccess`:

```apache
# Allow only POST and GET
<LimitExcept GET POST>
    Deny from all
</LimitExcept>

# Rate limiting (if supported by Hostinger)
<IfModule mod_evasive>
    DOSHashTableSize 3097
    DOSPageCount 10
    DOSSiteCount 50
    DOSPageInterval 1
    DOSSiteInterval 1
    DOSBlockingPeriod 60
</IfModule>
```

---

## 🆘 Troubleshooting

### Issue: "Cannot connect to database"

**Check:**
- PHP PostgreSQL extension enabled (usually is on Hostinger)
- Database credentials correct in webhook.php
- Firewall allows connection from Hostinger

**Fix:** Contact Hostinger support to enable pgsql extension

### Issue: "404 Not Found"

**Check:**
- File uploaded to correct path: `public_html/api/whatsapp/webhook.php`
- File permissions: 644
- URL is correct: `https://dukani.site/api/whatsapp/webhook.php`

### Issue: "Messages not appearing in database"

**Check:**
- Webhook configured correctly in WasenderAPI
- Send test message TO your business number (not from it)
- Check Hostinger error logs

---

## 📋 Quick Upload Checklist

- [ ] Login to Hostinger hPanel
- [ ] Open File Manager
- [ ] Navigate to `public_html/`
- [ ] Create folder: `api/whatsapp/`
- [ ] Upload `webhook.php`
- [ ] Test: `https://dukani.site/api/whatsapp/webhook.php`
- [ ] See JSON response with "status": "healthy"
- [ ] Configure in WasenderAPI
- [ ] Send test message
- [ ] Check database

---

## 🎊 That's It!

**Your complete setup:**

```
Frontend: https://dukani.site (Hostinger) ✅
Webhook:  https://dukani.site/api/whatsapp/webhook.php (Hostinger) ✅  
Database: Neon PostgreSQL ✅
```

**Everything on Hostinger!** No Railway needed! 🎉

---

## 🚀 Next Steps

1. **Upload webhook.php** to Hostinger (5 minutes)
2. **Test health check** 
3. **Configure in WasenderAPI**
4. **Send test message**
5. **Enjoy two-way WhatsApp!** 🎉

---

**Much simpler than Railway!** Just upload one file! 🚀

See the file at: `/Users/mtaasisi/Downloads/NEON-POS-main/public/api/whatsapp/webhook.php`

