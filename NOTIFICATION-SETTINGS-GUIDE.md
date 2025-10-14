# 📢 POS Notification Settings - Complete Guide

## Overview
You now have a complete notification system for sending invoices via **WhatsApp**, **SMS**, and **Email** with auto or manual sending options!

---

## 🎯 Features

### ✅ What's New
1. **Dedicated Notifications Tab** in POS Settings
2. **WhatsApp Invoice** with live preview
3. **SMS Invoice** with character count
4. **Email Invoice** (coming soon)
5. **Auto/Manual Sending** options for each channel
6. **Template Customization** for all channels
7. **Preview System** to test messages before sending

---

## 📍 How to Access

1. Open your POS
2. Click **Settings** (⚙️ icon)
3. Click **📢 Notifications** tab
4. Configure your preferences
5. Click **Save Settings**

---

## 🔧 Configuration Options

### 📱 WhatsApp Settings

**Enable WhatsApp:**
- Toggle on/off to enable WhatsApp invoicing

**Auto-send after payment completion:**
- ✅ **ON**: Invoices sent automatically after payment
- ❌ **OFF**: Staff clicks "Send" button manually

**Show preview before sending:**
- Allow staff to review message before sending

**Include options:**
- ☑️ Include business logo
- ☑️ Include item details (full item list with quantities and prices)

**Opening Message:**
- Customize the greeting message
- Default: "Thank you for your purchase! Here's your invoice:"

**Preview:**
- Click "Show Preview" to see exactly how your invoice will look on WhatsApp

---

### 📲 SMS Settings

**Enable SMS:**
- Toggle on/off to enable SMS invoicing

**Auto-send after payment completion:**
- ✅ **ON**: SMS sent automatically after payment
- ❌ **OFF**: Staff clicks "Send" button manually

**SMS Template:**
- Customize your SMS message
- Use variables: `{total}`, `{balance}`, `{invoice_no}`, `{business_name}`, `{customer_name}`
- Example: "Thank you! Total: {total}. Balance: {balance}. Ref: {invoice_no}"

**Include options:**
- ☑️ Include total amount
- ☑️ Include balance due

**Preview:**
- Click "Show Preview" to see SMS preview with character count
- ⚠️ Messages over 160 characters are split into multiple SMS (costs more!)

---

### 📧 Email Settings

**Enable Email:**
- Toggle on/off to enable email invoicing

**Auto-send after payment completion:**
- ✅ **ON**: Emails sent automatically after payment
- ❌ **OFF**: Staff clicks "Send" button manually

**Attach PDF invoice:**
- ☑️ Include professionally formatted PDF

**Email Subject:**
- Customize subject line
- Use variables: `{business_name}`, `{invoice_no}`, etc.

**Email Message:**
- Customize email body content

---

## 💻 How to Use in Your Code

### 1. Import the Service

```typescript
import { notificationSettingsService, InvoiceData } from '@/services/notificationSettingsService';
```

### 2. After Payment Completion

```typescript
// Example: In your payment completion handler
const handlePaymentComplete = async (saleData: any) => {
  // Prepare invoice data
  const invoice: InvoiceData = {
    invoice_no: saleData.invoice_no,
    business_name: 'My Store',
    business_phone: '+255 123 456 789',
    business_logo: 'base64_logo_string', // optional
    customer_name: saleData.customer_name,
    customer_phone: saleData.customer_phone,
    customer_email: saleData.customer_email, // optional
    items: saleData.items,
    subtotal: saleData.subtotal,
    tax: saleData.tax,
    discount: saleData.discount,
    total: saleData.total,
    paid: saleData.paid,
    balance: saleData.balance,
    date: new Date().toLocaleDateString(),
    payment_method: saleData.payment_method, // optional
  };

  // Auto-send based on settings
  const results = await notificationSettingsService.autoSendInvoice(invoice);
  
  // Check results
  if (results.whatsapp?.success) {
    console.log('✅ WhatsApp sent!');
  }
  if (results.sms?.success) {
    console.log('✅ SMS sent!');
  }
  if (results.email?.success) {
    console.log('✅ Email sent!');
  }
};
```

### 3. Manual Sending (with UI Button)

```typescript
// Send WhatsApp manually
const handleSendWhatsApp = async () => {
  const result = await notificationSettingsService.sendWhatsAppInvoice(invoiceData);
  if (result.success) {
    toast.success('WhatsApp sent! ✅');
  } else {
    toast.error(result.error || 'Failed to send');
  }
};

// Send SMS manually
const handleSendSMS = async () => {
  const result = await notificationSettingsService.sendSMSInvoice(invoiceData);
  if (result.success) {
    toast.success('SMS sent! ✅');
  } else {
    toast.error(result.error || 'Failed to send');
  }
};
```

### 4. Check Settings Before Showing UI

```typescript
// Check if auto-send is enabled
const hasAutoSend = notificationSettingsService.hasAutoSendEnabled();
if (hasAutoSend) {
  console.log('Auto-send is enabled, no manual buttons needed');
}

// Check if manual send is available
const hasManualSend = notificationSettingsService.hasManualSendEnabled();
if (hasManualSend) {
  // Show "Send Invoice" buttons in UI
}

// Get current settings
const settings = notificationSettingsService.getSettings();
console.log('WhatsApp enabled:', settings.whatsappEnabled);
console.log('SMS auto-send:', settings.smsAutoSend);
```

---

## 🎨 UI Integration Examples

### Example 1: Payment Success Modal with Send Buttons

