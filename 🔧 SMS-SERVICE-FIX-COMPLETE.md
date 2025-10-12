# 📱 SMS Service Fixed - Setup Guide

## ✅ What Was Fixed

The SMS service was trying to access a PHP endpoint (`/api/sms-proxy.php`), but your app runs on a Node.js/Vite stack that can't execute PHP files. 

**Fixed by:**
1. ✅ Created a proper Node.js/Express SMS proxy endpoint (`/server/src/routes/sms.ts`)
2. ✅ Registered the route in the Express server
3. ✅ Updated SMS service to use the correct endpoint (`.php` removed)

---

## 🚀 Quick Start

### Step 1: Start the Backend Server

The backend server needs to be running to handle SMS requests.

```bash
# Open a new terminal window
cd server
npm install  # Only needed first time
npm run dev
```

You should see:
```
✅ Server running on http://localhost:8000
📊 Environment: development
🔗 CORS enabled for: http://localhost:3000

Available endpoints:
  GET  /health
  POST /api/auth/login
  GET  /api/products
  POST /api/cart/add
  POST /api/sales
  POST /api/sms-proxy  ← Your new SMS endpoint!
```

### Step 2: Start the Frontend (if not already running)

```bash
# In another terminal, from the project root
npm run dev
```

### Step 3: Configure SMS Settings

Make sure you have SMS provider settings configured in your database:

```sql
-- Check your settings
SELECT * FROM settings WHERE key IN (
  'sms_provider_api_key',
  'sms_api_url',
  'sms_provider_password'
);

-- If not configured, add them:
INSERT INTO settings (key, value) VALUES
  ('sms_provider_api_key', 'your_api_key_here'),
  ('sms_api_url', 'https://sms.mshastra.com/sendurl.aspx'),
  ('sms_provider_password', 'your_password_here');
```

### Step 4: Test SMS Functionality

1. Open your app at `http://localhost:3000`
2. Try to send an SMS (e.g., when creating a customer or device)
3. Check the console for SMS logs

---

## 🧪 Testing with Test Phone Numbers

The service automatically simulates success for test phone numbers:

- `255700000000` - Test number
- Any number starting with `255700` - Test numbers

Use these for testing without actually sending SMS.

---

## 🔍 Troubleshooting

### Issue: Still getting 500 error

**Check:**
1. Backend server is running on port 8000
2. Frontend is proxying requests correctly
3. Check terminal logs for both servers

### Issue: Backend server won't start

**Solution:**
```bash
cd server
npm install
npm run dev
```

### Issue: "SMS provider not configured"

**Solution:**
- Configure SMS settings in database (see Step 3)
- Restart the app to reload settings
- Check console logs for initialization messages

### Issue: Port 8000 already in use

**Solution:**
```bash
# Kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or change port in server/.env
PORT=8001
```

Then update `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8001',  // Updated port
    ...
  }
}
```

---

## 📋 Supported SMS Providers

The proxy automatically detects and formats requests for:

1. **Mobishastra** (`mshastra.com`)
   - Uses GET requests with query parameters
   - Requires: user, pwd, senderid, mobileno, msgtext

2. **SMS Tanzania** (`smstanzania.com`)
   - Uses POST with JSON body
   - Requires: Bearer token authorization

3. **BulkSMS** (`bulksms.com`)
   - Uses POST with JSON body
   - Requires: Bearer token authorization

4. **Generic Provider**
   - Uses POST with JSON body
   - Default format for other providers

---

## 📝 What Changed

### Files Modified:

1. **`server/src/routes/sms.ts`** (NEW)
   - SMS proxy endpoint implementation
   - Provider detection and formatting
   - Response parsing

2. **`server/src/index.ts`**
   - Registered SMS route
   - Added to endpoint list

3. **`src/services/smsService.ts`**
   - Updated endpoint from `/api/sms-proxy.php` to `/api/sms-proxy`

---

## ✨ Features

✅ **CORS-Safe**: Backend proxy avoids browser CORS issues  
✅ **Provider Agnostic**: Auto-detects SMS provider format  
✅ **Test Mode**: Simulates SMS for test phone numbers  
✅ **Error Handling**: Detailed logging and error messages  
✅ **Security**: API keys never exposed to browser  

---

## 🎯 Next Steps

1. ✅ Start both servers (backend + frontend)
2. ✅ Configure SMS settings in database
3. ✅ Test with test phone numbers first
4. ✅ Test with real phone number
5. ✅ Monitor SMS logs in database

---

**Need Help?**

Check the console logs:
- Frontend console (browser): SMS service initialization
- Backend terminal: SMS proxy requests and responses

---

*SMS service is now properly integrated with your Node.js stack!* 🎉

