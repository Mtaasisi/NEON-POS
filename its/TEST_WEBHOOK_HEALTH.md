# 🧪 How to Test Webhook Health

## ✅ Quick Test Methods

### Method 1: Browser (Easiest)

**Open in your browser:**
```
https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "timestamp": "2025-12-05T20:56:22.120Z",
  "environment": "production",
  "message": "WhatsApp webhook endpoint is active",
  "database_connected": true,
  "db_time": "2025-12-05T20:56:22.113Z"
}
```

**✅ Success Indicators:**
- `status: "healthy"` - Function is running
- `database_connected: true` - Database connection works
- `db_time` - Shows current database time (confirms connection)

---

### Method 2: Terminal (curl)

**Simple test:**
```bash
curl https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook
```

**Pretty formatted:**
```bash
curl -s https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook | python3 -m json.tool
```

**Or with jq (if installed):**
```bash
curl -s https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook | jq
```

---

### Method 3: Using the Redirect URL

**After next deployment, this should also work:**
```bash
curl https://inauzwaapp.netlify.app/api/whatsapp/webhook
```

(Currently the redirect needs to be fixed - use the direct function URL above)

---

## 🔍 What to Look For

### ✅ Healthy Response

```json
{
  "status": "healthy",
  "database_connected": true,
  "db_time": "2025-12-05T20:56:22.113Z"
}
```

**This means:**
- ✅ Function is deployed and running
- ✅ Database connection is working
- ✅ Webhook is ready to receive messages

---

### ❌ Problem Indicators

**If `database_connected: false`:**
- Database connection failed
- Check database credentials
- Verify database is accessible

**If you get 404:**
- Function not deployed
- Check Netlify dashboard → Functions tab

**If you get 500:**
- Function error
- Check Netlify function logs

---

## 📊 Test Results

**Current Status (as of testing):**
```json
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "timestamp": "2025-12-05T20:56:22.120Z",
  "environment": "production",
  "message": "WhatsApp webhook endpoint is active",
  "database_connected": true,
  "db_time": "2025-12-05T20:56:22.113Z"
}
```

**✅ All systems operational!**

---

## 🧪 Test Sending a Message

After confirming health check works:

1. **Configure webhook in WasenderAPI:**
   - URL: `https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook`
   - Enable events: `messages.received`, `messages.upsert`
   - Enable webhook toggle

2. **Send test message:**
   - From your phone, send WhatsApp to your business number
   - Message: "Testing webhook"

3. **Check Netlify Function Logs:**
   - Go to: https://app.netlify.com/projects/inauzwaapp/functions
   - Click on `whatsapp-webhook`
   - View **Logs** tab
   - Should see: `📨 WhatsApp Webhook Event: { event: 'messages.received', ... }`

4. **Check Database:**
   ```sql
   SELECT from_phone, message_text, created_at 
   FROM whatsapp_incoming_messages 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

## 🔗 Quick Links

- **Direct Function URL:** https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook
- **Netlify Dashboard:** https://app.netlify.com/projects/inauzwaapp
- **Function Logs:** https://app.netlify.com/projects/inauzwaapp/functions/whatsapp-webhook

---

**Your webhook is healthy and ready! 🎉**
