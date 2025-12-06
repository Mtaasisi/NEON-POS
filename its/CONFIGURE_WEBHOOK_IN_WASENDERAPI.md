# 🔗 Configure Webhook in WasenderAPI - Step by Step

## 🎯 Enable Webhook to Receive Messages

**Session URL:** https://wasenderapi.com/whatsapp/37637/edit

---

## 📋 SIMPLE STEPS (2 Minutes)

### STEP 1: Login to WasenderAPI

1. **Go to:** https://wasenderapi.com/login
2. **Login** with your credentials
3. **Or** if already logged in, go directly to:
   https://wasenderapi.com/whatsapp/37637/edit

---

### STEP 2: Find Webhook Settings

Once on the session edit page, look for:
- **"Webhook"** section or tab
- **"Webhook URL"** field
- **"Webhook Settings"** section

It might be:
- In a tab at the top
- In settings panel
- Scroll down to find "Webhook Configuration"

---

### STEP 3: Enter Webhook URL

**Copy this URL:**
```
https://dukani.site/api/whatsapp/webhook.php
```

**Paste it in the "Webhook URL" field**

---

### STEP 4: Select Events

**Enable these events** (check the boxes):

```
✅ messages.received
✅ messages.upsert
✅ messages.update
✅ messages.reaction
✅ session.status
✅ call.received
✅ poll.results
```

**Or select "All Events"** if there's an option

---

### STEP 5: Enable Webhook

Look for:
- **"Enable Webhook"** toggle/switch
- **"Webhook Enabled"** checkbox
- **"Active"** status

**Turn it ON** ✅

---

### STEP 6: Save

Click:
- **"Save"** button
- **"Update"** button
- **"Apply"** button

---

## 🧪 TEST IMMEDIATELY

### Test 1: Verify Webhook is Active

In WasenderAPI dashboard, check:
- Webhook status shows: **"Active"** or **"Connected"**
- URL shows: `https://dukani.site/api/whatsapp/webhook.php`
- Events: Multiple events selected

### Test 2: Send Test Message

**From your personal phone**, WhatsApp your business number:
```
"Test webhook - can you receive this?"
```

### Test 3: Check Database

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;"
```

**Should show your test message!** ✅

### Test 4: Check in Your App

1. Go to: http://localhost:5173/whatsapp/inbox
2. Click "Refresh"
3. ✅ Message appears!
4. Sidebar badge updates: "WhatsApp Inbox (1)"

---

## 🔍 What to Look For in WasenderAPI

### Visual Guide:

```
WasenderAPI Session Edit Page
├── Session Information
│   ├── Name
│   ├── Phone Number
│   └── Status
│
├── Webhook Settings ← Look for this!
│   ├── Webhook URL: [Enter URL here]
│   ├── Webhook Events: [Select events]
│   ├── Enable Webhook: [Toggle ON]
│   └── [Save/Update button]
│
└── Advanced Settings
```

### Common Field Names:

- "Webhook URL"
- "Webhook Endpoint"
- "Callback URL"
- "Event URL"
- "Notification URL"

All mean the same thing - enter:
```
https://dukani.site/api/whatsapp/webhook.php
```

---

## 📸 Screenshot Guide

If you need help finding it:

1. **Take screenshot** of the WasenderAPI edit page
2. Look for sections with:
   - "Webhook"
   - "URL"
   - "Events"
   - Toggle switches
   - Checkboxes

---

## ⚡ Alternative: Use API (Automatic)

If you prefer, run this script (requires your API key):

```bash
node setup-whatsapp-webhook.mjs
```

**This script will:**
- ✅ Connect to WasenderAPI automatically
- ✅ Configure webhook URL
- ✅ Enable all events
- ✅ Test connection

**You'll be prompted for:**
- Your webhook URL (use: `https://dukani.site/api/whatsapp/webhook.php`)

---

## 🆘 Troubleshooting

### Can't Find Webhook Settings?

**Try these:**
1. Look for tabs: "Settings", "Webhooks", "Advanced"
2. Scroll down the page
3. Check WasenderAPI documentation: https://wasenderapi.com/api-docs
4. Contact WasenderAPI support

### Webhook URL Field is Disabled?

**Possible reasons:**
1. Session not connected
2. Subscription expired
3. Need to connect WhatsApp first

**Fix:** Connect your WhatsApp session first, then configure webhook

### Events List Not Showing?

**Some platforms:**
- Don't show event checkboxes
- Accept all events by default
- Just need webhook URL

**Solution:** Just enter the URL and save!

---

## ✅ Success Indicators

**After configuration, you should see:**
- ✅ Webhook status: "Active" or "Enabled"
- ✅ URL: `https://dukani.site/api/whatsapp/webhook.php`
- ✅ Events: Selected or "All"

**Test by sending WhatsApp to your business number!**

---

## 🎯 Quick Reference

**Your webhook URL:**
```
https://dukani.site/api/whatsapp/webhook.php
```

**Session edit page:**
```
https://wasenderapi.com/whatsapp/37637/edit
```

**Events to enable:**
```
messages.received
messages.update
messages.reaction
call.received
poll.results
```

---

**📝 Go to WasenderAPI and configure the webhook now!**

**Then send a test message and check the database!** 🚀

See `RECEIVE_MESSAGES_NOW.md` for complete setup guide!
