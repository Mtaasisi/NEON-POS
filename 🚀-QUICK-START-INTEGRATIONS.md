# 🚀 Quick Start - Integration Settings

Get up and running in 5 minutes!

---

## ✅ Step 1: Create the Database Table

1. Open your **Neon Database Console**
2. Run this file:
   ```
   CREATE-INTEGRATIONS-SETTINGS.sql
   ```
3. You should see: `✅ Integrations Settings Table Created Successfully!`

---

## ✅ Step 2: Get Your User ID

In your Neon console, run:

```sql
SELECT id FROM auth.users WHERE email = 'your@email.com';
```

Copy the UUID that appears (something like `123e4567-e89b-12d3-a456-426614174000`)

---

## ✅ Step 3: Add Your First Integration

### Option A: Using the Example File

1. Open `EXAMPLE-INTEGRATIONS-INSERT.sql`
2. Replace `'YOUR_USER_ID'` with your actual user ID
3. Update the credentials with your actual API keys
4. Run the file in Neon console

### Option B: Manual Insert

Run this in Neon console (replace the values):

```sql
INSERT INTO lats_pos_integrations_settings (
  user_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  credentials,
  config,
  description
) VALUES (
  'YOUR_USER_ID_HERE', -- Replace with your user_id
  'SMS_GATEWAY',
  'sms',
  'Twilio',
  true,
  true,
  'test',
  jsonb_build_object(
    'account_sid', 'YOUR_ACCOUNT_SID',
    'auth_token', 'YOUR_AUTH_TOKEN',
    'messaging_service_sid', 'YOUR_MESSAGING_SERVICE_SID'
  ),
  jsonb_build_object(
    'default_sender', '+1234567890',
    'max_retries', 3,
    'timeout', 30000
  ),
  'Twilio SMS Gateway for sending receipts'
);
```

---

## ✅ Step 4: Verify It Works

Run this query:

```sql
SELECT 
  integration_name,
  provider_name,
  is_enabled,
  environment
FROM lats_pos_integrations_settings;
```

You should see your integration listed!

---

## ✅ Step 5: Use It in Your Code

### A. Create the API File

Copy the TypeScript code from `📖-INTEGRATIONS-USAGE-GUIDE.md` section **"TypeScript API"** into:

```
src/lib/api/integrationsApi.ts
```

### B. Use It Anywhere

```typescript
import { getCredentials } from '@/lib/api/integrationsApi';

// Example: Get SMS credentials
const credentials = await getCredentials('SMS_GATEWAY');

if (credentials) {
  console.log('SMS Account SID:', credentials.account_sid);
  console.log('Auth Token:', credentials.auth_token);
}
```

---

## 🎯 What You Can Do Now

### 1. **Add More Integrations**

Use the examples in `EXAMPLE-INTEGRATIONS-INSERT.sql`:
- ✉️ Email (SendGrid)
- 💳 Payments (Stripe, M-Pesa)
- 📊 Analytics (Google Analytics)
- 🚚 Delivery Services

### 2. **Manage Integrations**

Use queries from `MANAGE-INTEGRATIONS.sql`:
- View all integrations
- Enable/disable
- Update credentials
- Check health status
- View usage statistics

### 3. **Build a Settings UI**

Use the React form example from `📖-INTEGRATIONS-USAGE-GUIDE.md`

---

## 💡 Common Integration Examples

### SMS Services
- **Twilio**: Most popular, works globally
- **Africa's Talking**: Best for African markets
- **Vonage** (formerly Nexmo)
- **AWS SNS**

### Email Services
- **SendGrid**: Easy to use
- **Mailgun**: Developer-friendly
- **Amazon SES**: Cheap for high volume
- **Postmark**: Great for transactional emails

### Payment Gateways
- **Stripe**: International cards
- **M-Pesa**: East Africa mobile money
- **PayPal**: Global payments
- **Flutterwave**: African payments
- **Paystack**: Nigerian market

### Others
- **Google Analytics**: Track user behavior
- **Sentry**: Error monitoring
- **Cloudinary**: Image hosting
- **Firebase**: Push notifications

---

## 🆘 Troubleshooting

### "Table doesn't exist"
Run `CREATE-INTEGRATIONS-SETTINGS.sql` again

### "User ID not found"
Make sure you're logged in and run:
```sql
SELECT id FROM auth.users LIMIT 1;
```

### "Credentials not working"
Check if integration is enabled:
```sql
SELECT integration_name, is_enabled, is_active 
FROM lats_pos_integrations_settings;
```

### "Can't see my integration"
Verify user_id matches:
```sql
SELECT integration_name, user_id 
FROM lats_pos_integrations_settings;
```

---

## 📚 Next Steps

1. Read the full guide: `📖-INTEGRATIONS-USAGE-GUIDE.md`
2. Check management queries: `MANAGE-INTEGRATIONS.sql`
3. Build your settings UI
4. Add more integrations as needed

---

## 🎉 That's It!

You now have a flexible system to integrate ANY service without hardcoding credentials!

Need help? Check the full documentation in `📖-INTEGRATIONS-USAGE-GUIDE.md`

