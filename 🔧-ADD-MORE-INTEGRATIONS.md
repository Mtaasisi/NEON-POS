# 🔧 How to Add More Integration Templates

Want to add more integrations to your system? Here's how!

---

## 📝 Quick Steps

1. Open `src/lib/integrationsApi.ts`
2. Find the `getIntegrationTemplates()` function
3. Add your new integration template
4. Save and refresh Admin Settings

---

## 🎯 Template Structure

```typescript
{
  integration_name: 'UNIQUE_NAME',        // Must be unique
  integration_type: 'sms',                // Type: sms, email, payment, analytics, shipping, whatsapp, ai, custom
  provider_name: 'Provider Display Name', // What users see
  icon: 'IconName',                       // Icon to display
  description: 'What this integration does',
  
  // Credentials fields (API keys, secrets, etc.)
  credentials_fields: [
    {
      name: 'api_key',              // Field name in database
      label: 'API Key',             // Display label
      type: 'password',             // Field type: text, password, url, number
      required: true,               // Is this field required?
      placeholder: 'Enter API key'  // Placeholder text
    }
  ],
  
  // Configuration fields (settings, options, etc.)
  config_fields: [
    {
      name: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      required: false,
      placeholder: '30000'
    }
  ]
}
```

---

## 🌟 Real Examples

### Example 1: Add Tigo Pesa Integration

```typescript
{
  integration_name: 'TIGOPESA_PAYMENT',
  integration_type: 'payment',
  provider_name: 'Tigo Pesa',
  icon: 'CreditCard',
  description: 'Accept Tigo Pesa mobile money payments',
  credentials_fields: [
    {
      name: 'merchant_code',
      label: 'Merchant Code',
      type: 'text',
      required: true,
      placeholder: 'Your Tigo Pesa merchant code'
    },
    {
      name: 'merchant_pin',
      label: 'Merchant PIN',
      type: 'password',
      required: true,
      placeholder: 'Your merchant PIN'
    },
    {
      name: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Tigo Pesa API key'
    }
  ],
  config_fields: [
    {
      name: 'api_url',
      label: 'API URL',
      type: 'url',
      required: true,
      placeholder: 'https://api.tigo.co.tz'
    },
    {
      name: 'callback_url',
      label: 'Callback URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourapp.com/api/tigopesa/callback'
    }
  ]
}
```

### Example 2: Add Twilio SMS

```typescript
{
  integration_name: 'TWILIO_SMS',
  integration_type: 'sms',
  provider_name: 'Twilio',
  icon: 'Smartphone',
  description: 'Send SMS via Twilio (Global Coverage)',
  credentials_fields: [
    {
      name: 'account_sid',
      label: 'Account SID',
      type: 'text',
      required: true,
      placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    {
      name: 'auth_token',
      label: 'Auth Token',
      type: 'password',
      required: true,
      placeholder: 'Your Twilio auth token'
    },
    {
      name: 'phone_number',
      label: 'From Phone Number',
      type: 'text',
      required: true,
      placeholder: '+1234567890'
    }
  ],
  config_fields: [
    {
      name: 'max_retries',
      label: 'Max Retries',
      type: 'number',
      required: false,
      placeholder: '3'
    }
  ]
}
```

### Example 3: Add Mailgun Email

```typescript
{
  integration_name: 'MAILGUN_EMAIL',
  integration_type: 'email',
  provider_name: 'Mailgun',
  icon: 'Mail',
  description: 'Send transactional emails via Mailgun',
  credentials_fields: [
    {
      name: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxx'
    },
    {
      name: 'domain',
      label: 'Domain',
      type: 'text',
      required: true,
      placeholder: 'mg.yourdomain.com'
    },
    {
      name: 'sender_email',
      label: 'Sender Email',
      type: 'text',
      required: true,
      placeholder: 'noreply@yourdomain.com'
    }
  ],
  config_fields: [
    {
      name: 'region',
      label: 'Region',
      type: 'select',
      required: true,
      options: [
        { value: 'us', label: 'US' },
        { value: 'eu', label: 'EU' }
      ]
    }
  ]
}
```

### Example 4: Add PayPal Payment

```typescript
{
  integration_name: 'PAYPAL_PAYMENT',
  integration_type: 'payment',
  provider_name: 'PayPal',
  icon: 'CreditCard',
  description: 'Accept PayPal payments worldwide',
  credentials_fields: [
    {
      name: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'Your PayPal client ID'
    },
    {
      name: 'client_secret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Your PayPal client secret'
    }
  ],
  config_fields: [
    {
      name: 'mode',
      label: 'Mode',
      type: 'select',
      required: true,
      options: [
        { value: 'sandbox', label: 'Sandbox' },
        { value: 'live', label: 'Live' }
      ]
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'text',
      required: true,
      placeholder: 'USD'
    }
  ]
}
```

