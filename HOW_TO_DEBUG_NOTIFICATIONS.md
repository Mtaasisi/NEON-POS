# 🔍 How to Debug Notifications - Complete Guide

## 🎯 Overview

I've added comprehensive debug logging to help you see exactly what's happening when notifications are sent. This will help you understand why SMS is sent instead of WhatsApp.

---

## 🚀 Quick Start

### Step 1: Open Browser Console

1. Make a sale in POS
2. **Press F12** to open DevTools
3. Go to **Console** tab
4. Look for debug messages

---

## 📋 What You'll See

### When Sale is Completed:

```
🔍 [DEBUG] Starting notification sending process...
🔍 [DEBUG] Sale: {
  saleNumber: "SALE-001",
  customerName: "John Doe",
  customerPhone: "+255712345678",
  total: 50000
}

✅ [DEBUG] Customer has phone number: +255712345678

🔍 [DEBUG] Notification settings: {
  whatsappEnabled: true,
  whatsappAutoSend: true,
  smsEnabled: true,
  smsAutoSend: false
}

✅ [DEBUG] Auto-send is enabled, proceeding with notification...

═══════════════════════════════════════════════════════
🔍 [DEBUG] SMART NOTIFICATION - INVOICE SENDING
═══════════════════════════════════════════════════════

📋 [DEBUG] Invoice Details: {
  invoice_no: "SALE-001",
  customer_phone: "+255712345678",
  total: 50000
}

⚙️ [DEBUG] Notification Settings: {
  whatsappEnabled: true,
  whatsappAutoSend: true
}

🔍 [DEBUG] Starting WhatsApp existence check...
📱 [DEBUG] Checking if +255712345678 is on WhatsApp...
⏱️ [DEBUG] WhatsApp check completed in 1234ms
🔍 [DEBUG] Check result: {
  exists: false,
  error: undefined,
  duration_ms: 1234
}

📱 [DEBUG] WhatsApp check says +255712345678 is NOT on WhatsApp
💡 [DEBUG] Will try WhatsApp anyway - actual send attempt is more reliable than check

─────────────────────────────────────────────────────
📱 [DEBUG] ATTEMPTING WHATSAPP SEND
─────────────────────────────────────────────────────

📞 [DEBUG] Phone: +255712345678
📄 [DEBUG] Invoice: SALE-001
💰 [DEBUG] Total: 50000
⏱️ [DEBUG] Starting WhatsApp send at 2025-12-05T...

⏱️ [DEBUG] WhatsApp send completed in 2345ms
🔍 [DEBUG] WhatsApp result: {
  success: false,
  error: "Number not on WhatsApp",
  duration_ms: 2345
}

─────────────────────────────────────────────────────
📱 [DEBUG] WHATSAPP SEND FAILED - Number not on WhatsApp
─────────────────────────────────────────────────────

❌ [DEBUG] Error: Number not on WhatsApp
📞 [DEBUG] Phone: +255712345678
📱 [DEBUG] Falling back to SMS invoice...

⏱️ [DEBUG] SMS send completed in 1500ms
🔍 [DEBUG] SMS result: {
  success: true,
  error: undefined,
  duration_ms: 1500
}

═══════════════════════════════════════════════════════
✅ [SUCCESS] Customer will receive SMS receipt (WhatsApp not available)
═══════════════════════════════════════════════════════
```

---

## 🔍 Debug Messages Explained

### 🔍 [DEBUG] - Information Messages
- Shows what step is happening
- Provides context
- Helps track the flow

### ✅ [SUCCESS] - Success Messages
- Operation completed successfully
- Shows what was sent
- Confirms delivery method

### ⚠️ [WARNING] - Warning Messages
- Something might be wrong
- Non-critical issues
- Suggestions for improvement

### ❌ [ERROR] - Error Messages
- Something failed
- Shows error details
- Helps identify problems

---

## 🧪 Using Debug Tool

### Option 1: Automatic (After Sale)

Debug logs automatically appear in console after making a sale. Just:
1. Make a sale
2. Open console (F12)
3. Look for debug messages

---

### Option 2: Manual Debug Tool

**In browser console (F12)**:

```javascript
// Import debug tool
const { debugNotificationTool } = await import('./src/utils/debugNotificationTool');

// Diagnose why SMS instead of WhatsApp
await debugNotificationTool.diagnoseSMSFallback('+255712345678');

// Run full diagnostic
await debugNotificationTool.runDiagnostic('+255712345678');
```

---

## 📊 What to Look For

### If WhatsApp Should Send But SMS is Sent:

**Look for these messages**:

1. **WhatsApp Check Result**:
   ```
   📱 [DEBUG] WhatsApp check says +255712345678 is NOT on WhatsApp
   ```
   → Number is not on WhatsApp

2. **WhatsApp Send Failed**:
   ```
   ❌ [DEBUG] Error: Number not on WhatsApp
   ```
   → WhatsApp send failed because number not on WhatsApp

3. **SMS Fallback**:
   ```
   📱 [DEBUG] Falling back to SMS invoice...
   ```
   → System correctly falling back to SMS

---

### If Settings Issue:

**Look for**:
```
⚠️ [DEBUG] Notification skipped: Auto-send is disabled
💡 [DEBUG] Enable auto-send in POS Settings → Notifications
```

**Fix**: Enable auto-send in settings

---

### If WhatsApp Not Configured:

**Look for**:
```
❌ [DEBUG] Error: API key not configured
```

**Fix**: Configure WhatsApp in Admin Settings → Integrations

---

## 🎯 Common Debug Scenarios

### Scenario 1: Number Not on WhatsApp

**You'll see**:
```
📱 WhatsApp check says +255712345678 is NOT on WhatsApp
📱 Falling back to SMS invoice...
✅ Customer will receive SMS receipt
```

**Meaning**: Number is not on WhatsApp, SMS is correct fallback

---

### Scenario 2: Auto-Send Disabled

**You'll see**:
```
⚠️ Notification skipped: Auto-send is disabled
```

**Fix**: Enable auto-send in POS Settings

---

### Scenario 3: WhatsApp Not Configured

**You'll see**:
```
❌ Error: API key not configured
```

**Fix**: Configure WhatsApp in Admin Settings

---

## 📝 Debug Checklist

When debugging, check console for:

- [ ] ✅ Sale data (customer phone, invoice number)
- [ ] ✅ Settings (whatsappEnabled, autoSend enabled)
- [ ] ✅ WhatsApp check result (exists: true/false)
- [ ] ✅ WhatsApp send attempt (success/failure)
- [ ] ✅ SMS fallback (if WhatsApp failed)
- [ ] ✅ Final method used (whatsapp/sms)
- [ ] ✅ Error messages (if any)

---

## 💡 Tips

1. **Filter Console**: Type `[DEBUG]` in console filter to see only debug messages
2. **Check Timestamps**: Each step shows timing
3. **Look for Errors**: Red error messages show problems
4. **Follow the Flow**: Messages appear in order

---

## 🎯 Summary

**After making a sale**:
1. Open browser console (F12)
2. Look for `[DEBUG]` messages
3. Follow the flow step-by-step
4. See exactly why SMS or WhatsApp was sent

**The debug logs show you everything!** 🔍

---

*Debug Guide - December 5, 2025*
