# 📋 Integration Templates & Credentials Guide

Copy these templates to quickly add popular integrations!

---

## 📱 SMS SERVICES

### Twilio
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'TWILIO_SMS',
  'sms',
  'Twilio',
  true, true, 'test',
  jsonb_build_object(
    'account_sid', 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'auth_token', 'your_auth_token',
    'messaging_service_sid', 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  ),
  jsonb_build_object(
    'default_sender', '+1234567890',
    'max_retries', 3,
    'timeout', 30000
  ),
  'Twilio SMS Gateway'
);
```
**Where to get credentials:** https://console.twilio.com

---

### Africa's Talking
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'AFRICASTALKING_SMS',
  'sms',
  'Africa''s Talking',
  true, true, 'sandbox',
  jsonb_build_object(
    'api_key', 'your_api_key',
    'username', 'sandbox', -- or your username
    'sender_id', 'YourBrand'
  ),
  jsonb_build_object(
    'max_retries', 2,
    'enable_delivery_reports', true
  ),
  'Africa''s Talking SMS'
);
```
**Where to get credentials:** https://account.africastalking.com

---

### Vonage (Nexmo)
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'VONAGE_SMS',
  'sms',
  'Vonage',
  true, false, 'production',
  jsonb_build_object(
    'api_key', 'your_api_key',
    'api_secret', 'your_api_secret',
    'sender_id', 'YourBrand'
  ),
  jsonb_build_object(
    'default_type', 'text',
    'enable_unicode', true
  ),
  'Vonage SMS Service'
);
```
**Where to get credentials:** https://dashboard.nexmo.com

---

## 📧 EMAIL SERVICES

### SendGrid
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'SENDGRID_EMAIL',
  'email',
  'SendGrid',
  true, false, 'production',
  jsonb_build_object(
    'api_key', 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'sender_email', 'noreply@yourbusiness.com',
    'sender_name', 'Your Business'
  ),
  jsonb_build_object(
    'enable_tracking', true,
    'enable_click_tracking', true,
    'sandbox_mode', false
  ),
  'SendGrid Email Service'
);
```
**Where to get credentials:** https://app.sendgrid.com/settings/api_keys

---

### Mailgun
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'MAILGUN_EMAIL',
  'email',
  'Mailgun',
  true, false, 'production',
  jsonb_build_object(
    'api_key', 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'domain', 'mg.yourdomain.com',
    'sender_email', 'noreply@yourdomain.com'
  ),
  jsonb_build_object(
    'enable_tracking', true,
    'testmode', false
  ),
  'Mailgun Email Service'
);
```
**Where to get credentials:** https://app.mailgun.com/app/sending/domains

---

### Amazon SES
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'AWS_SES_EMAIL',
  'email',
  'Amazon SES',
  true, false, 'production',
  jsonb_build_object(
    'access_key_id', 'AKIAXXXXXXXXXXXXXXXX',
    'secret_access_key', 'your_secret_access_key',
    'region', 'us-east-1',
    'sender_email', 'noreply@yourdomain.com'
  ),
  jsonb_build_object(
    'configuration_set', 'your_config_set',
    'enable_tracking', true
  ),
  'Amazon SES Email'
);
```
**Where to get credentials:** AWS Console → SES → SMTP Settings

---

### SMTP (Generic)
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'SMTP_EMAIL',
  'email',
  'SMTP Server',
  true, false, 'production',
  jsonb_build_object(
    'host', 'smtp.gmail.com', -- or your SMTP server
    'port', 587,
    'username', 'your@email.com',
    'password', 'your_password',
    'sender_email', 'your@email.com'
  ),
  jsonb_build_object(
    'secure', false,
    'tls', true
  ),
  'Generic SMTP Email'
);
```

---

## 💳 PAYMENT GATEWAYS

### Stripe
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'STRIPE_PAYMENT',
  'payment',
  'Stripe',
  true, true, 'test',
  jsonb_build_object(
    'publishable_key', 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx',
    'secret_key', 'sk_test_YOUR_SECRET_KEY_HERE',
    'webhook_secret', 'whsec_xxxxxxxxxxxxxxxxxxxxxxxx'
  ),
  jsonb_build_object(
    'currency', 'usd',
    'capture_method', 'automatic',
    'enable_saved_cards', true
  ),
  'Stripe Payment Gateway'
);
```
**Where to get credentials:** https://dashboard.stripe.com/apikeys

