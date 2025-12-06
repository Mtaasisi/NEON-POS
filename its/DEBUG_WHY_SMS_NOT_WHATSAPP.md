# 🔍 Debug: Why SMS Instead of WhatsApp

## 🎯 Your Issue

You're receiving SMS messages instead of WhatsApp after making sales.

---

## ✅ This is Usually Correct Behavior

The smart routing system checks if a phone number is on WhatsApp before sending:
- **If number IS on WhatsApp** → Sends WhatsApp ✅
- **If number is NOT on WhatsApp** → Sends SMS ✅ (automatic fallback)

**Receiving SMS means the system checked and the number is not registered on WhatsApp.**

---

## 🔍 How to Debug

### Step 1: Check Browser Console

Open browser DevTools (F12) → Console tab

**Look for these messages**:

**Message 1**: WhatsApp check happening
```
🔍 Checking if +255712345678 is on WhatsApp...
```

**Message 2A**: Number IS on WhatsApp
```
✅ Number +255712345678 IS on WhatsApp, sending WhatsApp invoice
```

**Message 2B**: Number NOT on WhatsApp (why SMS is sent)
```
📱 Number +255712345678 is NOT on WhatsApp, sending SMS invoice instead
```

**Message 3**: WhatsApp check failed
```
⚠️ WhatsApp check failed, will try WhatsApp anyway
```

---

### Step 2: Test Phone Number Manually

Open browser console (F12) and run:

```javascript
// Test if number is on WhatsApp
const whatsappService = (await import('./src/services/whatsappService')).default;
const result = await whatsappService.isOnWhatsApp('+255712345678'); // Replace with actual number
console.log('WhatsApp Check Result:', result);
```

**What the result means**:
- `{ exists: true }` → Number IS on WhatsApp (should send WhatsApp)
- `{ exists: false }` → Number NOT on WhatsApp (will send SMS)
- `{ exists: false, error: 'API key not configured' }` → WhatsApp not configured
- `{ exists: false, error: 'HTTP 401' }` → Authentication failed

---

### Step 3: Verify Phone Number Format

**Correct formats**:
- ✅ `+255712345678`
- ✅ `255712345678`
- ✅ `0712345678` (auto-converted)

**Wrong formats**:
- ❌ `0712 345 678` (has spaces)
- ❌ `+255-712-345-678` (has dashes)
- ❌ `(255) 712-345-678` (has parentheses)

---

## 🔧 Common Issues & Solutions

### Issue 1: Number Actually Not on WhatsApp

**Problem**: The phone number is genuinely not registered on WhatsApp.

**How to verify**:
1. Open WhatsApp on your phone
2. Try to message that customer's number
3. If you can't find them → They don't have WhatsApp

**Solution**:
- Ensure customer has WhatsApp installed
- Verify they're using the same phone number
- SMS is the correct fallback (working as designed)

---

### Issue 2: WhatsApp Check API Failing

**Problem**: The check API might be failing, causing SMS fallback.

**How to check**:
Look in console for:
```
⚠️ WhatsApp check failed, will try WhatsApp anyway
```

**Solution**:
- Check WhatsApp API configuration
- Verify API credentials
- Check network connectivity

---

### Issue 3: Phone Number Format Wrong

**Problem**: Phone number format is incorrect.

**Solution**:
- Use format: `+255712345678`
- Remove spaces, dashes, parentheses
- Include country code

---

### Issue 4: WhatsApp Check Returns False Incorrectly

**Problem**: Number IS on WhatsApp but check says it's not.

**Possible causes**:
- API endpoint issue
- Number format issue
- API rate limiting

**Solution**:
- Try skipping the check (system will try WhatsApp anyway)
- Verify API endpoint is working
- Check API documentation

---

## 🧪 Test Scenarios

### Test 1: Known WhatsApp Number

Use a phone number you KNOW is on WhatsApp:
1. Use your own phone number
2. Make a test sale
3. Check if WhatsApp or SMS is sent

**Expected**: Should send WhatsApp if check works correctly

---

### Test 2: Check API Directly

```javascript
// In browser console
const whatsappService = (await import('./src/services/whatsappService')).default;

// Test your phone number
const result = await whatsappService.isOnWhatsApp('+255712345678');
console.log('Is my number on WhatsApp?', result);
```

---

### Test 3: Skip Check and Try WhatsApp

The system will try WhatsApp even if check fails. Look for:
```
⚠️ WhatsApp check failed, will try WhatsApp anyway
```

This means it will attempt WhatsApp sending.

---

## 📊 What's Happening

### Current Flow:
```
Sale Completed
    ↓
Check: Is number on WhatsApp?
    ↓
    ┌────────┴────────┐
    │                 │
  YES                NO
    │                 │
    ↓                 ↓
Send WhatsApp    Send SMS
```

### If You Want to Skip Check:
```
Sale Completed
    ↓
Try WhatsApp directly
    ↓
    ┌────────┴────────┐
    │                 │
  SUCCESS           FAIL
    │                 │
    ↓                 ↓
✅ WhatsApp      Send SMS
```

---

## 💡 Recommendations

### Option 1: Verify Numbers are on WhatsApp
- ✅ Most reliable approach
- ✅ Ensures WhatsApp delivery
- ✅ Prevents wasted API calls

### Option 2: Skip WhatsApp Check
- ⚡ Faster (no check delay)
- ⚠️ Might waste API calls
- ✅ Still falls back to SMS if fails

### Option 3: Improve Check Reliability
- ✅ Better error handling
- ✅ Retry logic
- ✅ Fallback strategies

---

## ✅ Summary

**If you're receiving SMS**:
1. **Check console logs** - See why SMS was chosen
2. **Verify phone number** - Is it on WhatsApp?
3. **Test WhatsApp check** - Does it work correctly?
4. **Check number format** - Is it correct?

**Most likely cause**: The phone number is actually not on WhatsApp, and SMS fallback is working correctly.

---

*Debug Guide - December 5, 2025*