```typescript
const PaymentSuccessModal = ({ invoiceData }) => {
  const settings = notificationSettingsService.getSettings();
  
  return (
    <div className="payment-success-modal">
      <h2>Payment Successful! ✅</h2>
      <p>Invoice: {invoiceData.invoice_no}</p>
      
      {/* Show manual send buttons if not auto-send */}
      {settings.whatsappEnabled && !settings.whatsappAutoSend && (
        <button onClick={() => notificationSettingsService.sendWhatsAppInvoice(invoiceData)}>
          📱 Send WhatsApp Invoice
        </button>
      )}
      
      {settings.smsEnabled && !settings.smsAutoSend && (
        <button onClick={() => notificationSettingsService.sendSMSInvoice(invoiceData)}>
          📲 Send SMS Invoice
        </button>
      )}
      
      {settings.emailEnabled && !settings.emailAutoSend && (
        <button onClick={() => notificationSettingsService.sendEmailInvoice(invoiceData)}>
          📧 Send Email Invoice
        </button>
      )}
    </div>
  );
};
```

### Example 2: Auto-send Notification

```typescript
// After successful payment
useEffect(() => {
  if (paymentComplete && invoiceData) {
    // Auto-send invoices
    notificationSettingsService.autoSendInvoice(invoiceData).then(results => {
      // Show notification based on results
      const sentChannels = [];
      if (results.whatsapp?.success) sentChannels.push('WhatsApp');
      if (results.sms?.success) sentChannels.push('SMS');
      if (results.email?.success) sentChannels.push('Email');
      
      if (sentChannels.length > 0) {
        toast.success(`Invoice sent via ${sentChannels.join(', ')} ✅`);
      }
    });
  }
}, [paymentComplete, invoiceData]);
```

---

## 📋 Invoice Data Structure

```typescript
interface InvoiceData {
  invoice_no: string;              // Required: "INV-2024-001"
  business_name: string;           // Required: "My Store"
  business_phone: string;          // Required: "+255 123 456 789"
  business_logo?: string;          // Optional: Base64 image string
  customer_name: string;           // Required: "John Doe"
  customer_phone: string;          // Required: "+255 987 654 321"
  customer_email?: string;         // Optional: "john@example.com"
  items: Array<{                   // Required: List of items
    name: string;                  // "Product 1"
    quantity: number;              // 2
    price: number;                 // 10000
  }>;
  subtotal: number;                // Required: 45000
  tax?: number;                    // Optional: 4500
  discount?: number;               // Optional: 2000
  total: number;                   // Required: 49500
  paid: number;                    // Required: 30000
  balance: number;                 // Required: 19500
  date: string;                    // Required: "10/12/2024"
  payment_method?: string;         // Optional: "Cash", "M-Pesa", etc.
}
```

---

## 🎯 Best Practices

### ✅ DO's
- ✅ Test your templates using the preview feature
- ✅ Keep SMS messages under 160 characters to avoid extra costs
- ✅ Use clear, professional language in your messages
- ✅ Include essential info: invoice number, total, balance
- ✅ Test with real phone numbers before going live
- ✅ Enable preview mode initially to catch errors

### ❌ DON'Ts
- ❌ Don't enable auto-send for all channels immediately (test first!)
- ❌ Don't send without customer consent
- ❌ Don't use overly long SMS templates (costs more!)
- ❌ Don't forget to configure WhatsApp/SMS API settings first
- ❌ Don't send to invalid/incomplete phone numbers

---

## 🔧 Prerequisites

### WhatsApp Integration
1. Must have WhatsApp API configured in Admin Settings → Integrations
2. Need Green API or similar WhatsApp Business API
3. Test connection before enabling auto-send

### SMS Integration
1. Must have SMS provider configured (MShastra, Africa's Talking, Twilio)
2. Have SMS credits/balance
3. Test with a real number first

### Email Integration
1. Coming soon! 📧
2. Will require SMTP configuration

---

## 📊 Message Examples

### WhatsApp Invoice Example:
```
Thank you for your purchase! Here's your invoice:

📄 Invoice: INV-2024-001
📅 Date: 10/12/2024
👤 Customer: John Doe

🛒 Items:
  • Product 1 x2 - 10,000 TZS
  • Product 2 x1 - 25,000 TZS

💰 Total: 49,500 TZS
✅ Paid: 30,000 TZS
📊 Balance: 19,500 TZS

📞 Contact: +255 123 456 789

Thank you for your business! 🙏
```

### SMS Invoice Example:
```
Thank you! Total: 49,500 TZS. Balance: 19,500 TZS. Ref: INV-2024-001
```

---

## 🐛 Troubleshooting

### Issue: "WhatsApp not configured"
**Solution:** Go to Admin Settings → Integrations and configure WhatsApp API

### Issue: "Invalid phone number"
**Solution:** Ensure phone numbers include country code (e.g., +255...)

### Issue: "SMS not sending"
**Solution:** Check SMS provider credentials and account balance

### Issue: "Preview not showing"
**Solution:** Make sure you've filled in all template fields

---

## 🚀 Next Steps

1. **Configure Settings:** Go to POS Settings → Notifications
2. **Test Templates:** Use preview feature to test messages
3. **Test Sending:** Try manual send with a test transaction
4. **Enable Auto-send:** Once tested, enable auto-send for your preferred channels
5. **Monitor:** Check that messages are being sent successfully

---

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify API credentials in Admin Settings
3. Test phone number format (+255...)
4. Ensure customer has phone number in their profile

---

## 🎉 You're All Set!

Your POS now has a powerful notification system that can:
- ✅ Send beautiful WhatsApp invoices automatically
- ✅ Send quick SMS notifications
- ✅ Give you full control over what and when to send
- ✅ Preview messages before they go out
- ✅ Track all sent notifications

**Happy selling! 🎊**

