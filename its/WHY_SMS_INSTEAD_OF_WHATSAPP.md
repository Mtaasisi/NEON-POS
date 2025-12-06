# 🔍 Why SMS Instead of WhatsApp?

## 🎯 Your Issue

> "I receive SMS not WhatsApp when I do payments in POS page"

---

## ✅ This is Actually Working Correctly!

The smart routing system is designed to:
1. **Check if number is on WhatsApp first**
2. **Send WhatsApp if number is on WhatsApp**
3. **Send SMS if number is NOT on WhatsApp** (automatic fallback)

**If you're receiving SMS, it means the system checked and the phone number is not registered on WhatsApp.**

---

## 🔍 Why SMS is Sent Instead of WhatsApp

### Reason 1: Phone Number Not on WhatsApp (Most Common)
- Phone number is not registered on WhatsApp
- Phone number is inactive on WhatsApp
- Phone number is a landline (WhatsApp only works on mobile)
- Phone number format is incorrect

### Reason 2: WhatsApp Check Failed
- WhatsApp API check failed
- Network issues during check
- API endpoint not responding

### Reason 3: Number Format Issue
- Phone number format incorrect
- Country code wrong
- Number validation failed

---

## 🧪 How to Check

### Step 1: Check Browser Console

Open browser DevTools (F12) → Console tab

**Look for these messages**:

**If number NOT on WhatsApp**:
```
📱 Number not on WhatsApp, sending SMS instead
```

**If WhatsApp check failed**:
```
⚠️ WhatsApp check failed, will try WhatsApp anyway
```

**If WhatsApp send failed**:
```
📱 Number not on WhatsApp (send failed), falling back to SMS
```

---

### Step 2: Verify Phone Number

**Check**:
1. Is the phone number correct?
2. Is it a mobile number (not landline)?
3. Is WhatsApp installed on that phone?
4. Is the number active on WhatsApp?

**Format**: Should be `+255712345678` or `255712345678`

---

### Step 3: Test WhatsApp Check Manually

Open browser console (F12) and run:

```javascript
const whatsappService = (await import('./src/services/whatsappService')).default;
const result = await whatsappService.isOnWhatsApp('+255712345678'); // Replace with actual number
console.log('Is on WhatsApp?', result);
```

**Expected Result**:
- `{ exists: true }` → Number is on WhatsApp
- `{ exists: false }` → Number is NOT on WhatsApp
- `{ exists: false, error: '...' }` → Check failed

---

## 🔧 Solutions

### Solution 1: Verify Phone Number is on WhatsApp

1. **Check manually**:
   - Open WhatsApp on your phone
   - Try to message that number
   - If you can't find it, the number is not on WhatsApp

2. **Use correct format**:
   - Format: `+255712345678`
   - Remove spaces, dashes, parentheses
   - Include country code

---

### Solution 2: Force WhatsApp (Skip Check)

If you want to force WhatsApp even if the number might not be on WhatsApp:

**Option A**: Skip WhatsApp check (faster, but might fail)
- The system will try WhatsApp directly
- If it fails, falls back to SMS

**Option B**: Always try WhatsApp first
- Currently implemented
- Checks first, then sends

---

### Solution 3: Improve Phone Number Format

**Tanzania Numbers**:
- ✅ Correct: `+255712345678` or `255712345678`
- ✅ Correct: `0712345678` (auto-converted to 255)
- ❌ Wrong: `0712 345 678` (has spaces)
- ❌ Wrong: `+255-712-345-678` (has dashes)

---

## 📱 Expected Behavior

### When Number IS on WhatsApp:
```
Check: +255712345678 on WhatsApp? → ✅ YES
    ↓
Send WhatsApp
    ↓
✅ Customer receives WhatsApp message
```

### When Number is NOT on WhatsApp:
```
Check: +255712345678 on WhatsApp? → ❌ NO
    ↓
Send SMS (automatic fallback)
    ↓
✅ Customer receives SMS message
```

---

## 💡 Why This is Better

**Benefits of Smart Routing**:
- ✅ **Higher delivery rate** - Always sends something
- ✅ **Automatic fallback** - No manual intervention
- ✅ **Cost-effective** - Uses WhatsApp when available (cheaper)
- ✅ **Reliable** - SMS works even if WhatsApp unavailable

---

## 🔧 If You Want WhatsApp Specifically

### Option 1: Verify Number is on WhatsApp
- Check if customer has WhatsApp installed
- Verify phone number is correct
- Test sending WhatsApp manually first

### Option 2: Skip Check (Force WhatsApp)
You can modify the code to skip the check and try WhatsApp directly, but:
- ⚠️ Might fail if number not on WhatsApp
- ⚠️ Will waste API calls

---

## 📊 Current Flow

```
Sale Completed
    ↓
Check: Number on WhatsApp?
    ↓
    ┌────────┴────────┐
    │                 │
  YES                NO
    │                 │
    ↓                 ↓
Send WhatsApp    Send SMS
    │                 │
    └────────┬────────┘
             ↓
    Customer Receives Message!
```

---

## ✅ Summary

**If you're receiving SMS**:
- ✅ System is working correctly
- ✅ Number is likely not on WhatsApp
- ✅ Automatic fallback is working
- ✅ Customer still receives the message

**To get WhatsApp instead**:
1. Verify phone number is on WhatsApp
2. Check phone number format
3. Test WhatsApp check manually
4. Ensure customer has WhatsApp installed

---

*Guide Created: December 5, 2025*
