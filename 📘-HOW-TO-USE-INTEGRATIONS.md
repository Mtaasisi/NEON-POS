# 📘 How to Use the Integrations Management System

## ✅ What's Been Added

You now have a comprehensive integrations management system in your Admin Settings! Here's what you can do:

### 🎯 Features

1. **Manage All Integrations** from one place in Admin Settings
2. **Add/Edit/Delete** any integration easily
3. **Store API Keys** securely in the database
4. **Enable/Disable** integrations with one click
5. **Fetch credentials** from anywhere in your app

---

## 🚀 Quick Start

### 1. Access Integrations Management

Go to: **Admin Settings → Integrations**

You'll see:
- ✅ All your active integrations
- ➕ Templates to add new integrations
- ⚙️ Options to edit, enable/disable, or delete

---

## 📋 Available Integrations

Your system comes pre-configured with templates for:

### 📱 **SMS Services**
- **MShastra** (Tanzania) - Send SMS notifications
- Fields: API Key, Sender ID

### 💬 **WhatsApp**
- **Green API** - Send WhatsApp messages
- Fields: Instance ID, API Token, API URL

### 📧 **Email Services**
- **SendGrid** - Send email receipts
- Fields: API Key, Sender Email, Sender Name

### 💳 **Payment Gateways**

#### M-Pesa (Vodacom)
- Accept mobile money payments
- Fields: Consumer Key, Consumer Secret, Business Shortcode, Passkey, Callback URL

#### Stripe
- Accept international card payments
- Fields: Publishable Key, Secret Key, Webhook Secret, Currency

### 📊 **Analytics**
- **Google Analytics** - Track user behavior
- Fields: Tracking ID, Measurement ID

### 🤖 **AI Services**
- **Google Gemini** - AI-powered features
- Fields: API Key, Model

### 🌐 **Custom API**
- Add any custom API integration
- Fields: API Key, API URL, Timeout

---

## 🔧 How to Add an Integration

### Step 1: Go to Admin Settings
```
Admin Settings → Integrations → Add New Integration
```

### Step 2: Click on the Integration Card
Choose from available templates (e.g., SMS Gateway, WhatsApp, M-Pesa)

### Step 3: Fill in the Details

**Basic Information:**
- Provider Name
- Description
- Environment (Test/Sandbox/Production)
- Enable Integration (checkbox)

**Credentials:**
- Enter your API keys and credentials
- Password fields are hidden by default (click eye icon to reveal)

**Configuration:**
- Additional settings specific to the integration

### Step 4: Save
Click **"Save Integration"** button

---

## 💻 How to Use Integrations in Your Code

### Example 1: Get SMS Credentials

```typescript
import { getCredentials } from '@/lib/integrationsApi';

// Get SMS credentials
const smsCredentials = await getCredentials('SMS_GATEWAY');

if (smsCredentials) {
  console.log('API Key:', smsCredentials.api_key);
  console.log('Sender ID:', smsCredentials.sender_id);
  
  // Use credentials to send SMS
  await sendSMS({
    apiKey: smsCredentials.api_key,
    senderId: smsCredentials.sender_id,
    to: '+255123456789',
    message: 'Hello from LATS POS!'
  });
}
```

### Example 2: Get All Enabled Integrations

```typescript
import { getEnabledIntegrations } from '@/lib/integrationsApi';

const enabledIntegrations = await getEnabledIntegrations();

console.log('Active integrations:', enabledIntegrations.map(i => i.integration_name));
```

### Example 3: Get Integration by Type

```typescript
import { getIntegrationsByType } from '@/lib/integrationsApi';

// Get all payment gateways
const paymentGateways = await getIntegrationsByType('payment');

console.log('Available payment methods:', paymentGateways);
```

### Example 4: Update Usage Statistics

```typescript
import { updateIntegrationUsage } from '@/lib/integrationsApi';

try {
  // Send SMS
  await sendSMS(...);
  
  // Update successful usage
  await updateIntegrationUsage('SMS_GATEWAY', true);
} catch (error) {
  // Update failed usage
  await updateIntegrationUsage('SMS_GATEWAY', false);
}
```

### Example 5: Check if Integration is Enabled

```typescript
import { getIntegration } from '@/lib/integrationsApi';

const smsIntegration = await getIntegration('SMS_GATEWAY');

if (smsIntegration?.is_enabled) {
  // Integration is active, use it
  console.log('SMS is enabled');
} else {
  // Show alternative or message
  console.log('SMS is not configured');
}
```

---

## 🎯 Real-World Usage Examples

### 1. Send Receipt via SMS

