# 🚀 WhatsApp Instance - Quick Start Guide

## ✅ What's Already Done

Your WhatsApp templates have been successfully imported from your backup:
- ✅ 3 WhatsApp templates
- ✅ 9 WhatsApp message templates
- ✅ Database tables created
- ✅ All templates active and ready to use

---

## 📋 Quick Commands

### 1. Verify Import (Check what was imported)
```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
node verify-whatsapp-import.mjs
```

### 2. Configure WhatsApp Instance (Interactive setup)
```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
node configure-whatsapp-instance.mjs
```

### 3. Re-import from Backup (If needed)
```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
node import-whatsapp-data.mjs
```

---

## ⚙️ Quick Configuration (Manual SQL)

If you prefer to configure via SQL instead of the interactive script, run this in your Neon database console:

```sql
INSERT INTO whatsapp_instance_settings (
  whatsapp_instance_id,
  whatsapp_api_url,
  whatsapp_green_api_key,
  whatsapp_provider_api_key,
  whatsapp_sender_id,
  whatsapp_notifications_enabled,
  whatsapp_enable_auto,
  whatsapp_enable_bulk,
  whatsapp_test_mode,
  whatsapp_daily_limit,
  whatsapp_monthly_limit
) VALUES (
  12345,                                    -- Your instance ID
  'https://api.green-api.com',             -- Your API URL
  'your-green-api-key',                    -- Your Green API key (optional)
  'your-provider-api-key',                 -- Your provider API key
  '+255123456789',                         -- Your WhatsApp number
  true,                                     -- Enable notifications
  true,                                     -- Enable auto-send
  true,                                     -- Enable bulk send
  false,                                    -- Test mode (false = production)
  1000,                                     -- Daily limit
  20000                                     -- Monthly limit
);
```

---

## 📨 Using Templates in Your Code

### Example 1: Send Welcome Message

```javascript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function sendWelcomeMessage(customerName, customerId) {
  // Get template
  const result = await pool.query(`
    SELECT template FROM whatsapp_message_templates 
    WHERE name = 'Welcome Message' AND is_active = true
  `);
  
  // Replace variables
  let message = result.rows[0].template
    .replace('{{customerName}}', customerName)
    .replace('{{customerId}}', customerId)
    .replace('{{date}}', new Date().toLocaleDateString());
  
  // Send message via WhatsApp API
  return await sendWhatsAppMessage(phoneNumber, message);
}
```

### Example 2: Get All Active Templates

```sql
-- List all available templates
SELECT 
  name, 
  category, 
  language,
  variables
FROM whatsapp_message_templates 
WHERE is_active = true
ORDER BY category, name;
```

### Example 3: Send Promotional Offer

```javascript
async function sendPromoOffer(customerName, phoneNumber) {
  const result = await pool.query(`
    SELECT template FROM whatsapp_message_templates 
    WHERE name = 'Promotional Offer' AND is_active = true
  `);
  
  let message = result.rows[0].template
    .replace('{{customerName}}', customerName)
    .replace('{{discountAmount}}', '20%')
    .replace('{{validUntil}}', '2025-10-31')
    .replace('{{promoCode}}', 'SAVE20');
  
  return await sendWhatsAppMessage(phoneNumber, message);
}
```

---

## 🎯 Available Templates

### Greeting Templates
- **Welcome Message** - Greet new customers

### POS Templates  
- **Order Confirmation** - Confirm customer orders
- **Order Status Update** - Update order status

### Customer Support Templates
- **Support Acknowledgment** - Acknowledge support requests
- **Support Resolution** - Notify issue resolution

### Appointment Templates
- **Appointment Reminder** - Remind customers of appointments

### Marketing Templates
- **Promotional Offer** - Send promotional campaigns

### Emergency Templates
- **Emergency Alert** - Send urgent notifications

### General Templates
- **General Notification** - Send general updates

---

## 🔍 Template Variables Reference

Each template uses specific variables. Here's a quick reference:

