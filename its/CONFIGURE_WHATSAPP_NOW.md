# ⚠️ Configure WhatsApp Now - Quick Guide

## The Error You're Seeing

```
⚠️ WhatsApp provider not configured. 
Configure WhatsApp WasenderAPI in Admin Settings → Integrations.
```

**This is normal!** The WhatsApp button is working perfectly - you just need to add your WasenderAPI credentials first.

---

## 🚀 Quick Fix (5 Minutes)

### Step 1: Get WasenderAPI Credentials

1. **Sign up at WasenderAPI** (if you haven't already)
   - Visit: [https://wasenderapi.com](https://wasenderapi.com)
   - Create an account
   - Create a WhatsApp session

2. **Get Your Credentials**
   - **API Key** (Bearer Token): Copy from your WasenderAPI dashboard
   - **Session ID**: Copy from your WhatsApp session settings

---

### Step 2: Configure in NEON POS

#### A. Navigate to Integrations Settings

```
Open NEON POS
    ↓
Go to Admin Settings (gear icon or settings menu)
    ↓
Click "Integrations" tab
    ↓
Look for "WasenderAPI" card
```

#### B. Add Your Credentials

1. Find the **"WasenderAPI"** integration card
2. Click **"Configure"** or **"Edit"** button
3. Fill in:
   - **API Key (Bearer Token)**: [Paste your WasenderAPI key]
   - **WhatsApp Session ID**: [Paste your session ID]
   - **API Base URL**: `https://wasenderapi.com/api` (default - usually pre-filled)
4. Toggle **"Enable Integration"** to ON
5. Click **"Save"**

---

### Step 3: Test It!

After saving:

1. Go back to **Customers** page
2. Click on any customer
3. Click the green **"WhatsApp"** button
4. Type a test message
5. Click **"Send WhatsApp"**
6. ✅ Success!

---

## 📍 Where to Find Admin Settings

### Desktop Version:

**Option 1: Top Navigation Bar**
```
Look for Settings/Admin icon in the top right
```

**Option 2: Side Menu**
```
Look for "Admin Settings" or "Settings" in the left sidebar
```

**Option 3: Direct URL**
```
Go to: /admin/settings (in your browser)
Or: /settings (depending on your routing)
```

---

## 🎯 What You'll See

### Integrations Page Layout:

```
┌────────────────────────────────────────────────┐
│  Integrations Management                       │
├────────────────────────────────────────────────┤
│                                                │
│  📱 SMS Service (MShastra)                    │
│  [Configure] [Test] [Enable/Disable]          │
│                                                │
│  💬 WasenderAPI  ← YOU NEED THIS ONE!         │
│  [Configure] [Test] [Enable/Disable]          │
│                                                │
│  ✉️  Email Service (SendGrid)                 │
│  [Configure] [Test] [Enable/Disable]          │
│                                                │
│  💳 M-Pesa Payment                             │
│  [Configure] [Test] [Enable/Disable]          │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🔧 Configuration Modal Fields

When you click "Configure" on WasenderAPI:

```
┌──────────────────────────────────────────┐
│  Configure WasenderAPI                   │
├──────────────────────────────────────────┤
│                                          │
│  Integration Name:                       │
│  WHATSAPP_WASENDER (read-only)          │
│                                          │
│  Provider Name:                          │
│  WasenderAPI (read-only)                │
│                                          │
│  ─────── Credentials ───────             │
│                                          │
│  API Key (Bearer Token): *              │
│  ┌────────────────────────────────────┐ │
│  │ [Paste your API key here]         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  WhatsApp Session ID: *                  │
│  ┌────────────────────────────────────┐ │
│  │ [Paste your session ID here]      │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ─────── Configuration ───────           │
│                                          │
│  API Base URL:                           │
│  ┌────────────────────────────────────┐ │
│  │ https://wasenderapi.com/api        │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ─────── Status ───────                  │
│                                          │
│  [x] Enable Integration                  │
│  [ ] Test Mode                           │
│                                          │
│  Environment: [Production ▼]             │
│                                          │
│  [ Cancel ]          [ Save ]            │
└──────────────────────────────────────────┘
```

---

## ✅ How to Verify It's Working

### Method 1: Status Check (Terminal)
```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main
node check-whatsapp-status.mjs
```

**Expected Output:**
```
✓ WhatsApp integration found
✓ Status: ENABLED
✓ API Key: Configured
✓ Session ID: Configured
✅ WhatsApp integration is READY!
```

### Method 2: Test Message (Terminal)
```bash
node test-whatsapp-connection.mjs --test-send=YOUR_PHONE_NUMBER
```

### Method 3: Send from Customer Details
1. Open any customer
2. Click green "WhatsApp" button
3. Send a test message
4. You should see: ✅ "WhatsApp message sent successfully!"

---

## 🐛 Still Having Issues?

### Issue: Can't find Admin Settings
**Solution**: 
- Check your user role - you need admin permissions
- Look for settings gear icon in top navigation
- Try direct URL: `/admin/settings` or `/settings`

### Issue: Can't find WasenderAPI integration
**Solution**:
- Refresh the page
- It should be pre-configured in the templates
- Look for "WhatsApp" or "WasenderAPI" card

### Issue: Save button doesn't work
**Solution**:
- Make sure both API Key and Session ID are filled
- Check browser console for errors
- Verify you have admin permissions

### Issue: Integration saves but still shows error
**Solution**:
- Make sure "Enable Integration" toggle is ON
- Refresh your application (hard refresh: Cmd+Shift+R)
- Check status with: `node check-whatsapp-status.mjs`

---

## 📞 Quick Support Commands

```bash
# Check WhatsApp status
node check-whatsapp-status.mjs

# Test connection
node test-whatsapp-connection.mjs

# Send test message
node test-whatsapp-connection.mjs --test-send=255XXXXXXXXX
```

---

## 🎯 Summary

**The WhatsApp button IS working!** You just need to:

1. ✅ Go to Admin Settings → Integrations
2. ✅ Find WasenderAPI
3. ✅ Add your API Key and Session ID
4. ✅ Enable the integration
5. ✅ Save
6. ✅ Test it!

**Time needed**: 5 minutes  
**Difficulty**: Easy  
**Status**: Ready to configure  

---

## 💡 Pro Tips

1. **Save your credentials** somewhere safe (password manager)
2. **Test with your own number** first before sending to customers
3. **Monitor the logs** in Communications tab after sending
4. **Check WhatsApp Web** to verify messages are sent from your account

---

**Once configured, you'll be able to send WhatsApp messages to customers with one click!** 🚀

Need help? Run: `node check-whatsapp-status.mjs`