```typescript
import { getCredentials } from '@/lib/integrationsApi';

async function sendReceiptSMS(phoneNumber: string, receiptData: any) {
  // Get SMS credentials from database
  const smsConfig = await getCredentials('SMS_GATEWAY');
  
  if (!smsConfig) {
    toast.error('SMS service not configured');
    return;
  }
  
  // Use the credentials
  const message = `
    Receipt #${receiptData.id}
    Total: ${receiptData.total}
    Thank you for your purchase!
  `;
  
  await fetch('https://api.mshastra.com/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${smsConfig.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: smsConfig.sender_id,
      to: phoneNumber,
      message: message
    })
  });
}
```

### 2. Process M-Pesa Payment

```typescript
import { getIntegration } from '@/lib/integrationsApi';

async function processMpesaPayment(amount: number, phoneNumber: string) {
  const mpesa = await getIntegration('MPESA_PAYMENT');
  
  if (!mpesa?.is_enabled) {
    throw new Error('M-Pesa not configured');
  }
  
  const credentials = mpesa.credentials;
  const config = mpesa.config;
  
  // Get OAuth token
  const token = await getMpesaToken(
    credentials.consumer_key,
    credentials.consumer_secret
  );
  
  // Initiate STK Push
  const response = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      BusinessShortCode: credentials.business_short_code,
      Password: generatePassword(credentials.business_short_code, credentials.passkey),
      Timestamp: getTimestamp(),
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: credentials.business_short_code,
      PhoneNumber: phoneNumber,
      CallBackURL: config.callback_url,
      AccountReference: 'LATS POS',
      TransactionDesc: 'Payment'
    })
  });
  
  return response.json();
}
```

### 3. Send WhatsApp Receipt

```typescript
import { getCredentials } from '@/lib/integrationsApi';

async function sendWhatsAppReceipt(phoneNumber: string, receiptText: string) {
  const whatsapp = await getCredentials('WHATSAPP_GATEWAY');
  
  if (!whatsapp) {
    console.log('WhatsApp not configured');
    return;
  }
  
  const url = `${whatsapp.api_url}/waInstance${whatsapp.instance_id}/sendMessage/${whatsapp.api_token}`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: `${phoneNumber}@c.us`,
      message: receiptText
    })
  });
}
```

---

## 🔐 Security Best Practices

### 1. **Never Expose Credentials in Frontend**
```typescript
// ❌ BAD - Don't do this
const apiKey = 'sk_live_actual_key_here';

// ✅ GOOD - Fetch from database
const credentials = await getCredentials('INTEGRATION_NAME');
```

### 2. **Use Test Mode for Development**
Always set `is_test_mode: true` and `environment: 'test'` during development

### 3. **Enable Only When Ready**
Keep integrations disabled (`is_enabled: false`) until properly configured

### 4. **Use Environment-Specific Keys**
- Test keys for development
- Production keys only in production

---

## 📊 Monitor Usage

### View Statistics

Each integration tracks:
- `total_requests` - Total API calls made
- `successful_requests` - Successful calls
- `failed_requests` - Failed calls
- `last_used_at` - Last usage timestamp

You can query these in your database:

```sql
SELECT 
  integration_name,
  provider_name,
  total_requests,
  successful_requests,
  failed_requests,
  ROUND((successful_requests::float / NULLIF(total_requests, 0) * 100)::numeric, 2) || '%' as "Success Rate"
FROM lats_pos_integrations_settings
WHERE is_enabled = true
ORDER BY total_requests DESC;
```

---

## 🆘 Troubleshooting

### Integration Not Showing
- Make sure it's enabled in Admin Settings
- Check `is_enabled` and `is_active` are both `true`

### Credentials Not Working
- Verify you're using the correct keys
- Check if you're in test/production mode
- Ensure keys match the environment

### Can't Save Integration
- Check all required fields are filled
- Verify you have admin permissions
- Check browser console for errors

---

## 🎉 You're All Set!

Your integrations system is now ready to use. You can:

1. ✅ Add any integration from Admin Settings
2. ✅ Store credentials securely in the database
3. ✅ Fetch and use credentials anywhere in your app
4. ✅ Monitor usage statistics
5. ✅ Enable/disable integrations easily

---

## 🔗 Related Files

- **API Functions**: `src/lib/integrationsApi.ts`
- **UI Component**: `src/features/admin/components/IntegrationsManagement.tsx`
- **Admin Page**: `src/features/admin/pages/AdminSettingsPage.tsx`
- **Database Table**: `lats_pos_integrations_settings`

---

**Need Help?** Check the existing integrations in your Admin Settings for examples! 🚀

