# Testing WhatsApp Media Upload

## Quick Test Guide

The WhatsApp media upload issue has been fixed! Here's how to test it:

### Prerequisites

1. **Development Server Running**
   ```bash
   npm run dev
   ```
   Should be running on `http://localhost:5173` (or your configured port)

2. **API Server Running** (for production uploads)
   ```bash
   # In a separate terminal
   npm run api
   # OR
   node server/api.mjs
   ```
   Should start on `http://localhost:3001`

### Testing in Development Mode

Development mode uses **base64 encoding** - no external server needed!

1. Open your app at `http://localhost:5173`
2. Navigate to **WhatsApp → Inbox**
3. Click **Bulk Messages** button
4. In the bulk message composer:
   - Select message type: **Image**, **Video**, or **Document**
   - Click **Upload File** or drag and drop a file
   - Choose a test file (max 16MB)
5. Watch the browser console for logs:
   ```
   📤 Uploading WhatsApp media: { name, type, size }
   🔧 Development mode: Using base64 data URL
   ✅ Media converted to base64 successfully
   ```
6. You should see: **"Media uploaded successfully!"** toast notification
7. The file preview should appear in the message composer
8. Complete the bulk message setup and send

### Testing in Production Mode

Production mode uploads to **WasenderAPI** via the Node.js server.

1. Ensure API server is running (`npm run api`)
2. Check that WasenderAPI credentials are configured:
   ```env
   VITE_WASENDER_API_KEY=your_key
   VITE_WASENDER_INSTANCE_ID=your_instance
   ```
3. Follow steps 1-4 from development testing
4. Watch browser console for:
   ```
   📤 Uploading WhatsApp media: { name, type, size }
   🚀 Production mode: Uploading to server API
   📡 Uploading to: /api/upload
   📡 Upload response status: 200
   ✅ Media uploaded successfully: https://...
   ```
5. Check API server terminal for:
   ```
   📤 Proxying media upload to WasenderAPI: filename.jpg
   📋 File size: 1.23MB
   ✅ Media uploaded successfully: https://...
   ```

### What to Look For

#### Success Indicators ✅
- Green toast: "Media uploaded successfully!"
- Console log: `✅ Media uploaded successfully`
- File URL in console (base64 or https://)
- Preview appears in message composer
- No errors in console

#### If Upload Fails ❌
Check console for specific errors:

**"File is too large"**
- File exceeds 16MB
- Try a smaller file

**"Invalid file type"**
- Unsupported format
- Use: JPG, PNG, WebP, GIF, MP4, PDF, XLS, XLSX

**"Upload failed: 500 Internal Server Error"**
- API server not running
- Run: `npm run api` or `node server/api.mjs`

**"Failed to get public URL"**
- Should not happen with new implementation
- If it does, check mockStorage in supabaseClient.ts

### Detailed Console Logs

When you upload a file, you should see this flow:

```
[Development Mode]
📤 Uploading WhatsApp media: {
  name: "test-image.jpg"
  type: "image/jpeg"
  size: "2.45MB"
}
🔧 Development mode: Using base64 data URL
✅ Media converted to base64 successfully
✅ Upload successful, getting public URL...
✅ Media uploaded successfully!
   📍 URL: data:image/jpeg;base64,/9j/4AAQ...
   📦 Size: 2510.23KB
```

```
[Production Mode]
📤 Uploading WhatsApp media: {
  name: "test-image.jpg"
  type: "image/jpeg"  
  size: "2.45MB"
}
🚀 Production mode: Uploading to server API
📡 Uploading to: /api/upload
📤 Storage upload: { bucket: 'whatsapp-media', path: 'whatsapp-bulk/...', fileSize: 2570240 }
📡 Upload response status: 200
📡 Upload result: { url: "https://..." }
✅ Media uploaded successfully: https://...
🔗 Getting public URL: { bucket: 'whatsapp-media', path: '...', url: 'https://...' }
✅ Media uploaded successfully!
   📍 URL: https://...
   📦 Size: 2510.23KB
```

### Browser DevTools

1. Open DevTools (F12)
2. Go to **Console** tab
3. Filter by "media" or "upload" to see relevant logs
4. Check **Network** tab to see the upload request
   - Should show: `POST /api/upload` with status 200
   - Response should have a `url` field

### Testing Different File Types

Test with these file types to ensure validation works:

**✅ Should Work:**
- `image.jpg` (JPEG image)
- `photo.png` (PNG image)
- `animation.gif` (GIF image)
- `modern.webp` (WebP image)
- `video.mp4` (MP4 video)
- `document.pdf` (PDF document)
- `spreadsheet.xlsx` (Excel file)

**❌ Should Fail:**
- `large-file.mov` (if > 16MB)
- `document.txt` (text files not supported)
- `audio.m4a` (audio files - might need to add support)

### Manual API Test

Test the upload endpoint directly:

```bash
curl -X POST http://localhost:3001/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/test-image.jpg"
```

Expected response:
```json
{
  "url": "https://wasenderapi.com/media/...",
  "success": true
}
```

### Troubleshooting

#### Upload button does nothing
1. Check if file size > 16MB
2. Look for JavaScript errors in console
3. Verify file type is supported

#### "Media uploaded!" but can't send message
- Upload worked correctly
- Issue is likely with WhatsApp API send logic
- Check WasenderAPI credentials and instance status

#### Development works, production fails
1. Check API server is running: `lsof -i :3001`
2. Verify WasenderAPI credentials in .env
3. Check server logs for errors
4. Test API endpoint directly with curl

#### Base64 URLs too long
- This is normal for development mode
- Files are embedded as data URLs
- In production, real URLs are used

### Files to Check

If issues persist, check these files:

1. **src/lib/whatsappMediaStorage.ts**
   - Main upload logic
   - Dev vs production mode switching

2. **src/lib/supabaseClient.ts** (lines 1684-1743)
   - Mock storage implementation
   - URL storage and retrieval

3. **src/features/whatsapp/pages/WhatsAppInboxPage.tsx** (lines 759-812)
   - Upload trigger and error handling
   - User feedback

4. **server/api.mjs** (lines 65-132)
   - Upload proxy to WasenderAPI
   - Production upload handling

### Environment Check

Verify your setup:

```bash
# Check Node.js version (should be 16+)
node --version

# Check if API server port is available
lsof -i :3001

# Check if dev server is running
lsof -i :5173

# Verify environment variables
cat .env | grep WASENDER
```

### Success Criteria

✅ Development mode: Base64 conversion works  
✅ Production mode: Upload to WasenderAPI works  
✅ Error messages are clear and helpful  
✅ File validation prevents invalid uploads  
✅ Upload progress is shown to user  
✅ No "Failed to get public URL" error  

## Summary

The upload system now works in both modes:
- **Development**: Instant base64 conversion (no server needed)
- **Production**: Upload to WasenderAPI (requires API server)

If you encounter any issues, the detailed logs in the console will guide you to the problem!

**Ready to test? Go to WhatsApp Inbox → Bulk Messages → Upload File!** 🚀

