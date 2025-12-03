# 🚀 WhatsApp Webhook - Quick Start

## ✅ What Was Done

1. **Created Webhook Endpoint** 
   - `server/src/routes/whatsapp-webhook.ts`
   - Receives WhatsApp events in real-time

2. **Created Database Tables**
   - `migrations/create_whatsapp_webhook_tables.sql`
   - Stores incoming messages, reactions, calls, polls

3. **Enhanced WhatsApp Service**
   - Added webhook configuration methods
   - Added incoming message retrieval
   - Added number verification

4. **Created Setup Script**
   - `setup-whatsapp-webhook.mjs`
   - Automated configuration tool

---

## 🎯 Quick Setup (3 Steps)

### Step 1: Create Database Tables
```bash
node setup-whatsapp-webhook.mjs
```

### Step 2: Make Server Public

**Option A - Using ngrok (for testing):**
```bash
# Terminal 1: Start server
cd server && npm start

# Terminal 2: Expose with ngrok
ngrok http 8000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

**Option B - Deploy to Cloud:**
```bash
# Deploy to Railway, Heroku, or your preferred host
# Make sure it's accessible via HTTPS
```

### Step 3: Configure Webhook
Run the setup script again and provide your public URL:
```bash
node setup-whatsapp-webhook.mjs
# Enter: https://your-domain.com/api/whatsapp/webhook
```

---

## 📊 What You'll Receive

| Event | What It Does |
|-------|-------------|
| **Incoming Messages** | Customer sends you a message |
| **Delivery Status** | Message delivered to customer |
| **Read Status** | Customer read your message |
| **Reactions** | Customer reacts with emoji 👍❤️ |
| **Calls** | Customer calls you on WhatsApp |
| **Poll Results** | Customer votes on your poll |

---

## 🧪 Test It

### 1. Send yourself a test message
From another phone, message your WhatsApp Business number

### 2. Check the database
```sql
SELECT * FROM whatsapp_incoming_messages 
ORDER BY created_at DESC LIMIT 5;
```

### 3. Check server logs
```bash
# Should show:
📨 WhatsApp Webhook Event Received
💬 Incoming Message: { from: '255...' }
✅ Incoming message stored successfully
```

---

## 💡 Example Usage

```typescript
// Get unread messages
const messages = await whatsappService.getIncomingMessages({
  unread_only: true
});

console.log(`You have ${messages.length} new messages!`);

// Check if number is on WhatsApp before sending
const { exists } = await whatsappService.isOnWhatsApp('+255746605561');
if (exists) {
  await whatsappService.sendMessage('+255746605561', 'Hello!');
}

// Get message delivery status
const status = await whatsappService.getMessageStatus('msg_id');
console.log(status); // { status: 'read', readAt: '...' }
```

---

## 📁 Files Created

```
├── server/src/routes/
│   └── whatsapp-webhook.ts          ← Webhook endpoint
├── migrations/
│   └── create_whatsapp_webhook_tables.sql  ← Database tables
├── src/services/
│   └── whatsappService.ts           ← Enhanced (new methods)
├── setup-whatsapp-webhook.mjs       ← Setup script
├── WHATSAPP_WEBHOOK_SETUP.md       ← Full guide
└── WEBHOOK_QUICK_START.md          ← This file
```

---

## 🆘 Troubleshooting

**Webhook not receiving events?**
- ✅ Is server running? `curl https://your-domain/api/whatsapp/webhook`
- ✅ Is it HTTPS? (Required by WhatsApp)
- ✅ Check server logs for errors
- ✅ Verify webhook URL in WasenderAPI dashboard

**Messages not linking to customers?**
- ✅ Check phone number format matches in customers table
- ✅ Verify trigger was created: `link_whatsapp_customer()`

---

## 📖 Full Documentation

See `WHATSAPP_WEBHOOK_SETUP.md` for:
- Detailed setup instructions
- Database schema
- Code examples
- UI building guide
- Advanced features

---

## 🎉 You're Done!

Your system now receives WhatsApp messages in real-time!

**Next:** Build a UI to display and reply to messages.