---

### M-Pesa (Safaricom - Kenya)
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'MPESA_SAFARICOM',
  'payment',
  'M-Pesa Safaricom',
  true, true, 'sandbox',
  jsonb_build_object(
    'consumer_key', 'xxxxxxxxxxxxxxxxxxxxxxxx',
    'consumer_secret', 'xxxxxxxxxxxxxxxxxxxxxxxx',
    'business_short_code', '174379',
    'passkey', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    'initiator_name', 'testapi',
    'security_credential', 'your_security_credential'
  ),
  jsonb_build_object(
    'transaction_type', 'CustomerPayBillOnline',
    'callback_url', 'https://yourapp.com/api/mpesa/callback',
    'timeout_url', 'https://yourapp.com/api/mpesa/timeout'
  ),
  'M-Pesa Kenya Payment'
);
```
**Where to get credentials:** https://developer.safaricom.co.ke

---

### M-Pesa (Vodacom - Tanzania)
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'MPESA_VODACOM',
  'payment',
  'M-Pesa Vodacom',
  true, true, 'sandbox',
  jsonb_build_object(
    'api_key', 'your_api_key',
    'public_key', 'your_public_key',
    'service_provider_code', 'your_code'
  ),
  jsonb_build_object(
    'market', 'TZN',
    'currency', 'TZS'
  ),
  'M-Pesa Tanzania Payment'
);
```
**Where to get credentials:** https://developer.mpesa.vm.co.tz

---

### PayPal
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'PAYPAL_PAYMENT',
  'payment',
  'PayPal',
  true, true, 'sandbox',
  jsonb_build_object(
    'client_id', 'your_client_id',
    'client_secret', 'your_client_secret',
    'mode', 'sandbox' -- or 'live'
  ),
  jsonb_build_object(
    'currency', 'USD',
    'intent', 'sale'
  ),
  'PayPal Payment Gateway'
);
```
**Where to get credentials:** https://developer.paypal.com

---

### Flutterwave
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'FLUTTERWAVE_PAYMENT',
  'payment',
  'Flutterwave',
  true, true, 'test',
  jsonb_build_object(
    'public_key', 'FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxxxxxx',
    'secret_key', 'FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxx',
    'encryption_key', 'FLWSECK_TESTxxxxxxxxxxxxxxxx'
  ),
  jsonb_build_object(
    'currency', 'TZS',
    'country', 'TZ'
  ),
  'Flutterwave Payment'
);
```
**Where to get credentials:** https://dashboard.flutterwave.com/settings/apis

---

### Paystack
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'PAYSTACK_PAYMENT',
  'payment',
  'Paystack',
  true, true, 'test',
  jsonb_build_object(
    'public_key', 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx',
    'secret_key', 'sk_test_xxxxxxxxxxxxxxxxxxxxxxxx'
  ),
  jsonb_build_object(
    'currency', 'NGN'
  ),
  'Paystack Payment Gateway'
);
```
**Where to get credentials:** https://dashboard.paystack.com/#/settings/developer

---

## 📊 ANALYTICS & TRACKING

### Google Analytics
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'GOOGLE_ANALYTICS',
  'analytics',
  'Google Analytics',
  false, false, 'production',
  jsonb_build_object(
    'tracking_id', 'UA-XXXXXXXXX-X',
    'measurement_id', 'G-XXXXXXXXXX'
  ),
  jsonb_build_object(
    'enable_ecommerce', true,
    'anonymize_ip', true
  ),
  'Google Analytics Tracking'
);
```
**Where to get credentials:** https://analytics.google.com/analytics/web/#/a{account_id}w{property_id}p{view_id}/admin/property/settings

