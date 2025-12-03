# 📤 Upload Webhook to Hostinger - Step by Step

## 🎯 Super Simple - Just Upload 1 File!

---

## 📁 File Location

**On your computer:**
```
/Users/mtaasisi/Downloads/NEON-POS-main/public/api/whatsapp/webhook.php
```

**Upload to Hostinger:**
```
public_html/api/whatsapp/webhook.php
```

---

## 🚀 Method 1: Hostinger File Manager (Easiest)

### Step 1: Login
1. Go to: https://hpanel.hostinger.com
2. Login with your credentials
3. Find your website (dukani.site)

### Step 2: Open File Manager
1. Click **"File Manager"** button
2. Wait for it to load
3. You'll see `public_html/` folder

### Step 3: Create Folders
1. **Open** `public_html/`
2. **Check if `api/` folder exists**
   - If yes: Open it
   - If no: Click "New Folder" → Name: `api` → Create
3. **Inside `api/` folder**, create new folder:
   - Click "New Folder"
   - Name: `whatsapp`
   - Create

### Step 4: Upload File
1. **Open** `public_html/api/whatsapp/` folder
2. **Click** "Upload" button
3. **Select** the file:
   ```
   /Users/mtaasisi/Downloads/NEON-POS-main/public/api/whatsapp/webhook.php
   ```
4. **Upload** ✅
5. **Wait** for upload to complete

### Step 5: Set Permissions (Should be automatic)
- Right-click webhook.php
- Click "Permissions" or "Change Permissions"
- Set to: **644** (Owner: Read+Write, Group: Read, Public: Read)

---

## 🚀 Method 2: FTP (If you prefer)

### Using FileZilla or any FTP client:

1. **Connect to:**
   - Host: dukani.site (or your Hostinger FTP host)
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21

2. **Navigate to:** `public_html/`

3. **Create folders:** `api/whatsapp/`

4. **Upload:** `webhook.php`

---

## 🧪 Test After Upload

### Open in browser:

```
https://dukani.site/api/whatsapp/webhook.php
```

**You should see:**
```json
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "timestamp": "2025-12-02T21:40:00+00:00",
  "environment": "production",
  "message": "WhatsApp webhook endpoint is active"
}
```

### Or test with curl:

```bash
curl https://dukani.site/api/whatsapp/webhook.php
```

---

## ✅ Success Indicators

**If it works, you'll see:**
- ✅ JSON response (not error page)
- ✅ Status shows "healthy"
- ✅ No 404 error
- ✅ No 500 error

---

## 🔧 If You See Errors

### Error: 404 Not Found

**Cause:** File not in correct location

**Fix:**
- Check file is in: `public_html/api/whatsapp/webhook.php`
- Check file name is exactly: `webhook.php` (all lowercase)
- Check URL: `https://dukani.site/api/whatsapp/webhook.php`

### Error: 500 Internal Server Error

**Cause:** PHP syntax error or missing PostgreSQL extension

**Fix 1:** Check Hostinger error logs
- Hostinger panel → Error Logs
- Look for PHP errors

**Fix 2:** Enable PostgreSQL extension
- Hostinger panel → PHP Configuration
- Enable `pgsql` extension
- Or contact Hostinger support

### Error: "Cannot connect to database"

**Cause:** PostgreSQL extension not enabled

**Fix:**
- Contact Hostinger support
- Ask them to enable PHP PostgreSQL (pdo_pgsql) extension
- Most business/premium plans have this

---

## 📊 Your Final Setup

```
┌─────────────────────────────────────┐
│  FRONTEND (Hostinger)               │
│  https://dukani.site               │
│  Your website files                 │
└─────────────────────────────────────┘
              │
┌─────────────────────────────────────┐
│  WEBHOOK (Hostinger)                │
│  https://dukani.site/api/whatsapp/ │
│  webhook.php ← Upload this!         │
└─────────────────────────────────────┘
              │
┌─────────────────────────────────────┐
│  DATABASE (Neon)                    │
│  PostgreSQL with webhook tables     │
│  All data stored here               │
└─────────────────────────────────────┘
```

**Everything on Hostinger + Neon!** ✅

---

## 🎯 After Upload - Configure Webhook

### Method 1: Automatic

```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main
node setup-whatsapp-webhook.mjs
```

Enter: `https://dukani.site/api/whatsapp/webhook.php`

### Method 2: Manual

1. Go to https://wasenderapi.com/dashboard
2. Select your session
3. Settings → Webhook
4. URL: `https://dukani.site/api/whatsapp/webhook.php`
5. Enable events:
   - messages.received
   - messages.update
   - messages.reaction
   - call.received
   - poll.results
6. Save

---

## 🧪 Test Complete System

### 1. Test Health
```
https://dukani.site/api/whatsapp/webhook.php
```

### 2. Send Test Message
From your phone, WhatsApp your business number:
```
"Testing Hostinger webhook"
```

### 3. Check Database
```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT * FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 3;"
```

### 4. Check Hostinger Logs
- Hostinger panel → Error Logs
- Look for: "✅ Incoming message stored"

---

## ✅ Checklist

- [ ] File uploaded to `public_html/api/whatsapp/webhook.php`
- [ ] Health check returns JSON (not 404)
- [ ] Webhook URL configured in WasenderAPI
- [ ] Test message sent to business number
- [ ] Message appears in database
- [ ] No errors in Hostinger logs

---

## 📞 Your URLs

**Website:** https://dukani.site  
**Webhook:** https://dukani.site/api/whatsapp/webhook.php  
**Database:** Neon PostgreSQL

---

## 🎊 Advantages

- ✅ No new hosting needed
- ✅ Same domain (dukani.site)
- ✅ No Railway complexity
- ✅ Just upload one file!
- ✅ Works immediately
- ✅ Easy to update (just re-upload)

---

**🚀 Upload now and test in 5 minutes!**

File location: `/Users/mtaasisi/Downloads/NEON-POS-main/public/api/whatsapp/webhook.php`

