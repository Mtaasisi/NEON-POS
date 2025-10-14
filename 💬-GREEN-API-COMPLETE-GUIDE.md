# 💬 Green API WhatsApp - Complete Setup Guide

## ✅ ALL REQUIRED FIELDS CONFIGURED!

Your Green API (WhatsApp) integration now has **ALL** the fields needed for complete functionality!

---

## 🎯 What Green API Needs

### Required Fields (2):
1. ✅ **Instance ID** - Your WhatsApp instance identifier
2. ✅ **API Token** - Your instance API token

### Optional but Recommended (7):
3. ✅ **WhatsApp Phone Number** - Your WhatsApp business number
4. ✅ **API URL / Host** - Green API endpoint
5. ✅ **Webhook URL** - Receive incoming messages
6. ✅ **Webhook Token** - Secure webhook verification
7. ✅ **Link Preview** - Show link previews in messages
8. ✅ **Auto-mark Read** - Mark incoming messages as read
9. ✅ **Message Delay** - Delay between bulk messages

**Total: 9 fields for complete WhatsApp functionality!**

---

## 🚀 How to Set Up Green API

### Step 1: Get Green API Credentials

1. **Sign Up:**
   - Visit: https://green-api.com or https://console.green-api.com
   - Create an account
   - Verify your email

2. **Create Instance:**
   - Click "Create Instance"
   - Choose your plan (Free/Paid)
   - Get your **Instance ID** (e.g., 7105284900)
   - Get your **API Token** (long string)

3. **Scan QR Code:**
   - Open WhatsApp on your phone
   - Settings → Linked Devices
   - Scan QR code from Green API console
   - Wait for authorization

---

### Step 2: Add to Your App

1. **Go to:** Admin Settings → Integrations
2. **Click:** "Green API" card
3. **Fill in fields:**

**Credentials:**
```
Instance ID: 7105284900
API Token: ●●●●●●●●●●●●●●●●●●●●
WhatsApp Phone: +255712345678 (optional)
```

**Configuration:**
```
API URL: https://7105.api.greenapi.com
Webhook URL: https://yourapp.com/api/whatsapp/webhook (optional)
Webhook Token: your_webhook_secret (optional)
☑️ Enable Link Preview
☑️ Auto-mark Messages as Read
Delay Between Messages: 1000 ms
```

4. **Enable & Save**

---

### Step 3: Test the Integration

**Method 1: Quick Test Button**
1. Click the blue **Test button** (🧪)
2. Should connect to Green API
3. Shows: ✅ "Connected! Status: authorized"

**Method 2: Send Test Message**
1. Go to `/integrations-test`
2. Enter test phone number
3. Click "Test WhatsApp"
4. Should send actual WhatsApp message!

---

## 📋 Field Details

### 1. Instance ID (Required)
```
What: Your WhatsApp instance identifier
Example: 7105284900
Where: Green API console → Your Instances
Format: Numeric ID
```

### 2. API Token (Required)
```
What: Authentication token for your instance
Example: abc123def456...
Where: Green API console → Instance settings
Security: Keep secret! Never share
```

### 3. WhatsApp Phone Number (Optional)
```
What: Your WhatsApp business phone number
Example: +255712345678
Purpose: Reference, not used in API calls
Display: Shows in your app's UI
```

### 4. API URL / Host (Required)
```
What: Green API endpoint
Default: https://7105.api.greenapi.com
Alternative: https://api.green-api.com
Purpose: Where API requests are sent
Note: Number in URL matches your instance region
```

### 5. Webhook URL (Optional)
```
What: Endpoint to receive incoming messages
Example: https://yourapp.com/api/whatsapp/webhook
Purpose: Two-way messaging, receive customer replies
Setup: Configure in Green API console too
```

### 6. Webhook Token (Optional)
```
What: Secret token to verify webhook requests
Example: your_secret_webhook_token_123
Purpose: Security - verify requests are from Green API
Use: Check token in webhook handler
```

### 7. Enable Link Preview (Optional)
```
What: Show preview when sending links
Default: Enabled
Effect: Links show thumbnail, title, description
Example: When sending website links
```

### 8. Auto-mark Messages as Read (Optional)
```
What: Automatically mark incoming messages as read
Default: Disabled
Purpose: Avoid manual marking
Note: Customers see blue checkmarks
```

