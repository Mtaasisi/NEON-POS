# 🖼️ WhatsApp Media Upload Debug Guide

## Overview

Comprehensive debug logging has been added to the WhatsApp media upload system to help diagnose issues when sending images, videos, documents, or audio files in bulk messages.

---

## 🔍 What Was Added

### 1. **Client-Side Upload Logging** (`src/lib/whatsappMediaStorage.ts`)
Detailed logs for the browser-side upload process

### 2. **Server-Side Proxy Logging** (`server/api.mjs`)
Server-side logs showing what's being forwarded to WasenderAPI

---

## 📊 Debug Log Flow

### Client-Side Upload (Browser Console)

When you upload media, you'll see:

```
╔═══════════════════════════════════════════════╗
║    📤 WHATSAPP MEDIA UPLOAD - CLIENT         ║
╚═══════════════════════════════════════════════╝
📁 [FILE] Details:
   • Name: product-image.jpg
   • Type: image/jpeg
   • Size: 2456789 bytes (2.34MB)
   • Last Modified: 2024-01-15T10:30:00.000Z

🔍 [VALIDATION] Checking file...
✅ [VALIDATION] File is valid
📝 [FILENAME] Generated safe name: whatsapp-1736847123456-product-abc123.jpg

🚀 [UPLOAD] Preparing to upload via proxy...
📦 [FORMDATA] Created FormData with file

🔑 [AUTH] Fetching WhatsApp API key from integrations...
✅ [AUTH] API key found: wasender_...

📡 [REQUEST] Sending to server proxy:
   URL: /api/whatsapp/upload-media
   Method: POST
   Headers: {
     "Authorization": "Bearer wasender_..."
   }
   Body: FormData with file

📡 [RESPONSE] Received (1523ms):
   Status: 200 OK
   Headers: {...}

📥 [RESPONSE] Body: {"success":true,"url":"https://..."}
📋 [PARSED] Result: {
  "success": true,
  "url": "https://wasenderapi.com/media/..."
}

✅ [SUCCESS] Media uploaded successfully!
   Media URL: https://wasenderapi.com/media/...
   URL type: HTTP URL
───────────────────────────────────────────────
```

### Server-Side Proxy (Server Console)

On the server, you'll see:

```
╔═══════════════════════════════════════════════╗
║  📤 WHATSAPP MEDIA UPLOAD - SERVER PROXY     ║
╚═══════════════════════════════════════════════╝
📥 [REQUEST] Received upload request
   Headers: {
     "authorization": "Bearer wasender_...",
     "content-type": "multipart/form-data; boundary=...",
     ...
   }

📋 [FILE INFO] Parsed file details:
   • Original Name: product-image.jpg
   • Field Name: file
   • MIME Type: image/jpeg
   • Size: 2456789 bytes (2.34MB)
   • Buffer Length: 2456789

🔑 [AUTH] API Key: wasender_...

📦 [FORMDATA] Created form data for WasenderAPI
   • Filename: product-image.jpg
   • Content-Type: image/jpeg
   • Size: 2456789

🚀 [UPLOAD] Sending to WasenderAPI...
   URL: https://wasenderapi.com/api/upload
   Method: POST
   Headers: {
     "Authorization": "Bearer wasender_...",
     "content-type": "multipart/form-data; boundary=..."
   }

📡 [RESPONSE] Status: 200 OK
📡 [RESPONSE] Body: {"success":true,"url":"https://..."}
📋 [PARSED] Response data: {
  "success": true,
  "url": "https://wasenderapi.com/media/..."
}

✅ [SUCCESS] Media uploaded successfully
   Media URL: https://wasenderapi.com/media/...
───────────────────────────────────────────────
```

---

## 🚨 Common Errors & Their Debug Logs

### Error 1: "File type 'multipart/form-data...' is not supported"

**What the logs show:**
```
📋 [FILE INFO] Parsed file details:
   • MIME Type: multipart/form-data; boundary=...  ⚠️ WRONG!
   
Should be:
   • MIME Type: image/jpeg  ✓ CORRECT
```

**Cause:** The file's MIME type is being incorrectly parsed  
**Fix:** Check that multer is properly configured and the file field name matches ('file')

### Error 2: "The image url must be a complete URL"

**What the logs show:**
```
✅ [SUCCESS] Media uploaded successfully
   Media URL: /uploads/some-file.jpg  ⚠️ RELATIVE PATH
   URL type: Unknown

Should be:
   Media URL: https://domain.com/uploads/some-file.jpg  ✓ COMPLETE URL
   URL type: HTTP URL
```

**Cause:** The media URL returned is not a complete URL with http:// or https://  
**Fix:** WasenderAPI should return a full URL. Check the response from WasenderAPI.

### Error 3: "No file uploaded"

**What the logs show:**
```
Server:
📥 [REQUEST] Received upload request
❌ [ERROR] No file uploaded in request

Client:
📦 [FORMDATA] Created FormData with file
📡 [REQUEST] Sending to server proxy...
❌ [ERROR] Upload failed with status: 400
```

**Cause:** FormData not being sent correctly or wrong field name  
**Fix:** Ensure the field name in FormData is 'file' to match multer's upload.single('file')

### Error 4: "API key required"

**What the logs show:**
```
Client:
⚠️ [AUTH] No API key found in integration settings

Server:
❌ [ERROR] No API key provided
```

