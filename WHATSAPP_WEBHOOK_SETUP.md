# 🔔 WhatsApp Webhook Setup Guide

## Overview

This guide will help you set up **two-way WhatsApp communication** by connecting webhooks from WasenderAPI to your system. Once configured, you'll receive real-time notifications for:

- ✅ **Incoming messages** from customers
- ✅ **Message delivery status** (sent → delivered → read)
- ✅ **Message reactions** (emoji responses)
- ✅ **Incoming calls** (voice/video)
- ✅ **Poll results** from customer surveys
- ✅ **Session status changes**

---

## 📋 What Was Created

### 1. **Backend Webhook Endpoint**
**File:** `server/src/routes/whatsapp-webhook.ts`

This endpoint receives and processes all WhatsApp events from WasenderAPI.

**URL:** `https://your-domain.com/api/whatsapp/webhook`

**Handles:**
- `messages.received` - New messages from customers
- `messages.update` - Delivery/read status updates
- `messages.reaction` - Emoji reactions
- `session.status` - Connection status
- `call.received` - Incoming calls
- `poll.results` - Poll responses

### 2. **Database Tables**
**File:** `migrations/create_whatsapp_webhook_tables.sql`

Four new tables created:

| Table | Purpose |
|-------|---------|
| `whatsapp_incoming_messages` | Stores all incoming messages from customers |
| `whatsapp_reactions` | Stores emoji reactions to messages |
| `whatsapp_calls` | Logs incoming WhatsApp calls |
| `whatsapp_poll_results` | Stores customer poll responses |

**Enhanced Table:**
- `whatsapp_logs` - Added `delivered_at` and `read_at` columns

### 3. **Auto-Linking System**
Database triggers automatically link incoming messages/calls to customers based on phone number matching.

### 4. **Enhanced WhatsApp Service**
**File:** `src/services/whatsappService.ts`

New methods added:
- `configureWebhook()` - Set webhook URL in WasenderAPI
- `getIncomingMessages()` - Fetch received messages
- `markMessageAsRead()` - Mark messages as read
- `isOnWhatsApp()` - Check if number exists on WhatsApp
- `getMessageStatus()` - Get delivery status

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

First, create the required database tables:

```bash
# Connect to your Supabase SQL Editor or run:
node setup-whatsapp-webhook.mjs
```

Or manually execute the SQL file in Supabase SQL Editor:
```sql
-- Copy contents from: migrations/create_whatsapp_webhook_tables.sql
```

### Step 2: Deploy Your Server Publicly

Your webhook endpoint must be **publicly accessible via HTTPS**. WasenderAPI requires HTTPS for security.

#### Option A: Deploy to Cloud Service

**Recommended Services:**
- **Railway.app** - Easiest, automatic HTTPS
- **Heroku** - Free tier available
- **DigitalOcean App Platform**
- **Vercel** (for serverless)
- **Render**

**Deploy your `server/` directory:**
```bash
cd server
npm install
npm run build

# Deploy using your chosen service
# Example for Railway:
railway up
```

#### Option B: Local Testing with ngrok

For development/testing, use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
cd server
npm start  # Runs on port 8000

# In another terminal, expose it
ngrok http 8000

# Use the HTTPS URL ngrok gives you (e.g., https://abc123.ngrok.io)
```

### Step 3: Configure Webhook URL

#### Method A: Automatic Setup (Recommended)

Run the setup script:
```bash
node setup-whatsapp-webhook.mjs
```

The script will:
1. ✅ Create database tables
2. ✅ Ask for your webhook URL
3. ✅ Configure WasenderAPI automatically
4. ✅ Test the connection

#### Method B: Manual Setup

If you prefer to configure manually:

```typescript
import whatsappService from './src/services/whatsappService';

// Configure webhook
const result = await whatsappService.configureWebhook(
  'https://your-domain.com/api/whatsapp/webhook'
);

console.log(result); // { success: true }
```

#### Method C: Via WasenderAPI Dashboard

1. Go to [WasenderAPI Dashboard](https://wasenderapi.com/dashboard)
2. Select your session
3. Click "Settings"
4. Enter Webhook URL: `https://your-domain.com/api/whatsapp/webhook`
5. Select events to subscribe to
6. Save