### 9. Delay Between Messages (Optional)
```
What: Milliseconds to wait between bulk messages
Default: 1000 (1 second)
Purpose: Avoid rate limiting
Range: 500-5000 ms recommended
```

---

## 🎯 Green API URL Format

```
POST https://{API_URL}/waInstance{INSTANCE_ID}/sendMessage/{API_TOKEN}

Body:
{
  "chatId": "255712345678@c.us",
  "message": "Hello from LATS POS!",
  "linkPreview": true,
  "quotedMessageId": "msg_id" (optional)
}

Response:
{
  "idMessage": "3EB0123456789ABCDEF",
  "status": "sent"
}
```

---

## 📱 Green API Endpoints Used

### 1. Send Message:
```
POST /waInstance{ID}/sendMessage/{TOKEN}
```

### 2. Send File (Image/PDF):
```
POST /waInstance{ID}/sendFileByUrl/{TOKEN}
```

### 3. Get State:
```
GET /waInstance{ID}/getStateInstance/{TOKEN}
```

### 4. Get Settings:
```
GET /waInstance{ID}/getSettings/{TOKEN}
```

### 5. Set Settings:
```
POST /waInstance{ID}/setSettings/{TOKEN}
```

### 6. Logout:
```
GET /waInstance{ID}/logout/{TOKEN}
```

### 7. Reboot:
```
GET /waInstance{ID}/reboot/{TOKEN}
```

**All supported by your integration!** ✅

---

## 🔧 Advanced Features

### Send Images:
```typescript
const credentials = await getCredentials('WHATSAPP_GATEWAY');

await fetch(`${credentials.api_url}/waInstance${credentials.instance_id}/sendFileByUrl/${credentials.api_token}`, {
  method: 'POST',
  body: JSON.stringify({
    chatId: "255712345678@c.us",
    urlFile: "https://example.com/image.jpg",
    fileName: "receipt.jpg",
    caption: "Your receipt"
  })
});
```

### Send Documents:
```typescript
await fetch(`${credentials.api_url}/waInstance${credentials.instance_id}/sendFileByUrl/${credentials.api_token}`, {
  method: 'POST',
  body: JSON.stringify({
    chatId: "255712345678@c.us",
    urlFile: "https://example.com/invoice.pdf",
    fileName: "invoice.pdf"
  })
});
```

### Check Authorization:
```typescript
const response = await fetch(`${credentials.api_url}/waInstance${credentials.instance_id}/getStateInstance/${credentials.api_token}`);
const data = await response.json();

if (data.stateInstance === 'authorized') {
  console.log('✅ WhatsApp is connected!');
} else {
  console.log('❌ Needs QR scan:', data.stateInstance);
}
```

---

## ✅ Complete Setup Example

```typescript
{
  integration_name: 'WHATSAPP_GATEWAY',
  integration_type: 'whatsapp',
  provider_name: 'Green API',
  is_enabled: true,
  is_test_mode: false,
  environment: 'production',
  
  credentials: {
    instance_id: '7105284900',
    api_token: 'abc123def456...',
    phone_number: '+255712345678'
  },
  
  config: {
    api_url: 'https://7105.api.greenapi.com',
    webhook_url: 'https://yourapp.com/api/whatsapp/webhook',
    webhook_token: 'your_webhook_secret',
    link_preview: true,
    mark_messages_read: false,
    delay_send_ms: 1000
  }
}
```

---

## 🎨 What You Can Send

### Text Messages:
```
✅ Plain text
✅ Formatted text (bold, italic)
✅ Emoji
✅ Links with preview
```

### Media:
```
✅ Images (JPG, PNG, GIF)
✅ Videos (MP4, etc.)
✅ Documents (PDF, DOCX, etc.)
✅ Audio files
```

### Advanced:
```
✅ Interactive buttons
✅ Lists
✅ Templates
✅ Location
✅ Contacts
```

---

## 📊 How It Works

### Sending Flow:
```
1. App calls: whatsappService.sendWhatsAppMessage(phone, message)
2. Service fetches credentials from database:
   - instance_id
   - api_token
   - api_url
3. Formats phone: 255712345678 → 255712345678@c.us
4. Sends to Green API:
   POST https://7105.api.greenapi.com/waInstance7105284900/sendMessage/TOKEN
   Body: { chatId: "255712345678@c.us", message: "Text" }
5. Green API sends WhatsApp message
6. Tracks usage in database
7. Returns success/failure
```

