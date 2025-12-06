# 🔍 Netlify Function Database Configuration

## Current Database Connection

The Netlify function is using:

**Database:** Neon PostgreSQL  
**Host:** `ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech`  
**Database Name:** `neondb`  
**User:** `neondb_owner`  
**Region:** US East 1 (AWS)

**Connection String:**
```
postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

## ✅ Verification

**Current Status:**
- ✅ **Database Connected:** `true`
- ✅ **Connection Test:** Success
- ✅ **Last Check:** 2025-12-05T20:57:15.035Z

**Test Command:**
```bash
curl -s https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook
```

**Response shows:**
```json
{
  "database_connected": true,
  "db_time": "2025-12-05T20:57:15.035Z"
}
```

---

## 📋 Configuration Details

### How It Works

1. **Default Connection:**
   - The function uses the hardcoded connection string by default
   - No environment variables needed

2. **Override Option:**
   - If `DATABASE_URL` environment variable is set in Netlify, it will use that instead
   - Currently: No override set (using default)

3. **Connection Pool:**
   - Max connections: 1 (optimized for serverless)
   - Idle timeout: 30 seconds
   - Connection timeout: 10 seconds
   - SSL: Required

---

## 🔄 To Change Database

If you need to use a different database:

1. **Go to Netlify Dashboard:**
   - https://app.netlify.com/projects/inauzwaapp/configuration/env

2. **Add Environment Variable:**
   - Key: `DATABASE_URL`
   - Value: Your PostgreSQL connection string

3. **Redeploy:**
   - Go to Deploys tab
   - Click "Trigger deploy" → "Deploy site"

---

## 🧪 Test Database Connection

**Quick Test:**
```bash
curl -s https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook | python3 -m json.tool
```

**Check Connection:**
```bash
curl -s https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook | grep -o '"database_connected":[^,]*'
```

---

## 📊 Database Tables Used

The webhook stores data in these tables:

1. **`whatsapp_incoming_messages`** - Incoming messages
2. **`whatsapp_logs`** - Outgoing messages and status
3. **`whatsapp_reactions`** - Message reactions
4. **`whatsapp_calls`** - Incoming calls
5. **`whatsapp_poll_results`** - Poll responses
6. **`customer_communications`** - Customer message history
7. **`customers`** - Customer lookup by phone
8. **`webhook_failures`** - Failed webhook logs

---

## ✅ Summary

**Current Configuration:**
- ✅ Using Neon PostgreSQL database
- ✅ Host: `ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech`
- ✅ Database: `neondb`
- ✅ Connection: Active and working
- ✅ SSL: Enabled and required

**Status:** All systems operational! 🎉