---

## 🧪 Testing

### Test 1: Verify Endpoint is Live

```bash
curl https://your-domain.com/api/whatsapp/webhook
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "WhatsApp webhook endpoint is active",
  "timestamp": "2025-12-02T20:00:00.000Z"
}
```

### Test 2: Send a Test Message

1. Send a WhatsApp message to your business number
2. Check your server logs:
   ```
   📨 WhatsApp Webhook Event Received: { event: 'messages.received' }
   💬 Incoming Message: { from: '255746605561', messageType: 'text' }
   ✅ Incoming message stored successfully
   ```

3. Query the database:
   ```sql
   SELECT * FROM whatsapp_incoming_messages 
   ORDER BY created_at DESC LIMIT 5;
   ```

### Test 3: Check Message Status

Send a message to a customer, then check delivery status:

```typescript
const status = await whatsappService.getMessageStatus('message_id_here');
console.log(status);
// { status: 'read', deliveredAt: '...', readAt: '...' }
```

---

## 📊 Database Schema

### `whatsapp_incoming_messages`

```sql
CREATE TABLE whatsapp_incoming_messages (
    id UUID PRIMARY KEY,
    message_id TEXT UNIQUE NOT NULL,
    from_phone TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id),
    message_text TEXT,
    message_type TEXT DEFAULT 'text',
    media_url TEXT,
    raw_data JSONB,
    is_read BOOLEAN DEFAULT false,
    replied BOOLEAN DEFAULT false,
    replied_at TIMESTAMP,
    replied_by UUID,
    received_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_whatsapp_incoming_from` - Search by phone
- `idx_whatsapp_incoming_customer` - Search by customer
- `idx_whatsapp_incoming_unread` - Filter unread messages

---

## 💻 Usage Examples

### Example 1: Get Unread Messages

```typescript
import whatsappService from './services/whatsappService';

// Get all unread messages
const unreadMessages = await whatsappService.getIncomingMessages({
  unread_only: true,
  limit: 50
});

console.log(`You have ${unreadMessages.length} unread messages`);
```

### Example 2: Get Customer Conversation

```typescript
// Get all messages from a specific customer
const messages = await whatsappService.getIncomingMessages({
  customer_id: 'customer-uuid-here'
});

// Display conversation
messages.forEach(msg => {
  console.log(`${msg.from_phone}: ${msg.message_text}`);
});
```

### Example 3: Check Before Sending

```typescript
// Verify number is on WhatsApp before sending
const phone = '+255746605561';
const { exists } = await whatsappService.isOnWhatsApp(phone);

if (exists) {
  await whatsappService.sendMessage(phone, 'Hello!');
} else {
  console.log('This number is not on WhatsApp');
}
```

### Example 4: Track Message Delivery

```typescript
// Send message
const result = await whatsappService.sendMessage(
  '+255746605561',
  'Your repair is ready!'
);

// Wait a bit, then check status
setTimeout(async () => {
  const status = await whatsappService.getMessageStatus(result.message_id);
  console.log('Message status:', status.status); // 'sent', 'delivered', or 'read'
}, 5000);
```

---

## 🎨 Building the Inbox UI

### Basic Inbox Component

```typescript
import { useEffect, useState } from 'react';
import whatsappService from '../services/whatsappService';

function WhatsAppInbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    // Refresh every 10 seconds
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadMessages() {
    const incoming = await whatsappService.getIncomingMessages({
      unread_only: true,
      limit: 50
    });
    setMessages(incoming);
    setLoading(false);
  }

  async function handleReply(message, replyText) {
    await whatsappService.sendMessage(
      message.from_phone,
      replyText,
      { quoted_message_id: message.message_id }
    );
    
    // Mark as replied
    await supabase
      .from('whatsapp_incoming_messages')
      .update({ replied: true, replied_at: new Date().toISOString() })
      .eq('id', message.id);
    
    loadMessages();
  }

  return (
    <div className="inbox">
      <h2>WhatsApp Inbox ({messages.length} unread)</h2>
      {messages.map(msg => (
        <div key={msg.id} className="message">
          <div className="sender">
            {msg.customers?.name || msg.from_phone}
          </div>
          <div className="text">{msg.message_text}</div>
          <button onClick={() => handleReply(msg, 'Thanks for your message!')}>
            Reply
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 Monitoring & Debugging

### Check Server Logs

Your server will log all webhook events:

```bash
# If using PM2
pm2 logs