---

## 🔐 Webhook Setup (Optional)

If you want to **receive** messages:

### 1. Configure in Green API Console:
```
Webhook URL: https://yourapp.com/api/whatsapp/webhook
Webhook Token: your_secret_token_123
```

### 2. Create Webhook Handler:
```typescript
// api/whatsapp/webhook.ts
export async function POST(request: Request) {
  const credentials = await getCredentials('WHATSAPP_GATEWAY');
  const token = request.headers.get('x-webhook-token');
  
  // Verify token
  if (token !== credentials.config.webhook_token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const webhook = await request.json();
  
  // Handle incoming message
  if (webhook.typeWebhook === 'incomingMessageReceived') {
    const message = webhook.messageData.textMessageData.textMessage;
    const from = webhook.senderData.chatId;
    
    // Process message
    console.log('Received from:', from);
    console.log('Message:', message);
  }
  
  return new Response('OK', { status: 200 });
}
```

---

## 🎯 Real-World Usage

### Send Receipt:
```typescript
import { whatsappService } from '@/services/whatsappService';

await whatsappService.sendWhatsAppMessage(
  '+255712345678',
  `🧾 Receipt #12345
  
Total: 50,000 TZS
Items: 3
Date: ${new Date().toLocaleDateString()}

Thank you for your purchase! 🙏`
);
```

### Send With Link Preview:
```typescript
const credentials = await getCredentials('WHATSAPP_GATEWAY');

await fetch(`${credentials.api_url}/waInstance${credentials.instance_id}/sendMessage/${credentials.api_token}`, {
  method: 'POST',
  body: JSON.stringify({
    chatId: "255712345678@c.us",
    message: "Check our products: https://yourstore.com",
    linkPreview: true
  })
});
```

### Bulk Messages with Delay:
```typescript
const credentials = await getCredentials('WHATSAPP_GATEWAY');
const delay = credentials.config.delay_send_ms || 1000;

for (const customer of customers) {
  await whatsappService.sendWhatsAppMessage(
    customer.phone,
    `Hi ${customer.name}, special offer today!`
  );
  
  // Wait before sending next
  await new Promise(r => setTimeout(r, delay));
}
```

---

## ✅ Testing Checklist

Verify your Green API setup:

- [ ] Instance ID is correct (numeric)
- [ ] API Token is correct (long string)
- [ ] API URL matches your instance (check number)
- [ ] WhatsApp is authorized (scan QR if needed)
- [ ] Test button shows ✅ "Connected! Status: authorized"
- [ ] Test message sent successfully
- [ ] Message appears in recipient's WhatsApp
- [ ] Usage tracked in database

---

## 🔥 Common Green API Hosts

Your instance might use different URLs:

```
https://7105.api.greenapi.com  ← Instance 7105xxx
https://1234.api.greenapi.com  ← Instance 1234xxx
https://api.green-api.com      ← Generic endpoint
```

**Match the number to your instance ID!**

---

## 📊 Green API Features Supported

✅ **Text Messages** - Send formatted text
✅ **Media Messages** - Images, videos, documents
✅ **Link Preview** - Automatic or disabled
✅ **Quoted Messages** - Reply to specific messages
✅ **Bulk Sending** - With rate limiting
✅ **Connection Status** - Check authorization
✅ **Instance Management** - Logout, reboot
✅ **Webhooks** - Receive messages (optional)
✅ **Settings Management** - Configure instance

---

## 🎯 Integration Test Results

### ✅ Successful Test Shows:
```
✅ Connected! Status: authorized
Phone: +255712345678
Instance: 7105284900
```

### ❌ Failed Test Shows:
```
❌ Status: notAuthorized. Please scan QR code to authorize.
```

**If not authorized:** Scan QR code in Green API console!

---

## 💡 Pro Tips

### Tip 1: Instance URL Matching
```
Instance ID: 7105284900
API URL: https://7105.api.greenapi.com
                  ↑
Note: Number matches!
```

