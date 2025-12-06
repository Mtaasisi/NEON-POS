# 🧪 Test Smart Notification System

## ✅ Comprehensive Testing Guide

This guide helps you test that **all notifications use smart routing** (WhatsApp first, SMS fallback) throughout your app.

---

## 🎯 Pre-Testing Setup

### 1. Configure Services

**Admin Settings → Integrations**:
- ✅ WhatsApp WasenderAPI configured
- ✅ SMS Gateway configured

**POS Settings → Notifications**:
- ✅ WhatsApp enabled
- ✅ SMS enabled
- ✅ Auto-send enabled (if testing auto-send)

### 2. Test Phone Numbers

Prepare test numbers:
- **Number with WhatsApp**: Use a number you know is on WhatsApp
- **Number without WhatsApp**: Use a landline or invalid mobile number

---

## 📋 Test Scenarios

### Test 1: POS Sale - Automatic Receipt ✅

**Location**: POS Page

**Steps**:
1. Open POS page
2. Add products to cart
3. Select customer **with WhatsApp number**
4. Complete payment
5. **Check result**: Should receive WhatsApp receipt

**Expected**:
```
✅ Checking WhatsApp status...
✅ Number is on WhatsApp
✅ Sending WhatsApp invoice...
✅ WhatsApp invoice sent successfully!
```

**Test with non-WhatsApp number**:
1. Select customer **without WhatsApp** (or wrong number)
2. Complete payment
3. **Check result**: Should receive SMS receipt

**Expected**:
```
✅ Checking WhatsApp status...
⚠️ Number not on WhatsApp
📱 Falling back to SMS...
✅ SMS invoice sent successfully!
```

---

### Test 2: Device Repair Status Update ✅

**Location**: Devices → Repair Status

**Steps**:
1. Open device repair
2. Update status (e.g., "Ready for Pickup")
3. Click "Send Notification"
4. Choose **"Smart Send"** option
5. Send message

**Expected**:
- If number has WhatsApp → WhatsApp message sent
- If number doesn't → SMS sent

**Test manual options**:
- **WhatsApp button**: Should force WhatsApp only
- **SMS button**: Should force SMS only

---

### Test 3: Customer Communication Modal ✅

**Location**: POS → Customer → Communication

**Steps**:
1. Open customer details
2. Click "Send Message"
3. Communication modal opens
4. Select **"Smart Send"** (default)
5. Type message
6. Click "Send"

**Expected**:
- Smart routing: WhatsApp first, SMS fallback
- Shows which method was used in success message

**Test other options**:
- **WhatsApp**: Forces WhatsApp only
- **SMS**: Forces SMS only
- **Email**: Sends email

---

### Test 4: Customer Detail SMS ✅

**Location**: Customers → Customer Detail

**Steps**:
1. Open customer detail page
2. Find "Send SMS" button
3. Enter message
4. Click "Send"

**Expected**:
- Automatically uses smart routing
- Tries WhatsApp first
- Falls back to SMS if needed
- Shows which method succeeded

---

### Test 5: Manual Invoice Send ✅

**Location**: After sale or receipt modal

**Steps**:
1. Complete a sale
2. Receipt modal appears
3. Click "WhatsApp" button (for manual send)
4. Or use notification settings to send invoice

**Expected**:
- Uses smart routing
- WhatsApp first, SMS fallback
- Shows success message with method used

---

## 🔍 How to Verify Smart Routing

### Check Console Logs

Open browser DevTools (F12) → Console tab

**Look for**:
```
✅ Checking WhatsApp status for +255712345678...
✅ Number is on WhatsApp
✅ Sending WhatsApp message...
```

OR

```
✅ Checking WhatsApp status for +255712345678...
⚠️ Number not on WhatsApp
📱 Falling back to SMS...
✅ Sending SMS message...
```

### Check Success Messages

**WhatsApp success**:
- Toast: "WhatsApp message sent successfully!"
- Or: "WhatsApp invoice sent successfully! ✅"

**SMS success**:
- Toast: "SMS message sent successfully!"
- Or: "SMS invoice sent successfully! ✅"

**Smart routing success**:
- Toast: "WhatsApp message sent successfully!" (if WhatsApp)
- Or: "SMS message sent successfully!" (if SMS)
- Shows which method was used

---

## 🐛 Troubleshooting Tests

### Issue: Always sends SMS, never WhatsApp

**Check**:
1. Is WhatsApp configured in Admin Settings?
2. Is WhatsApp enabled in POS Settings?
3. Are API credentials correct?
4. Check console for errors

**Solution**:
- Verify WhatsApp API credentials
- Check WhatsApp service initialization
- Look for error messages in console

---

### Issue: WhatsApp check takes too long

**Expected**: 1-2 seconds is normal

**If too slow**:
- Check network connection
- Verify WhatsApp API is accessible
- Check API response times

---

### Issue: Both WhatsApp and SMS sent

**Should NOT happen** - Only one should be sent

**If both sent**:
- Check if there are multiple notification handlers
- Verify smart routing is being used
- Check for duplicate send calls

---

### Issue: No notification sent

**Check**:
1. Is customer phone number valid?
2. Are services configured?
3. Check console for errors
4. Verify auto-send is enabled (if testing auto-send)

---

## 📊 Test Results Template

```
✅ Test 1: POS Sale with WhatsApp number
   Result: WhatsApp sent ✅
   Time: 2 seconds
   
✅ Test 2: POS Sale with non-WhatsApp number
   Result: SMS sent ✅
   Time: 3 seconds
   
✅ Test 3: Device Repair - Smart Send
   Result: WhatsApp sent ✅
   
✅ Test 4: Customer Communication - Smart Send
   Result: SMS sent (fallback) ✅
   
✅ Test 5: Customer Detail SMS
   Result: WhatsApp sent ✅
```

---

## 🎯 Success Criteria

All tests should pass:
- [x] POS receipts use smart routing
- [x] Device repair notifications use smart routing
- [x] Customer communication uses smart routing
- [x] Customer detail SMS uses smart routing
- [x] Manual sends respect smart routing
- [x] Only one message sent per notification
- [x] Correct method chosen (WhatsApp or SMS)

---

## 🚀 Quick Test Script

### 1. Test WhatsApp First
```
1. Use customer with WhatsApp number
2. Send any notification
3. ✅ Should receive WhatsApp
```

### 2. Test SMS Fallback
```
1. Use customer without WhatsApp
2. Send any notification
3. ✅ Should receive SMS
```

### 3. Test Manual Options
```
1. Use "Smart Send" → Should route intelligently
2. Use "WhatsApp" → Should force WhatsApp
3. Use "SMS" → Should force SMS
```

---

## ✅ All Tests Pass?

If all tests pass, your smart notification system is working perfectly! 🎉

**Summary**:
- ✅ WhatsApp first routing works
- ✅ SMS fallback works
- ✅ All notification points updated
- ✅ User experience is smooth
- ✅ Cost-effective (only one message)

---

*Test Guide Created: December 5, 2025*
*Status: Ready for Testing*
