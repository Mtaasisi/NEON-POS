# Production Backup & Restore Setup Guide

## Issue: "Could not connect to restore server" in Production

### Problem
In production, the restore functionality tries to connect to `localhost:8000`, which doesn't work because:
- The backend server needs to be deployed and accessible
- The API URL needs to be configured correctly

### Solution

#### Option 1: Deploy Backend Server (Recommended for SQL Restore)

1. **Deploy the backend server** to your hosting provider
   - The server is in the `server/` directory
   - It needs to run on a port accessible from your frontend

2. **Set the API URL environment variable**
   ```bash
   # In your production environment
   VITE_API_URL=https://your-backend-domain.com
   ```
   
   Or add to your `.env` file:
   ```
   VITE_API_URL=https://your-backend-domain.com
   ```

3. **Build your frontend with the environment variable**
   ```bash
   VITE_API_URL=https://your-backend-domain.com npm run build
   ```

#### Option 2: Use JSON Backups (Works Without Backend)

**Good News:** JSON backup preview now works **client-side** without a backend server!

- ✅ **JSON backups** can be previewed and restored without a backend
- ✅ Preview works entirely in the browser
- ⚠️ **SQL backups** still require a backend server for restore

**To use JSON backups:**
1. Create backups using the "Create Backup" button in Admin Settings
2. These create JSON files that work without a backend
3. Preview and restore work entirely client-side

#### Option 3: Use Same-Origin Backend

If your backend is on the same domain as your frontend:

1. The code now automatically uses `window.location.origin` in production
2. Just make sure your backend is accessible at `/api/backup/restore/*`
3. No environment variable needed if backend is on same domain

### Current Behavior

**JSON Files:**
- ✅ Preview works **client-side** (no backend needed)
- ✅ Can be restored if you have backend, or use alternative methods

**SQL Files:**
- ⚠️ Preview requires backend server
- ⚠️ Restore requires backend server

### Quick Fix for Production

**For immediate use with JSON backups:**

1. Use the built-in backup feature (creates JSON files)
2. JSON preview works without backend
3. For restore, you have two options:
   - Deploy the backend server
   - Or use a database tool to restore manually

**For SQL backups:**

1. Deploy the backend server
2. Set `VITE_API_URL` environment variable
3. Rebuild your frontend

### Environment Variables

Add to your production `.env` or build environment:

```bash
# Backend API URL (required for SQL restore)
VITE_API_URL=https://your-backend-server.com

# Or if backend is on same domain, leave unset (uses window.location.origin)
```

### Testing

1. **Test JSON preview:**
   - Create a JSON backup
   - Try to preview it - should work without backend

2. **Test SQL preview:**
   - Requires backend server running
   - Should connect to `${VITE_API_URL}/api/backup/restore/preview`

3. **Test restore:**
   - JSON: Works if backend is available
   - SQL: Requires backend server

### Troubleshooting

**Error: "Could not connect to restore server"**

1. Check if `VITE_API_URL` is set correctly
2. Verify backend server is running and accessible
3. Check CORS settings on backend
4. For JSON files, preview should work without backend

**Error: "CORS error"**

- Backend needs to allow requests from your frontend domain
- Check `server/src/index.ts` CORS configuration

### Recommended Setup

**Best Practice:**
1. Deploy backend server to same domain or subdomain
2. Use JSON backups for easier client-side preview
3. Set `VITE_API_URL` if backend is on different domain
4. Use SQL backups for full database restore (requires backend)

---

**Last Updated:** 2025-01-27
**Status:** ✅ JSON preview works client-side, SQL requires backend

