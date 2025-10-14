# 📱 MShastra (Mobishastra) SMS - Complete Setup Guide

## ✅ All Required Fields Configured!

Your MShastra integration template now has **ALL** the fields needed to send SMS successfully!

---

## 🎯 What MShastra Needs

### Required Fields:
1. ✅ **API Username** (user) - Your MShastra account username
2. ✅ **API Password** (pwd) - Your MShastra account password
3. ✅ **Sender ID** (senderid) - Your registered sender ID

### Optional Fields:
4. ✅ **API URL** - MShastra API endpoint (default: https://api.mshastra.com/sms)
5. ✅ **Priority** - Message priority (High/Medium/Low)
6. ✅ **Country Code** - Target country (default: ALL)

---

## 🚀 How to Configure MShastra

### Step 1: Add Integration in Admin Settings
1. Go to: **Admin Settings → Integrations**
2. Click: **"MShastra"** card
3. You'll see a form with all required fields:

### Step 2: Fill in Credentials

**API Username:** (Required)
```
Your MShastra username
Example: user12345 or your_email@example.com
```

**API Password:** (Required)
```
Your MShastra password
Example: your_secure_password
```

**Sender ID:** (Required)
```
Your registered sender ID
Example: LATS POS or LATSCHANCE
Note: Must be registered with MShastra
```

### Step 3: Fill in Configuration

**API URL:** (Required)
```
https://api.mshastra.com/sms
```

**Priority:** (Optional)
```
Choose: High / Medium / Low
Default: High
```

**Country Code:** (Optional)
```
Default: ALL
Or specific: TZ, KE, UG, etc.
```

**Max Retries:** (Optional)
```
Default: 3
```

**Timeout:** (Optional)
```
Default: 30000 (30 seconds)
```

### Step 4: Enable & Save
- ✅ Check "Enable Integration"
- Click **"Save Integration"**

---

## 📋 MShastra API Parameters

The integration sends SMS with these parameters:

```
GET https://api.mshastra.com/sms?
  user=YOUR_USERNAME
  &pwd=YOUR_PASSWORD
  &senderid=LATS_POS
  &mobileno=255712345678
  &msgtext=Your message here
  &priority=High
  &CountryCode=ALL
```

All these fields are now in the template! ✅

---

## 🧪 Test Your MShastra Integration

### Method 1: Quick Test Button (In Admin Settings)
1. Go to: Admin Settings → Integrations
2. Find your MShastra integration
3. Click the blue **Test button** (🧪)
4. Should show: ✅ "MShastra test passed!"

### Method 2: Comprehensive Test Page
1. Go to: `/integrations-test`
2. Enter test phone number: `+255712345678`
3. Enter test message
4. Click **"Test SMS"**
5. Should send actual SMS!

### Method 3: Test from Anywhere in App
1. Go to any page that sends SMS (e.g., Share Receipt)
2. Click "Send via SMS"
3. Should send using MShastra automatically!

---

## ✅ What Happens When You Send SMS

```
User clicks "Send SMS"
       ↓
SMS Service fetches credentials from database
       ↓
Gets: api_key, api_password, sender_id, api_url
       ↓
Sends to MShastra API with all parameters:
  user=YOUR_USERNAME
  pwd=YOUR_PASSWORD
  senderid=YOUR_SENDER_ID
  mobileno=PHONE_NUMBER
  msgtext=MESSAGE
  priority=High
  CountryCode=ALL
       ↓
MShastra sends SMS
       ↓
Tracks usage in database
       ↓
Shows success/failure to user
```

---

## 🔍 Verify Configuration

### Check in Database:
```sql
SELECT 
  integration_name,
  provider_name,
  credentials->>'api_key' as "Username",
  credentials->>'sender_id' as "Sender ID",
  config->>'api_url' as "API URL",
  config->>'priority' as "Priority",
  is_enabled
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY';
```

**Expected Output:**
```
integration_name | provider_name | Username    | Sender ID | API URL                         | Priority | is_enabled
-----------------|---------------|-------------|-----------|----------------------------------|----------|------------
SMS_GATEWAY      | MShastra      | user12345   | LATS POS  | https://api.mshastra.com/sms    | High     | true
```

---

## 📱 MShastra Account Setup

### If You Don't Have MShastra Account:

1. **Sign Up:**
   - Visit: https://www.mshastra.com or https://mobishastra.com
   - Create an account
   - Verify your account

2. **Get Credentials:**
   - Login to MShastra dashboard
   - Find your API credentials
   - Note: Username (user)
   - Note: Password (pwd)

3. **Register Sender ID:**
   - Submit sender ID for approval
   - Example: LATS POS, LATSCHANCE
   - Wait for approval (usually 1-2 days)

4. **Add Credits:**
   - Buy SMS credits
   - Check balance in dashboard

5. **Use Credentials:**
   - Add to Admin Settings → Integrations
   - Test and start sending!

---

## 🎯 Field Mapping Reference

| MShastra API | Integration Field | Location | Example |
|--------------|-------------------|----------|---------|
| user | api_key | Credentials | user12345 |
| pwd | api_password | Credentials | mypassword |
| senderid | sender_id | Credentials | LATS POS |
| API endpoint | api_url | Config | https://api.mshastra.com/sms |
| priority | priority | Config | High |
| CountryCode | country_code | Config | ALL |

---

## ✅ Checklist - MShastra Ready?

Before sending SMS, verify:

- [ ] MShastra account created
- [ ] API username obtained
- [ ] API password obtained
- [ ] Sender ID registered & approved
- [ ] SMS credits purchased
- [ ] Credentials added to Admin Settings → Integrations
- [ ] Integration enabled
- [ ] Test button shows ✅ Passed
- [ ] Test SMS sent successfully at `/integrations-test`

**All checked?** You're ready to send SMS! 🎉

---

## 🔥 Common Issues & Fixes

### Issue: "API key is required"
**Fix:** Make sure API Username field is filled

### Issue: "Invalid credentials"
**Fix:** 
- Check username is correct
- Check password is correct
- Login to MShastra dashboard to verify

### Issue: "Sender ID not registered"
**Fix:**
- Register sender ID in MShastra dashboard
- Wait for approval
- Use approved sender ID

### Issue: "Insufficient balance"
**Fix:**
- Check balance in MShastra dashboard
- Add credits
- Try again

### Issue: "Invalid phone number"
**Fix:**
- Use format: +255712345678 (with country code)
- Or: 255712345678 (without + sign)
- Must be valid Tanzanian number for MShastra

---

## 🎊 You're All Set!

Your MShastra integration now has:

✅ **All Required Fields:**
- API Username
- API Password
- Sender ID

✅ **All Configuration Options:**
- API URL
- Priority
- Country Code
- Max Retries
- Timeout

✅ **Working Features:**
- Test button in Admin Settings
- Comprehensive test page
- Automatic usage tracking
- Error handling
- Retry logic

---

## 🚀 Quick Start

1. **Get MShastra Credentials:**
   - Username: Your MShastra username
   - Password: Your MShastra password
   - Sender ID: Your registered sender ID

2. **Add to App:**
   - Admin Settings → Integrations
   - Click "MShastra" card
   - Fill all fields
   - Enable and Save

3. **Test:**
   - Click Test button (🧪)
   - Or go to `/integrations-test`
   - Send test SMS

4. **Use:**
   - SMS service automatically uses MShastra
   - No code changes needed!

---

**Your MShastra integration is now complete and ready to work!** 🎉

All required fields are configured. Just add your credentials and start sending! 🚀

