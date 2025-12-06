# 🔧 How to Force WhatsApp (Skip SMS Fallback)

## 🎯 Your Issue

You want WhatsApp messages even when the number might not be on WhatsApp, or you want to skip the WhatsApp check.

---

## ✅ Option 1: Skip WhatsApp Check (Force WhatsApp)

The system currently checks if a number is on WhatsApp before sending. If you want to skip this check and try WhatsApp directly:

**Pros**:
- ✅ Faster (no check delay)
- ✅ Tries WhatsApp first
- ✅ Still falls back to SMS if WhatsApp fails

**Cons**:
- ⚠️ Might waste API calls if number not on WhatsApp
- ⚠️ Could be slower if WhatsApp fails

---

## 🔧 Option 2: Improve WhatsApp Check

The current check might be failing. Let's improve it:

1. **Better error handling**
2. **Retry logic**
3. **Detailed logging**

---

## 📋 Current Behavior

**Right now**:
```
Check if number on WhatsApp → NO → Send SMS
```

**If you want**:
```
Try WhatsApp directly → If fails → Send SMS
```

---

## 🧪 How to Test

### Test 1: Check if Number is on WhatsApp

Open browser console (F12) and run:

```javascript
const whatsappService = (await import('./src/services/whatsappService')).default;
const result = await whatsappService.isOnWhatsApp('+255712345678');
console.log('Result:', result);
```

**What to look for**:
- `exists: true` → Number IS on WhatsApp (should send WhatsApp)
- `exists: false` → Number NOT on WhatsApp (will send SMS)
- `error: '...'` → Check failed (might need to fix)

---

## 🔍 Common Reasons for SMS Instead of WhatsApp

### 1. Number Not on WhatsApp (90% of cases)
- **Solution**: Use a number that has WhatsApp
- **Test**: Try messaging that number from your phone's WhatsApp

### 2. WhatsApp Check API Failing
- **Solution**: Check API configuration
- **Test**: Check browser console for errors

### 3. Number Format Wrong
- **Solution**: Use correct format: `+255712345678`
- **Test**: Verify phone number format

---

## ✅ Quick Fixes

### Fix 1: Verify Customer Has WhatsApp
1. Open WhatsApp on your phone
2. Try to message the customer's number
3. If you can find them → They have WhatsApp
4. If you can't → They don't have WhatsApp

### Fix 2: Check Phone Number Format
- Use: `+255712345678` or `255712345678`
- Don't use: `0712 345 678` (spaces)
- Don't use: `+255-712-345-678` (dashes)

### Fix 3: Check Console Logs
- Open browser console (F12)
- Look for: "Number not on WhatsApp"
- This tells you why SMS was sent

---

## 📱 Expected Results

### If Number IS on WhatsApp:
- ✅ You should receive WhatsApp message
- ✅ Console shows: "WhatsApp sent successfully"

### If Number NOT on WhatsApp:
- ✅ You receive SMS message (automatic fallback)
- ✅ Console shows: "Number not on WhatsApp, sending SMS instead"
- ✅ This is working as designed!

---

## 💡 Recommendation

**The current behavior is correct!** The system:
- ✅ Tries WhatsApp first (when number is on WhatsApp)
- ✅ Falls back to SMS automatically (when number not on WhatsApp)
- ✅ Always delivers the message (high reliability)

**If you want WhatsApp specifically**:
1. Ensure customer phone number is on WhatsApp
2. Verify phone number format
3. Test with a known WhatsApp number

---

*Guide Created: December 5, 2025*
