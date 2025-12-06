# 🔧 How to Enable WhatsApp Auto-Send After Sales

## 🎯 Problem

You created a sale but didn't receive a WhatsApp message.

**Most Likely Cause**: Auto-send is **DISABLED** by default!

---

## ✅ Solution: Enable Auto-Send (2 Minutes)

### Step 1: Open POS Settings

1. Go to your **POS page**
2. Look for the **Settings** button (⚙️ icon, usually top right)
3. Click it to open settings

### Step 2: Go to Notifications Tab

1. In the settings modal, find the **"Notifications"** tab
2. Click on it

### Step 3: Enable WhatsApp Auto-Send

You'll see these settings:

**Required Settings**:
- [ ] ✅ **"Enable WhatsApp Integration"** - Toggle this **ON**
- [ ] ✅ **"Auto-send after payment"** - Toggle this **ON** ⬅️ **THIS IS KEY!**
- [ ] ✅ **"Enable SMS Integration"** - Toggle this **ON** (for fallback)

**Important**: The "Auto-send after payment" setting is what automatically sends messages after each sale. It's disabled by default, so you must enable it!

### Step 4: Save Settings

1. Click **"Save Settings"** button
2. Settings are saved automatically

---

## 🔍 Verify WhatsApp is Configured

### Check Admin Settings

1. Go to **Settings → Admin Settings → Integrations**
2. Find **"WhatsApp (WasenderAPI)"**
3. Make sure:
   - ✅ Integration is enabled
   - ✅ API Key is entered
   - ✅ Session ID is entered
4. Click **Save** if you made changes

---

## 🧪 Test It

### Make a Test Sale

1. Go to POS page
2. Add products to cart
3. **Select a customer with a phone number** (or enter phone manually)
4. Complete the payment
5. ✅ **WhatsApp message should send automatically!**

---

## ✅ Success Indicators

### You'll Know It's Working When:

1. **After sale completion**, you see:
   - ✅ "Sale completed successfully!" message
   - ✅ Console shows: "WhatsApp notification sent successfully"

2. **Customer receives**:
   - ✅ WhatsApp message with receipt/invoice
   - ✅ OR SMS message if number not on WhatsApp (automatic fallback)

3. **No errors in console**:
   - Open browser console (F12) → Console tab
   - Should see success messages, not errors

---

## 🔍 Troubleshooting

### Still Not Working?

#### Check 1: Is Auto-Send Enabled?
- Go back to POS Settings → Notifications
- Verify "Auto-send after payment" is **ON**
- Save again

#### Check 2: Is WhatsApp Configured?
- Go to Admin Settings → Integrations
- Verify WhatsApp WasenderAPI is configured
- Check API Key and Session ID are correct

#### Check 3: Does Customer Have Phone?
- Customer must have a phone number
- Format should be: `+255712345678` or `255712345678`

#### Check 4: Browser Console
- Open browser DevTools (F12)
- Go to Console tab
- Look for error messages
- Check what the error says

---

## 📱 What Happens

### When Auto-Send is Enabled:

```
Sale Completed
    ↓
Check: Customer has phone? → YES
    ↓
Check: Auto-send enabled? → YES
    ↓
Check: Number on WhatsApp? → YES/NO
    ↓
Send WhatsApp (or SMS fallback)
    ↓
✅ Customer receives message!
```

### When Auto-Send is Disabled:

```
Sale Completed
    ↓
Check: Auto-send enabled? → NO ❌
    ↓
❌ No message sent (by design)
```

---

## 💡 Important Notes

1. **Auto-Send is OFF by Default**
   - You must enable it manually
   - This prevents unwanted messages

2. **Settings Location**
   - POS Settings → Notifications tab
   - NOT in Admin Settings (that's for API credentials)

3. **Phone Number Required**
   - Customer must have a phone number
   - Without phone, no message can be sent

4. **Smart Routing**
   - If number is on WhatsApp → Sends WhatsApp
   - If number NOT on WhatsApp → Sends SMS automatically
   - You don't need to choose - it's automatic!

---

## 🎯 Quick Summary

**To fix WhatsApp not sending after sales**:

1. ✅ Open POS Settings (⚙️)
2. ✅ Go to Notifications tab
3. ✅ Turn ON "Enable WhatsApp Integration"
4. ✅ Turn ON "Auto-send after payment" ⬅️ **MOST IMPORTANT!**
5. ✅ Save settings
6. ✅ Test with a sale

**That's it!** After enabling auto-send, WhatsApp messages will be sent automatically after every sale.

---

*Guide Created: December 5, 2025*
*Most Common Fix: Enable "Auto-send after payment" in POS Settings*