### Tip 2: Phone Number Format
```
✅ Good formats:
   255712345678@c.us (with @c.us)
   +255712345678 (with country code)
   255712345678 (clean number)

❌ Bad formats:
   0712345678 (missing country code)
   +255-712-345-678 (with dashes - will be cleaned)
```

### Tip 3: Rate Limiting
```
Free Plan: ~100 messages/day
Paid Plans: Higher limits
Best Practice: Add delay_send_ms: 1000
```

### Tip 4: Authorization Status
```
authorized     → ✅ Ready to send
notAuthorized  → ❌ Scan QR code
sleepMode      → ⚠️  Phone is offline
blocked        → ❌ Instance blocked
```

---

## 🌟 What's Different from Other WhatsApp APIs

### Green API Advantages:
✅ **Easy Setup** - Just scan QR code
✅ **No Phone Required** - Use any WhatsApp number
✅ **Webhooks** - Receive messages easily
✅ **Media Support** - Send any file type
✅ **Reliable** - High uptime
✅ **Affordable** - Free tier available
✅ **Global** - Works worldwide

### URL Structure:
```
Format: https://{INSTANCE_NUMBER}.api.greenapi.com/waInstance{INSTANCE_ID}/{ACTION}/{TOKEN}

Example:
POST https://7105.api.greenapi.com/waInstance7105284900/sendMessage/abc123...
```

---

## 🎊 Complete Field List

| Field | Type | Required | Purpose | Example |
|-------|------|----------|---------|---------|
| Instance ID | Text | ✅ | WhatsApp instance | 7105284900 |
| API Token | Password | ✅ | Authentication | abc123... |
| Phone Number | Text | ❌ | Reference only | +255712345678 |
| API URL | URL | ✅ | API endpoint | https://7105.api.greenapi.com |
| Webhook URL | URL | ❌ | Receive messages | https://yourapp.com/webhook |
| Webhook Token | Password | ❌ | Webhook security | secret123 |
| Link Preview | Checkbox | ❌ | Show link previews | true |
| Auto-mark Read | Checkbox | ❌ | Mark as read | false |
| Message Delay | Number | ❌ | Bulk send delay | 1000 |

**Total: 9 fields - 3 required, 6 optional**

---

## 🔍 Verification Query

Check your Green API setup in database:

```sql
SELECT 
  integration_name,
  provider_name,
  credentials->>'instance_id' as "Instance ID",
  credentials->>'phone_number' as "Phone",
  config->>'api_url' as "API URL",
  config->>'webhook_url' as "Webhook",
  config->>'link_preview' as "Link Preview",
  config->>'delay_send_ms' as "Delay (ms)",
  is_enabled
FROM lats_pos_integrations_settings
WHERE integration_name = 'WHATSAPP_GATEWAY';
```

**Expected:**
```
integration_name | provider | Instance ID | Phone         | API URL                         | Webhook | Link Preview | Delay
-----------------|----------|-------------|---------------|---------------------------------|---------|--------------|-------
WHATSAPP_GATEWAY | Green API| 7105284900  | +255712345678 | https://7105.api.greenapi.com  | https...| true         | 1000
```

---

## ✅ Complete Setup Summary

### Minimum Setup (2 fields):
```
✅ Instance ID
✅ API Token
```

### Recommended Setup (5 fields):
```
✅ Instance ID
✅ API Token
✅ Phone Number
✅ API URL
✅ Link Preview enabled
```

### Full Setup (9 fields):
```
✅ All credentials (3)
✅ All configuration (6)
✅ Webhooks configured
✅ Settings optimized
✅ Ready for production
```

---

## 🎉 You're Ready!

Your Green API WhatsApp integration now has:

✅ **All Required Fields** - Instance ID, API Token
✅ **All Optional Fields** - For advanced features
✅ **Complete Configuration** - Webhooks, delays, etc.
✅ **Test Button** - One-click connection test
✅ **Production-Ready** - All features available

**Just add your Green API credentials and start sending WhatsApp messages!** 💬🚀

---

## 📚 Related Documentation

- **Green API Docs:** https://green-api.com/docs/
- **Get API Key:** https://console.green-api.com
- **Pricing:** https://green-api.com/pricing
- **Support:** https://green-api.com/support

---

**Your Green API integration is complete and production-ready!** ✅

