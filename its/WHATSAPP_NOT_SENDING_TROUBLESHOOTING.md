# 🔍 WhatsApp Not Sending After Sale - Troubleshooting Guide

## 🎯 Problem

After creating a sale, you're not receiving WhatsApp messages.

---

## ✅ Quick Checklist

### Step 1: Check Settings
1. **POS Settings → Notifications**
   - [ ] Is "Enable WhatsApp Integration" turned ON?
   - [ ] Is "Auto-send after payment" turned ON?
   - [ ] Is "Enable SMS Integration" turned ON? (for fallback)

2. **Admin Settings → Integrations**
   - [ ] Is WhatsApp WasenderAPI configured?
   - [ ] Do you have API Key and Session ID?
   - [ ] Are credentials correct?

### Step 2: Check Customer
- [ ] Does the customer have a phone number?
- [ ] Is the phone number in the correct format? (+255712345678)
- [ ] Is the phone number valid?

### Step 3: Check Console
Open browser DevTools (F12) → Console tab
- [ ] Look for error messages
- [ ] Check for notification logs

---

## 🔧 Common Issues & Solutions

### Issue 1: Auto-Send Not Enabled

**Problem**: Auto-send is disabled in settings.

**Solution**:
1. Go to **POS → Settings (⚙️) → Notifications** tab
2. Find "Enable WhatsApp Integration"
3. Toggle it **ON**
4. Find "Auto-send after payment"
5. Toggle it **ON**
6. Click **Save**

---

### Issue 2: WhatsApp Not Configured

**Problem**: WhatsApp API credentials not configured.

**Solution**:
1. Go to **Settings → Admin Settings → Integrations**
2. Find "WhatsApp (WasenderAPI)"
3. Enter your:
   - **API Key**: From WasenderAPI dashboard
   - **Session ID**: From WasenderAPI dashboard
4. Click **Save**
5. Verify credentials are correct

---

### Issue 3: Customer Phone Missing

**Problem**: Customer doesn't have a phone number.

**Solution**:
1. Make sure you select a customer with a phone number
2. Or enter phone number manually when creating sale
3. Phone format: `+255712345678` or `255712345678`

---

### Issue 4: Number Not on WhatsApp

**Problem**: Phone number is not registered on WhatsApp.

**Solution**:
- System will automatically fall back to SMS
- Check if SMS was sent instead
- Verify phone number is correct
- Ensure it's a mobile number (not landline)

---

### Issue 5: Silent Failures

**Problem**: Errors are logged but not shown to user.

**Solution**:
1. Open browser console (F12)
2. Look for error messages
3. Check for messages like:
   - "Notification sending failed"
   - "WhatsApp not configured"
   - "Auto-send disabled"

---

## 🧪 Diagnostic Steps

### Step 1: Verify Settings

```javascript
// In browser console (F12)
const { notificationSettingsService } = await import('./src/services/notificationSettingsService');
const settings = notificationSettingsService.getSettings();
console.log('Settings:', settings);
```

**Check these values**:
- `settings.whatsappEnabled` should be `true`
- `settings.whatsappAutoSend` should be `true`
- `settings.smsEnabled` should be `true` (for fallback)

---

### Step 2: Check Customer Phone

Make sure:
- Customer has a phone number
- Phone number is in correct format
- Phone number is not empty

---

### Step 3: Test WhatsApp Service

```javascript
// In browser console (F12)
const whatsappService = (await import('./src/services/whatsappService')).default;
const result = await whatsappService.isOnWhatsApp('+255712345678');
console.log('WhatsApp check:', result);
```

---

### Step 4: Test Notification Sending

```javascript
// In browser console (F12)
const { smartNotificationService } = await import('./src/services/smartNotificationService');
const result = await smartNotificationService.sendNotification('+255712345678', 'Test message');
console.log('Send result:', result);
```

---

## 📋 Complete Troubleshooting Checklist

### Configuration Checklist
- [ ] WhatsApp configured in Admin Settings → Integrations
- [ ] WhatsApp enabled in POS Settings → Notifications
- [ ] Auto-send enabled in POS Settings → Notifications
- [ ] SMS enabled (for fallback)
- [ ] API credentials are correct

### Sale Checklist
- [ ] Customer has phone number
- [ ] Phone number is valid format
- [ ] Sale completed successfully
- [ ] No errors in console

### Expected Behavior
- [ ] Notification sent automatically after sale
- [ ] WhatsApp if number is on WhatsApp
- [ ] SMS if number not on WhatsApp
- [ ] Success message shown

---

## 🐛 Debugging in Console

Open browser DevTools (F12) → Console tab

### What to Look For:

**Good signs** ✅:
```
✅ Checking WhatsApp status for +255712345678...
✅ Number is on WhatsApp
✅ Sending WhatsApp invoice...
✅ WhatsApp invoice sent successfully!
```

**Bad signs** ❌:
```
❌ WhatsApp not configured
❌ Auto-send disabled
❌ Customer phone number not found
❌ Notification sending failed
```

---

## 🔧 Quick Fixes

### Fix 1: Enable Auto-Send
```
1. POS → Settings → Notifications
2. Toggle "Auto-send after payment" ON
3. Save
```

### Fix 2: Configure WhatsApp
```
1. Settings → Integrations
2. Configure WhatsApp WasenderAPI
3. Enter API Key and Session ID
4. Save
```

### Fix 3: Check Customer
```
1. Ensure customer has phone number
2. Verify phone format is correct
3. Make test sale
```

---

## 📞 Still Not Working?

### Check These:
1. **Browser Console Errors** - Look for specific error messages
2. **Network Tab** - Check if API calls are being made
3. **Settings** - Verify all settings are correct
4. **Customer Phone** - Ensure phone number is valid

### Get Help:
1. Check console for error messages
2. Verify all settings are enabled
3. Test with a known good phone number
4. Contact support with error details

---

## 🎯 Expected Flow

```
Sale Completed
    ↓
Check: Customer has phone? → YES
    ↓
Check: Auto-send enabled? → YES
    ↓
Check: WhatsApp configured? → YES
    ↓
Check: Number on WhatsApp? → YES/NO
    ↓
Send WhatsApp (or SMS fallback)
    ↓
✅ Message Sent!
```

---

## ✅ Success Indicators

**When working correctly, you should see**:
- ✅ Sale completes successfully
- ✅ Success toast: "Sale completed successfully!"
- ✅ Console log: "WhatsApp/SMS notification sent successfully"
- ✅ Customer receives message on WhatsApp/SMS

---

*Troubleshooting Guide - December 5, 2025*