**Cause:** WhatsApp WasenderAPI integration not configured  
**Fix:** Go to Admin Settings → Integrations → Configure WHATSAPP_WASENDER with your API key

### Error 5: Upload timeout or hangs

**What the logs show:**
```
Client:
📡 [REQUEST] Sending to server proxy...
(... no response ...)
```

**Cause:** File too large or network issue  
**Fix:** 
- Check file size (max 16MB for WhatsApp)
- Check server is running and accessible
- Check network connection

---

## 🔧 How to Use These Logs for Debugging

### Step 1: Open Both Consoles

**Browser Console:**
- Open DevTools (F12)
- Go to Console tab
- Keep it open while uploading

**Server Console:**
- Check your terminal running the Node.js server
- Watch for logs as uploads happen

### Step 2: Trigger an Upload

Send a bulk WhatsApp message with an image to trigger the upload

### Step 3: Compare Logs

**Check Client Logs:**
1. Did file validation pass?
2. Was API key found?
3. What was the response status?
4. Was a URL returned?

**Check Server Logs:**
1. Was the file received correctly?
2. What was the MIME type?
3. What was sent to WasenderAPI?
4. What did WasenderAPI respond?

### Step 4: Identify the Problem

Match your error with the common errors above, or look for:
- ❌ symbols showing where things failed
- ⚠️ symbols showing warnings
- Status codes (400, 401, 500, etc.)
- Error messages in the response

---

## 📋 Quick Checklist

Before uploading media for bulk sending:

- [ ] Server is running and accessible
- [ ] WhatsApp WasenderAPI integration is configured
- [ ] API key is valid and has upload permissions
- [ ] File size is under 16MB
- [ ] File type is supported (images, videos, PDFs, Excel)
- [ ] Both browser and server consoles are open for monitoring

---

## 🎯 What Each Field Means

### Client-Side Fields

| Field | Meaning | Expected Value |
|-------|---------|----------------|
| **Name** | Original filename | product-image.jpg |
| **Type** | MIME type of file | image/jpeg, image/png, etc. |
| **Size** | File size in bytes | < 16777216 (16MB) |
| **API Key** | WasenderAPI key | wasender_... or Bearer token |
| **Response Status** | HTTP status code | 200 = success, 4xx/5xx = error |
| **Media URL** | Returned URL | Must start with http:// or https:// |

### Server-Side Fields

| Field | Meaning | Expected Value |
|-------|---------|----------------|
| **Original Name** | Filename from client | product-image.jpg |
| **Field Name** | Form field name | Must be "file" |
| **MIME Type** | Content type | image/jpeg (NOT multipart/form-data) |
| **Buffer Length** | Actual file data size | Should match Size |
| **WasenderAPI Response** | API response | {"success":true,"url":"..."} |

---

## 💡 Tips

1. **Save Logs**: Right-click in console → "Save as..." to export logs for later analysis

2. **Filter Logs**: In browser console, type:
   - Filter: `UPLOAD` to see only upload-related logs
   - Filter: `ERROR` to see only errors
   - Filter: `SUCCESS` to see only successful operations

3. **Test with Small File First**: Use a small image (< 1MB) to test the upload pipeline

4. **Check WasenderAPI Status**: If uploads consistently fail, check WasenderAPI's status page or documentation

5. **Development Fallback**: In development mode, the system will fall back to base64 encoding if upload fails (won't work with WasenderAPI but good for testing UI)

---

## 🐛 Example Debug Session

Here's what successful media upload looks like:

### Browser Console:
```
╔═══════════════════════════════════════════════╗
║    📤 WHATSAPP MEDIA UPLOAD - CLIENT         ║
╚═══════════════════════════════════════════════╝
📁 [FILE] Details:
   • Name: test-image.png
   • Type: image/png
   • Size: 845632 bytes (0.81MB)
   ...
✅ [VALIDATION] File is valid
🔑 [AUTH] API key found: wasender_abc...
📡 [RESPONSE] Received (1234ms):
   Status: 200 OK
✅ [SUCCESS] Media uploaded successfully!
   Media URL: https://wasenderapi.com/media/xyz123.png
   URL type: HTTP URL
```

### Server Console:
```
╔═══════════════════════════════════════════════╗
║  📤 WHATSAPP MEDIA UPLOAD - SERVER PROXY     ║
╚═══════════════════════════════════════════════╝
📥 [REQUEST] Received upload request
📋 [FILE INFO] Parsed file details:
   • MIME Type: image/png  ✓
   • Size: 845632 bytes (0.81MB)
🚀 [UPLOAD] Sending to WasenderAPI...
📡 [RESPONSE] Status: 200 OK
✅ [SUCCESS] Media uploaded successfully
   Media URL: https://wasenderapi.com/media/xyz123.png
```

**Result:** Image successfully uploaded and ready to send! ✅

---

## 🆘 Still Having Issues?

If you're still experiencing problems after reviewing the logs:

1. **Copy the full error logs** from both browser and server consoles
2. **Check if the error is consistent** (happens every time or intermittent)
3. **Try a different file** to see if it's file-specific
4. **Verify WasenderAPI credentials** in the integration settings
5. **Check WasenderAPI documentation** for any recent API changes

The debug logs should give you enough information to pinpoint exactly where the upload process is failing!

---

**Happy debugging!** 🎉🐛