# If using Docker
docker logs your-container-name

# If running directly
npm start  # Watch the console
```

**Look for:**
```
📨 WhatsApp Webhook Event Received: { event: 'messages.received', timestamp: '...' }
💬 Incoming Message: { from: '255746605561', messageType: 'text', hasText: true }
✅ Incoming message stored successfully
✅ Message linked to customer: John Doe
```

### Query Webhook Data

```sql
-- Recent incoming messages
SELECT 
  m.*,
  c.name as customer_name
FROM whatsapp_incoming_messages m
LEFT JOIN customers c ON m.customer_id = c.id
ORDER BY m.created_at DESC
LIMIT 10;

-- Unread messages count
SELECT COUNT(*) as unread_count
FROM whatsapp_incoming_messages
WHERE is_read = false;

-- Messages by customer
SELECT 
  c.name,
  COUNT(*) as message_count
FROM whatsapp_incoming_messages m
JOIN customers c ON m.customer_id = c.id
GROUP BY c.name
ORDER BY message_count DESC;
```

---

## ⚠️ Troubleshooting

### Problem: Webhook not receiving events

**Solutions:**
1. ✅ Verify URL is publicly accessible (test with curl)
2. ✅ Ensure URL uses HTTPS (not HTTP)
3. ✅ Check WasenderAPI dashboard for webhook status
4. ✅ Review server logs for errors
5. ✅ Verify firewall allows incoming connections

### Problem: Messages not linking to customers

**Solutions:**
1. ✅ Check phone number format matches
2. ✅ Verify trigger is installed: `link_whatsapp_customer()`
3. ✅ Check customer table has phone/whatsapp fields populated

### Problem: Webhook timing out

**Solutions:**
1. ✅ Webhook returns 200 immediately (already implemented)
2. ✅ Processing happens asynchronously (already implemented)
3. ✅ Increase server timeout if needed

---

## 🎯 Next Steps

### Immediate Enhancements

1. **Build Inbox UI** - Display incoming messages in dashboard
2. **Real-time Updates** - Use WebSocket or polling for live updates
3. **Reply Interface** - Allow staff to reply to messages
4. **Notifications** - Alert staff of new messages
5. **Auto-Responder** - Send automatic replies for common questions

### Advanced Features

6. **Conversation Threading** - Group messages by customer
7. **Message Search** - Full-text search across messages
8. **Assignment System** - Assign conversations to staff
9. **Canned Responses** - Quick reply templates
10. **Analytics Dashboard** - Track response times, volumes

---

## 📚 Resources

- [WasenderAPI Webhook Documentation](https://wasenderapi.com/api-docs)
- [Your webhook endpoint]: `https://your-domain.com/api/whatsapp/webhook`
- [Database tables]: `migrations/create_whatsapp_webhook_tables.sql`
- [Service methods]: `src/services/whatsappService.ts`

---

## ✅ Checklist

- [ ] Database tables created
- [ ] Server deployed publicly with HTTPS
- [ ] Webhook URL configured in WasenderAPI
- [ ] Test message received successfully
- [ ] Messages appearing in database
- [ ] Messages linking to customers correctly
- [ ] Server logs showing webhook events
- [ ] Inbox UI created (optional)

---

## 🆘 Need Help?

If you encounter issues:

1. Check server logs: `pm2 logs` or `docker logs`
2. Verify database tables exist
3. Test webhook URL: `curl https://your-domain/api/whatsapp/webhook`
4. Check WasenderAPI dashboard for errors
5. Review this guide's troubleshooting section

---

**🎉 Congratulations!** You now have two-way WhatsApp communication set up!

Customers can message you, and you'll receive everything in real-time.

