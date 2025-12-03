# ✅ Enable Webhook in WasenderAPI - DO THIS NOW!

## 🎉 GREAT NEWS!

**Your webhook is ALREADY WORKING!** ✅

```
https://dukani.site/api/whatsapp/webhook.php
```

**Status:** Active and ready to receive messages!

---

## 🔗 CONFIGURE IN WASENDERAPI (2 Minutes)

### Go to Your Session:

**URL:** https://wasenderapi.com/whatsapp/37637/edit

---

### Find the Webhook Section:

**Look for one of these:**
- "Webhook" tab
- "Webhook Settings" section
- "Webhook URL" field
- "Integrations" section

**Usually located:**
- In tabs at the top of the page
- Or scroll down to "Advanced Settings"
- Or in a "Settings" or "Configuration" panel

---

### Enter Your Webhook URL:

**In the "Webhook URL" field, paste:**
```
https://dukani.site/api/whatsapp/webhook.php
```

---

### Select Events:

**Check these boxes** (or select "All Events"):

```
✅ messages.received      ← Most important!
✅ messages.upsert        ← Also important!
✅ messages.update        ← For delivery status
✅ messages.reaction      ← For emoji reactions
✅ call.received          ← For incoming calls
✅ poll.results           ← For poll responses
```

---

### Enable the Webhook:

**Find the toggle/switch:**
- "Enable Webhook" - Turn **ON**
- "Webhook Enabled" - Check the box
- "Status" - Set to **Active**

---

### Save Changes:

**Click:**
- "Save" button
- "Update" button
- "Apply Changes" button

---

## ✅ VERIFY IT'S WORKING

### In WasenderAPI:

After saving, you should see:
- ✅ Webhook Status: **Active** or **Enabled**
- ✅ Webhook URL: `https://dukani.site/api/whatsapp/webhook.php`
- ✅ Events: 6 selected

---

## 🧪 TEST IMMEDIATELY

### Send Test Message:

**From your personal phone**, send WhatsApp to your business number:
```
"Testing webhook - hello!"
```

### Check Database (30 seconds later):

```bash
psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;"
```

**Expected:**
```
from_phone   | message_text              | created_at
255XXXXXXXXX | Testing webhook - hello!  | 2025-12-02 22:35:00
```

✅ **Message appears = WEBHOOK WORKING!**

### Check in Your App:

1. Go to: http://localhost:5173/whatsapp/inbox
2. Click "Refresh" button
3. ✅ Message appears in inbox!
4. ✅ Sidebar badge updates!

---

## 📋 Quick Checklist

```
□ Login to WasenderAPI
  URL: https://wasenderapi.com/whatsapp/37637/edit
  
□ Find Webhook section
  Look for: Webhook URL field
  
□ Enter webhook URL
  Paste: https://dukani.site/api/whatsapp/webhook.php
  
□ Select events
  Check: messages.received, messages.update, etc.
  
□ Enable webhook
  Toggle: ON or Active
  
□ Save changes
  Click: Save or Update
  
□ Send test message
  WhatsApp your business number
  
□ Check database
  Run psql query above
  
□ Verify in app
  Check WhatsApp Inbox in sidebar
```

---

## 🎯 What Happens After You Enable:

**Immediately:**
- WasenderAPI starts sending events to your webhook
- Every incoming message hits: `https://dukani.site/api/whatsapp/webhook.php`
- Webhook stores in database
- Messages appear in your inbox!

**You get:**
- ✅ Real-time message notifications
- ✅ Delivery status updates
- ✅ Read receipts
- ✅ Emoji reactions
- ✅ Call notifications
- ✅ Full two-way communication!

---

## 📞 Quick Reference

**Your Webhook URL:**
```
https://dukani.site/api/whatsapp/webhook.php
```

**Session Page:**
```
https://wasenderapi.com/whatsapp/37637/edit
```

**Test URL (should work now):**
```
curl https://dukani.site/api/whatsapp/webhook.php
```

**Returns:**
```json
{"status":"healthy","service":"whatsapp-webhook"}
```

---

## 🎊 YOU'RE ALMOST THERE!

**Your webhook is online and waiting!** ✅

**Just enable it in WasenderAPI and test!**

---

**⏰ Takes 2 minutes to configure!**

**Then you'll receive all customer WhatsApp messages automatically!** 🎉

