# 🔥 Backend Server Quick Start Guide

## ✅ Problem Solved!

The error `ERR_CONNECTION_REFUSED` on `http://localhost:8000/api/sms-proxy` was happening because **the backend server was not running**.

## 🚀 How to Start the Backend Server

### Option 1: Development Mode (with auto-reload)
```bash
cd server
npm run dev
```

### Option 2: Production Mode
```bash
cd server
npm run build
npm start
```

## ✅ Verify Server is Running

1. **Check Health Endpoint:**
   ```bash
   curl http://localhost:8000/health
   ```
   
   Expected response:
   ```json
   {"status":"ok","timestamp":"2025-11-11T03:07:09.934Z","uptime":7.467287334}
   ```

2. **Check Available Endpoints:**
   - `GET  /health` - Health check
   - `POST /api/auth/login` - Authentication
   - `GET  /api/products` - Products
   - `POST /api/cart/add` - Cart management
   - `POST /api/sales` - Sales
   - `POST /api/sms-proxy` - **SMS Proxy (this is what you need!)**

## 📱 SMS Service Setup

The backend server on port 8000 is **required** for SMS functionality because:

1. **CORS Protection**: Direct browser calls to SMS providers are blocked by CORS
2. **Security**: API keys are not exposed in the frontend
3. **Proxy**: The backend acts as a secure proxy to forward SMS requests

### SMS Flow:
```
Frontend (smsService.ts) 
    ↓
Backend Proxy (localhost:8000/api/sms-proxy)
    ↓
SMS Provider (MShastra/etc)
```

## 🔧 Configuration

The backend server:
- **Port**: 8000 (configurable via `PORT` environment variable)
- **CORS**: Enabled for all origins in development
- **Environment**: Development mode with hot reload

## 🎯 What Changed

**Before**: Frontend tried to connect to `http://localhost:8000/api/sms-proxy` but got `ERR_CONNECTION_REFUSED`

**After**: Backend server is running on port 8000, and SMS requests are proxied successfully

## 💡 Development Workflow

1. **Start Backend Server** (Terminal 1):
   ```bash
   cd server
   npm run dev
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   npm run dev
   ```

3. **Now SMS Notifications Will Work!**

## 🐛 Troubleshooting

### Issue: Port 8000 already in use
```bash
# Find and kill the process using port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
PORT=8001 npm run dev
```

### Issue: Server won't start
```bash
# Reinstall dependencies
cd server
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: SMS still failing
Check that:
1. ✅ Backend server is running (`curl http://localhost:8000/health`)
2. ✅ SMS integration is configured in Admin Settings → Integrations
3. ✅ API keys, URL, and credentials are set correctly

## ✨ Status

**Current Status**: ✅ Backend server is running successfully!

The server is now active and ready to handle SMS proxy requests. Your SMS notifications should work when you process sales in the POS.
