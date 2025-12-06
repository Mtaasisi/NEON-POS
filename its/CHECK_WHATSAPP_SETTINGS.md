# ✅ Check WhatsApp Settings - Quick Guide

## 🔍 Why WhatsApp Messages Aren't Sending After Sales

The most common reason is that **"Auto-send after payment" is disabled** by default.

---

## 📋 Step-by-Step Fix

### 1. Check Notification Settings

**Path**: POS Page → Settings (⚙️) → Notifications Tab

**Required Settings**:
- ✅ **"Enable WhatsApp Integration"** → Turn ON
- ✅ **"Auto-send after payment"** → Turn ON (THIS IS THE KEY!)
- ✅ **"Enable SMS Integration"** → Turn ON (for fallback)

**Default**: Auto-send is OFF, so you must enable it manually.

---

### 2. Check WhatsApp Configuration

**Path**: Settings → Admin Settings → Integrations

**Required**:
- ✅ WhatsApp WasenderAPI enabled
- ✅ API Key entered
- ✅ Session ID entered

---

### 3. Verify Customer Has Phone

When creating a sale:
- ✅ Select customer with phone number
- ✅ OR enter phone number manually
- ✅ Format: `+255712345678` or `255712345678`

---

## ⚠️ Why It's Not Working

### Most Common Issues:

1. **Auto-send is OFF** (90% of cases)
   - Fix: Enable in POS Settings → Notifications

2. **WhatsApp not configured**
   - Fix: Configure in Admin Settings → Integrations

3. **Customer has no phone**
   - Fix: Add phone number to customer

4. **Phone not on WhatsApp**
   - Fix: System will send SMS automatically (fallback)

---

## 🧪 Quick Test

1. Enable auto-send (Step 1 above)
2. Make a test sale with customer phone
3. Complete payment
4. ✅ WhatsApp should send automatically!

---

## 📱 Check if It Worked

### In Browser Console (F12):
Look for:
```
✅ WhatsApp notification sent successfully for sale: SALE-001
```

### On Customer's Phone:
- Should receive WhatsApp message
- Or SMS if not on WhatsApp

---

## 🎯 Summary

**The fix is simple**:
1. Go to POS Settings → Notifications
2. Turn ON "Auto-send after payment"
3. Save
4. ✅ Done! Messages will send automatically after sales.

---

*Quick Check Guide - December 5, 2025*
