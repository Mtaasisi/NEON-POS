# 🚀 Configure Webhook - SIMPLE 3-STEP GUIDE

## ✅ Your Webhook is Ready!

**Webhook URL:** `https://dukani.site/api/whatsapp/webhook.php`  
**Status:** ✅ Online and healthy  
**Tested:** ✅ Confirmed working

---

## 📋 DO THESE 3 THINGS (2 Minutes Total)

### STEP 1: Login to WasenderAPI (30 seconds)

**Go to:** https://wasenderapi.com/whatsapp/37637/edit

**Login** with your credentials (if not already logged in)

---

### STEP 2: Configure Webhook (1 minute)

**Once logged in, you'll see a form. Do this:**

1. **Scroll down** to find "Webhook URL (POST)" field

2. **Click in the field** and **clear the placeholder text**

3. **Type this exactly:**
   ```
   https://dukani.site/api/whatsapp/webhook.php
   ```

4. **Make sure these are checked:**
   - ✅ Enable Webhook Notifications
   - ✅ messages.received (MUST be checked!)

5. **Click "Save Changes"** button (orange button at bottom)

---

### STEP 3: Test (30 seconds)

**Send WhatsApp TO your business number** (from your personal phone):
```
"Hello! Testing webhook"
```

**Wait 10 seconds, then check database:**
```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;"
```

**Expected result:**
```
from_phone   | message_text           | created_at
255XXXXXXXX  | Hello! Testing webhook | 2025-12-02 22:50:00
```

✅ **Message appears = WEBHOOK WORKING!**

---

## 📱 Then Check Your App

**Go to:** http://localhost:5173/whatsapp/inbox

**You'll see:**
- ✅ Message from your phone
- ✅ Badge in sidebar: "WhatsApp Inbox (1)"
- ✅ Click "Reply" to respond
- ✅ Customer receives your reply!

---

## ✅ That's It!

**After these 3 steps:**
- ✅ Send WhatsApp (already works)
- ✅ Receive WhatsApp (works after webhook config)
- ✅ View in Inbox
- ✅ Reply to customers
- ✅ Track delivery
- ✅ COMPLETE! 🎉

---

## 🎯 VISUAL GUIDE

```
Step 1: Login
https://wasenderapi.com/whatsapp/37637/edit
    ↓
Step 2: Fill Form
┌──────────────────────────────────────┐
│ Webhook URL (POST):                  │
│ [https://dukani.site/api/whatsapp...]│
│                                      │
│ ✅ Enable Webhook Notifications     │
│ ✅ messages.received                │
│                                      │
│ [Save Changes]  ← Click this!       │
└──────────────────────────────────────┘
    ↓
Step 3: Test
Send WhatsApp → Check database → See message!
```

---

## 📞 Copy-Paste This URL

**Webhook URL to enter:**
```
https://dukani.site/api/whatsapp/webhook.php
```

**Session edit page:**
```
https://wasenderapi.com/whatsapp/37637/edit
```

---

## 🆘 If You Need Help

**Can't find the webhook field?**
- Scroll down the page
- Look for "Webhook URL (POST)"
- Or check tabs at top of page

**Field won't save?**
- Make sure URL starts with `https://`
- Check "Enable Webhook Notifications" is ON
- Make sure "messages.received" is checked

**Still not receiving?**
- Verify webhook URL is exactly: `https://dukani.site/api/whatsapp/webhook.php`
- Check WasenderAPI shows webhook as "Active"
- Send test message and wait 10-15 seconds

---

## ✅ Quick Checklist

```
□ Login to WasenderAPI
□ Navigate to session 37637 edit page
□ Find "Webhook URL (POST)" field
□ Enter: https://dukani.site/api/whatsapp/webhook.php
□ Check: Enable Webhook Notifications
□ Check: messages.received event
□ Click: Save Changes
□ Send test WhatsApp to your number
□ Check database - message appears!
□ Check app - message in inbox!
□ DONE! 🎉
```

---

## 🎊 YOU'RE 2 MINUTES AWAY!

**Everything else is ready:**
- ✅ Webhook is online
- ✅ Database is ready
- ✅ Inbox is built
- ✅ All connections working

**Just configure in WasenderAPI and test!**

---

**🚀 Go to https://wasenderapi.com/whatsapp/37637/edit and fill in the webhook URL now!**

**Then you'll receive all customer WhatsApp messages automatically!** 🎉

