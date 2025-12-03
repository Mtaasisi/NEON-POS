# ⚡ QUICK START - 3 STEPS TO GO LIVE!

## 🎯 YOUR MISSION: Get WhatsApp working in production

**Time required:** 6 minutes  
**File ready:** `production-ready.zip` (3.0 MB)

---

## ✅ STEP 1: UPLOAD TO HOSTINGER (3 min)

### Simple Method:

1. **Login:** https://hpanel.hostinger.com
2. **File Manager** → `public_html`
3. **Upload:** `production-ready.zip`
4. **Extract** (right-click → Extract)
5. **Move** all files from `dist/` to root folder
6. **Done!** ✅

---

## ✅ STEP 2: CONFIGURE WEBHOOK (2 min)

### CRITICAL - Must do or won't receive messages!

1. **Open:** https://wasenderapi.com/whatsapp/37637/edit

2. **Find field:** "Webhook URL (POST)"

3. **Type exactly:**
   ```
   https://dukani.site/api/whatsapp/webhook.php
   ```

4. **Check:**
   - ✅ Enable Webhook Notifications
   - ✅ messages.received

5. **Click:** "Save Changes"

**Done!** ✅

---

## ✅ STEP 3: TEST (1 min)

### Quick Test:

**From your phone, WhatsApp your business:**
```
"Testing production!"
```

**Then check:**
```
https://dukani.site/whatsapp/inbox
```

**Click "Refresh"**

**Your message appears!** ✅

---

## 🎊 THAT'S IT!

**You now have:**
- ✅ Send WhatsApp to customers
- ✅ Receive WhatsApp from customers
- ✅ WhatsApp Inbox with all messages
- ✅ Unread count badge
- ✅ Reply to customers
- ✅ Complete two-way WhatsApp communication!

---

## 📞 COPY-PASTE THIS:

**Webhook URL for WasenderAPI:**
```
https://dukani.site/api/whatsapp/webhook.php
```

---

## 🆘 NOT WORKING?

**Check:**
1. Webhook URL entered correctly in WasenderAPI?
2. "Enable Webhook Notifications" checked?
3. "messages.received" event checked?
4. Clicked "Save Changes"?

**Test webhook:**
```bash
curl https://dukani.site/api/whatsapp/webhook.php
```

**Should return:** `{"status":"healthy"}`

---

## ✅ FILES TO UPLOAD

**Just one file:** `production-ready.zip`

**Contains:**
- Complete website
- WhatsApp Inbox page
- Webhook handler
- All features

**Upload once, everything works!** 🚀

---

**🎉 3 STEPS = COMPLETE WHATSAPP INTEGRATION!**

**Go upload now!** 🚀