### Example 5: Add Cloudinary Media Storage

```typescript
{
  integration_name: 'CLOUDINARY_STORAGE',
  integration_type: 'custom',
  provider_name: 'Cloudinary',
  icon: 'Cloud',
  description: 'Store and manage images in the cloud',
  credentials_fields: [
    {
      name: 'cloud_name',
      label: 'Cloud Name',
      type: 'text',
      required: true,
      placeholder: 'your-cloud-name'
    },
    {
      name: 'api_key',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Your Cloudinary API key'
    },
    {
      name: 'api_secret',
      label: 'API Secret',
      type: 'password',
      required: true,
      placeholder: 'Your Cloudinary API secret'
    }
  ],
  config_fields: [
    {
      name: 'upload_preset',
      label: 'Upload Preset',
      type: 'text',
      required: false,
      placeholder: 'unsigned_preset'
    },
    {
      name: 'folder',
      label: 'Default Folder',
      type: 'text',
      required: false,
      placeholder: 'lats-pos-uploads'
    }
  ]
}
```

---

## 📋 Field Types Reference

### Input Types
- `text` - Regular text input
- `password` - Hidden password input (with show/hide toggle)
- `url` - URL input with validation
- `number` - Numeric input
- `select` - Dropdown select (requires `options` array)
- `checkbox` - Boolean checkbox

### Select Field with Options
```typescript
{
  name: 'environment',
  label: 'Environment',
  type: 'select',
  required: true,
  options: [
    { value: 'test', label: 'Test' },
    { value: 'production', label: 'Production' }
  ]
}
```

---

## 🎨 Available Icons

Choose from these icons (must match exact name):
- `Smartphone` - Phone/SMS
- `MessageCircle` - WhatsApp/Chat
- `Mail` - Email
- `CreditCard` - Payments
- `BarChart` - Analytics
- `Zap` - AI/Fast services
- `Globe` - General/Custom APIs
- `Cloud` - Cloud storage
- `Database` - Databases
- `Server` - Servers
- `Shield` - Security

---

## ✅ Complete Example: Adding a New Integration

Let's add **Africa's Talking SMS** step by step:

### Step 1: Open the file
```
src/lib/integrationsApi.ts
```

### Step 2: Find this function (around line 280)
```typescript
export function getIntegrationTemplates(): IntegrationTemplate[] {
  return [
    // ... existing integrations
  ];
}
```

### Step 3: Add your new integration before the closing `]`
```typescript
// Africa's Talking SMS
{
  integration_name: 'AFRICASTALKING_SMS',
  integration_type: 'sms',
  provider_name: 'Africa\'s Talking',
  icon: 'Smartphone',
  description: 'Send SMS across Africa with Africa\'s Talking',
  credentials_fields: [
    {
      name: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Africa\'s Talking API key'
    },
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'Your Africa\'s Talking username'
    },
    {
      name: 'sender_id',
      label: 'Sender ID',
      type: 'text',
      required: true,
      placeholder: 'LATS POS'
    }
  ],
  config_fields: [
    {
      name: 'environment',
      label: 'Environment',
      type: 'select',
      required: true,
      options: [
        { value: 'sandbox', label: 'Sandbox' },
        { value: 'production', label: 'Production' }
      ]
    }
  ]
},
```

### Step 4: Save the file

### Step 5: Refresh Admin Settings
The new integration will appear in the "Add New Integration" section!

---

## 🎯 Tips

1. **Keep `integration_name` uppercase** with underscores (e.g., `MY_SERVICE_NAME`)
2. **Make it unique** - no duplicates allowed
3. **Choose the right type** - helps organize integrations
4. **Mark required fields** - prevents incomplete setups
5. **Add placeholders** - helps users know what to enter
6. **Test thoroughly** - add, save, enable, and use it!

---

## 🚀 What Happens Next?

After adding a template:
1. It appears in Admin Settings → Integrations
2. Users can click to add it
3. Fill in credentials and config
4. Save to database
5. Use it anywhere with `getCredentials('YOUR_INTEGRATION_NAME')`

---

## 📚 Need Help?

Check existing templates in `src/lib/integrationsApi.ts` for more examples!

Happy integrating! 🎉

