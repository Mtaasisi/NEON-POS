# WhatsApp Session Management - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Database Setup (2 minutes)
```bash
# Option A: Automated (Recommended)
chmod +x scripts/setup-whatsapp-sessions.sh
./scripts/setup-whatsapp-sessions.sh

# Option B: Manual
psql "postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -f migrations/create_whatsapp_sessions_table.sql
```

### Step 2: Configure API (1 minute)
1. Go to **Admin Settings** → **Integrations**
2. Find **WhatsApp (WasenderAPI)**
3. Paste your Bearer Token from [WasenderAPI Dashboard](https://wasenderapi.com/dashboard)
4. Click **Save**

### Step 3: Create Session (1 minute)
1. Navigate to **WhatsApp Inbox**
2. Click **Sessions** button (blue, top right)
3. Click **New Session**
4. Fill in:
   - **Name**: "Business WhatsApp"
   - **Phone**: "+255712345678" (your number)
   - ✅ Account Protection
   - ✅ Log Messages
5. Click **Create Session**

### Step 4: Connect WhatsApp (1 minute)
1. Click **Connect** on your session
2. Scan QR code with WhatsApp:
   - Open WhatsApp on phone
   - Settings → Linked Devices
   - Link a Device → Scan QR
3. Wait for "Connected" ✅

### Step 5: Start Messaging! (0 minutes)
- Messages appear automatically in inbox
- Use **New Message** or **Bulk Send**
- Reply to conversations

---

## 🎯 Common Tasks

### View All Sessions
```
WhatsApp Inbox → Sessions Button → View List
```

### Disconnect WhatsApp
```
Sessions → Select Session → Disconnect Button
```

### Restart Connection
```
Sessions → Select Session → Restart Button
```

### Delete Session
```
Sessions → Select Session → Delete Button → Confirm
```

---

## 🔧 Troubleshooting One-Liners

| Problem | Solution |
|---------|----------|
| QR code won't appear | Refresh page, check Bearer Token in settings |
| Connection keeps dropping | Click **Restart** button on session |
| Can't create session | Check WasenderAPI subscription limit |
| Messages not showing | Verify session status is "Connected" |

---

## 📱 Phone Number Format

✅ **Correct**: `+255712345678` (country code + number, no spaces)  
❌ **Wrong**: `0712345678`, `+255 712 345 678`, `712-345-678`

---

## 🔐 Security Checklist

- [x] Bearer Token configured
- [x] Account Protection enabled
- [x] Message Logging enabled
- [x] Use HTTPS only
- [x] Keep API keys private

---

## 💡 Pro Tips

1. **Multiple Numbers**: Create separate sessions for each WhatsApp number
2. **Team Management**: Name sessions by department (Sales, Support, etc.)
3. **Session Health**: Check status regularly in Sessions modal
4. **Stay Connected**: Keep session active during business hours
5. **Backup**: Export important conversations regularly

---

## 📚 Full Documentation

- **Complete Setup Guide**: `docs/WHATSAPP_SESSION_SETUP.md`
- **Technical Summary**: `WHATSAPP_SESSION_INTEGRATION_SUMMARY.md`
- **WasenderAPI Docs**: https://wasenderapi.com/api-docs

---

## 🆘 Need Help?

**Quick Checks:**
1. Is Bearer Token correct in Admin Settings?
2. Is WasenderAPI subscription active?
3. Is session status "Connected"?
4. Did QR code timeout? (Try again)

**Support:**
- Email: support@wasenderapi.com
- Phone: +1 (914) 520-4638
- Help Center: https://wasenderapi.com/help

---

**Last Updated**: December 2025  
**Version**: 1.0.0

🎉 **You're all set! Start connecting and messaging!**