| Template | Variables |
|----------|-----------|
| Welcome Message | `{{customerName}}`, `{{customerId}}`, `{{date}}` |
| Order Confirmation | `{{customerName}}`, `{{orderId}}`, `{{orderTotal}}`, `{{orderItems}}`, `{{deliveryDate}}` |
| Order Status Update | `{{customerName}}`, `{{orderId}}`, `{{orderStatus}}`, `{{statusDetails}}`, `{{expectedDate}}` |
| Support Acknowledgment | `{{customerName}}`, `{{supportTicket}}`, `{{responseTime}}` |
| Support Resolution | `{{customerName}}`, `{{issueDescription}}`, `{{resolution}}` |
| Appointment Reminder | `{{customerName}}`, `{{appointmentDate}}`, `{{appointmentTime}}`, `{{location}}`, `{{serviceName}}`, `{{phoneNumber}}` |
| Promotional Offer | `{{customerName}}`, `{{discountAmount}}`, `{{validUntil}}`, `{{promoCode}}` |
| Emergency Alert | `{{customerName}}`, `{{alertMessage}}`, `{{actionRequired}}`, `{{phoneNumber}}` |
| General Notification | `{{customerName}}`, `{{messageContent}}`, `{{additionalInfo}}` |

---

## 🛡️ Best Practices

### 1. Always Replace Variables
```javascript
// ✅ Good
message.replace('{{customerName}}', actualName);

// ❌ Bad - sending template with unreplaced variables
sendMessage(message);
```

### 2. Check Daily Limits
```javascript
// Check messages sent today
const sentToday = await pool.query(`
  SELECT COUNT(*) FROM whatsapp_messages 
  WHERE DATE(sent_at) = CURRENT_DATE
`);

if (sentToday.rows[0].count >= dailyLimit) {
  console.log('Daily limit reached!');
  return;
}
```

### 3. Use Test Mode During Development
```sql
-- Enable test mode
UPDATE whatsapp_instance_settings 
SET whatsapp_test_mode = true;

-- Disable for production
UPDATE whatsapp_instance_settings 
SET whatsapp_test_mode = false;
```

### 4. Handle Errors Gracefully
```javascript
try {
  await sendWhatsAppMessage(phoneNumber, message);
} catch (error) {
  console.error('Failed to send message:', error);
  // Log to database or retry queue
}
```

---

## 📊 Monitor Usage

### Check Message Count
```sql
-- Messages sent today
SELECT COUNT(*) as messages_today 
FROM whatsapp_messages 
WHERE DATE(sent_at) = CURRENT_DATE;

-- Messages sent this month
SELECT COUNT(*) as messages_this_month 
FROM whatsapp_messages 
WHERE DATE_TRUNC('month', sent_at) = DATE_TRUNC('month', CURRENT_DATE);
```

### Check Remaining Quota
```sql
SELECT 
  whatsapp_daily_limit,
  (SELECT COUNT(*) FROM whatsapp_messages WHERE DATE(sent_at) = CURRENT_DATE) as used_today,
  (whatsapp_daily_limit - (SELECT COUNT(*) FROM whatsapp_messages WHERE DATE(sent_at) = CURRENT_DATE)) as remaining_today
FROM whatsapp_instance_settings;
```

---

## 🔧 Troubleshooting

### Problem: Templates not showing
**Solution:** Check if templates are active
```sql
SELECT name, is_active FROM whatsapp_message_templates;
```

### Problem: Messages not sending
**Solution:** Verify instance settings
```sql
SELECT * FROM whatsapp_instance_settings;
```

### Problem: Variables not replaced
**Solution:** Check variable names (case-sensitive!)
```javascript
// Template: {{customerName}}
// ✅ Correct: .replace('{{customerName}}', value)
// ❌ Wrong:   .replace('{{customername}}', value)
```

---

## 📖 Documentation Files

- **`✅ WHATSAPP-IMPORT-SUCCESS.md`** - Full import details and configuration guide
- **`🚀 WHATSAPP-QUICK-START.md`** - This file (quick reference)
- **`import-whatsapp-data.mjs`** - Import script
- **`verify-whatsapp-import.mjs`** - Verification script
- **`configure-whatsapp-instance.mjs`** - Interactive configuration script

---

## ✅ Next Steps Checklist

1. [ ] Run verification: `node verify-whatsapp-import.mjs`
2. [ ] Configure instance: `node configure-whatsapp-instance.mjs`
3. [ ] Test with a sample message
4. [ ] Integrate templates into your POS application
5. [ ] Set up message logging/tracking
6. [ ] Configure message limits based on your plan
7. [ ] Enable test mode for development
8. [ ] Disable test mode before going live

---

## 🎉 You're Ready!

Your WhatsApp templates are imported and ready to use. Just configure your instance settings and start sending messages!

**Need help?** Check the full documentation in `✅ WHATSAPP-IMPORT-SUCCESS.md`

---

**Last Updated:** October 9, 2025  
**Status:** ✅ Templates imported, instance configuration pending