---

### Mixpanel
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'MIXPANEL_ANALYTICS',
  'analytics',
  'Mixpanel',
  false, false, 'production',
  jsonb_build_object(
    'project_token', 'your_project_token',
    'api_secret', 'your_api_secret'
  ),
  jsonb_build_object(
    'track_pageviews', true
  ),
  'Mixpanel Analytics'
);
```
**Where to get credentials:** https://mixpanel.com/project/{project_id}/settings#project

---

## 🚚 SHIPPING & DELIVERY

### Local Delivery API (Custom)
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'LOCAL_DELIVERY',
  'shipping',
  'Local Delivery Service',
  false, true, 'test',
  jsonb_build_object(
    'api_key', 'your_api_key',
    'merchant_id', 'MERCHANT_12345',
    'base_url', 'https://api.delivery-service.com'
  ),
  jsonb_build_object(
    'enable_tracking', true,
    'default_vehicle', 'bike',
    'pickup_address', 'Your Store Address'
  ),
  'Local Delivery API'
);
```

---

## 🔔 PUSH NOTIFICATIONS

### Firebase Cloud Messaging (FCM)
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'FCM_PUSH',
  'notifications',
  'Firebase Cloud Messaging',
  false, false, 'production',
  jsonb_build_object(
    'server_key', 'your_server_key',
    'sender_id', 'your_sender_id',
    'project_id', 'your_project_id'
  ),
  jsonb_build_object(
    'priority', 'high',
    'time_to_live', 86400
  ),
  'Firebase Push Notifications'
);
```
**Where to get credentials:** Firebase Console → Project Settings → Cloud Messaging

---

## 🖼️ MEDIA & STORAGE

### Cloudinary
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'CLOUDINARY_STORAGE',
  'storage',
  'Cloudinary',
  false, false, 'production',
  jsonb_build_object(
    'cloud_name', 'your_cloud_name',
    'api_key', 'your_api_key',
    'api_secret', 'your_api_secret'
  ),
  jsonb_build_object(
    'folder', 'pos_images',
    'use_filename', true
  ),
  'Cloudinary Image Storage'
);
```
**Where to get credentials:** https://cloudinary.com/console

---

### AWS S3
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'AWS_S3_STORAGE',
  'storage',
  'Amazon S3',
  false, false, 'production',
  jsonb_build_object(
    'access_key_id', 'AKIAXXXXXXXXXXXXXXXX',
    'secret_access_key', 'your_secret_access_key',
    'region', 'us-east-1',
    'bucket', 'your-bucket-name'
  ),
  jsonb_build_object(
    'acl', 'public-read',
    'content_type', 'image/jpeg'
  ),
  'AWS S3 Storage'
);
```

---

## 🐛 ERROR TRACKING

### Sentry
```sql
INSERT INTO lats_pos_integrations_settings (
  user_id, integration_name, integration_type, provider_name,
  is_enabled, is_test_mode, environment, credentials, config, description
) VALUES (
  'YOUR_USER_ID',
  'SENTRY_ERRORS',
  'monitoring',
  'Sentry',
  false, false, 'production',
  jsonb_build_object(
    'dsn', 'https://xxxxx@sentry.io/xxxxx',
    'auth_token', 'your_auth_token'
  ),
  jsonb_build_object(
    'environment', 'production',
    'trace_sample_rate', 1.0
  ),
  'Sentry Error Tracking'
);
```
**Where to get credentials:** https://sentry.io/settings/

---

## 💡 Tips

1. **Always use test/sandbox credentials first**
2. **Replace `'YOUR_USER_ID'` with your actual user ID**
3. **Never commit credentials to Git**
4. **Store encryption keys in environment variables**
5. **Test each integration after adding it**

---

## 📚 Need More?

Check the full documentation:
- `📖-INTEGRATIONS-USAGE-GUIDE.md` - Complete usage guide
- `🚀-QUICK-START-INTEGRATIONS.md` - Quick start guide
- `MANAGE-INTEGRATIONS.sql` - Management queries

