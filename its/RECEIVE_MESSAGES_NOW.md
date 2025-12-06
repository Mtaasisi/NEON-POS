# 📥 How to Receive WhatsApp Messages - SIMPLE GUIDE

## ❌ Current Issue

**You're not receiving messages because:**
- Webhook file is not uploaded to Hostinger yet
- WasenderAPI doesn't know where to send incoming messages

---

## ✅ QUICK FIX (3 Steps - 5 Minutes)

### STEP 1: Upload Webhook to Hostinger (2 min)

**Option A: Use the standalone file (Easiest)**

I created a simple standalone webhook for you:

**File:** `/Users/mtaasisi/Downloads/webhook-standalone.php`

**Upload to Hostinger:**
1. Login: https://hpanel.hostinger.com/websites/dukani.site
2. File Manager
3. Navigate to: `public_html/`
4. Create folders: `api/whatsapp/`
5. Upload `webhook-standalone.php` 
6. Rename it to: `webhook.php`

**Option B: Extract from ZIP**

Upload and extract `hostinger-upload-final.zip` - includes webhook.php

---

### STEP 2: Test Webhook (30 sec)

Open in browser:
```
https://dukani.site/api/whatsapp/webhook.php
```

**Should see:**
```json
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "timestamp": "2025-12-02T...",
  "message": "Webhook is active and ready to receive messages"
}
```

✅ **If you see this JSON = Webhook is working!**

---

### STEP 3: Configure in WasenderAPI (2 min)

**Method A: Automatic (Recommended)**

```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main
node setup-whatsapp-webhook.mjs
```

When prompted, enter:
```
https://dukani.site/api/whatsapp/webhook.php
```

**Method B: Manual**

1. Go to: https://wasenderapi.com/dashboard
2. Click your session
3. Go to **Settings** or **Webhooks**
4. **Webhook URL:** `https://dukani.site/api/whatsapp/webhook.php`
5. **Enable events:**
   - ✅ messages.received
   - ✅ messages.upsert  
   - ✅ messages.update
   - ✅ messages.reaction
   - ✅ call.received
   - ✅ poll.results
6. **Enable webhook:** ON
7. **Save**

---

## 🧪 TEST RECEIVING (1 Minute)

### Send Test Message:

**From your personal phone**, WhatsApp your business number:
```
"Test: Can you receive this message?"
```

### Check Database:

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;"
```

**Expected:**
```
from_phone   | message_text                          | created_at
255XXXXXXXXX | Test: Can you receive this message?   | 2025-12-02 22:30:00
```

✅ **Your message appears = SUCCESS!**

### Check in Your App:

1. Go to: http://localhost:5173/whatsapp/inbox (or dukani.site after upload)
2. Click "Refresh" button
3. ✅ Message should appear!
4. Badge in sidebar updates: "WhatsApp Inbox (1)"

---

## 🔍 Troubleshooting

### Issue: Webhook returns 404

**Problem:** File not uploaded or wrong location

**Fix:**
- Verify file is at: `public_html/api/whatsapp/webhook.php`
- Check URL: `https://dukani.site/api/whatsapp/webhook.php`
- Create folders if missing: `api/whatsapp/`

### Issue: Webhook returns 500

**Problem:** PHP error or PostgreSQL extension missing

**Fix:**
1. Check Hostinger error logs
2. Enable PHP PostgreSQL extension (contact Hostinger support)
3. Verify database credentials in webhook.php

### Issue: Webhook works but no messages in database

**Problem:** Webhook not configured in WasenderAPI

**Fix:**
1. Go to WasenderAPI dashboard
2. Check webhook settings
3. Verify URL is correct: `https://dukani.site/api/whatsapp/webhook.php`
4. Ensure "messages.received" event is enabled
5. Check webhook status shows "Active"

### Issue: Messages in database but not in UI

**Problem:** Need to refresh or upload new build

**Fix:**
1. Upload `hostinger-upload-final.zip` (includes inbox page)
2. Or click "Refresh" button in inbox
3. Check browser console for errors

---

## 📊 Current Status

| Component | Status | Action Needed |
|-----------|--------|---------------|
| **Send WhatsApp** | ✅ Working | None - already works! |
| **WhatsApp Inbox UI** | ✅ Working | Upload to Hostinger |
| **Database Tables** | ✅ Created | None - ready! |
| **Webhook File** | ⏳ Not uploaded | Upload webhook.php |
| **Webhook Config** | ⏳ Not configured | Configure in WasenderAPI |
| **Receive Messages** | ⏳ Pending | After steps above |

---

## 🎯 DO THIS NOW (To Receive Messages):

### Quick 3-Step Fix:

1. **Upload webhook.php to Hostinger**
   - File: `/Users/mtaasisi/Downloads/webhook-standalone.php`
   - To: `public_html/api/whatsapp/webhook.php`

2. **Test webhook works**
   - Open: https://dukani.site/api/whatsapp/webhook.php
   - See: `{"status":"healthy"}`

3. **Configure in WasenderAPI**
   ```bash
   node setup-whatsapp-webhook.mjs
   ```

**Then send test WhatsApp and check database!**

---

## ✅ Summary

**Why you're not receiving:**
- Webhook not uploaded yet ⏳

**Fix:**
- Upload webhook.php (2 minutes)
- Configure in WasenderAPI (1 minute)
- Test! (30 seconds)

**Total time:** 3-4 minutes to start receiving messages!

---

**🚀 Upload webhook-standalone.php to Hostinger now to start receiving!**

File ready at: `/Users/mtaasisi/Downloads/webhook-standalone.php`

