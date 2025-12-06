# 🚀 Manual Deployment Instructions for dukani.site/lats/

## ✅ Files Ready to Upload

Your production build is ready in the `dist` folder. All files have the correct `/lats/` path configuration.

---

## 📋 Step-by-Step Upload Instructions

### **Method 1: Using FTP/SFTP (FileZilla, Cyberduck, etc.)**

1. **Connect to your server:**
   - Host: Your server IP or hostname
   - Username: Your FTP/SFTP username
   - Password: Your FTP/SFTP password
   - Port: 21 (FTP) or 22 (SFTP)

2. **Navigate to your website's root directory:**
   - Usually: `/public_html/` or `/www/` or `/htdocs/`

3. **Create or navigate to the `/lats/` folder:**
   - If it doesn't exist, create a folder named `lats`
   - Navigate into the `lats` folder

4. **Upload ALL files from your local `dist` folder:**
   - Select all files and folders inside `dist/`
   - Upload them to the `/lats/` folder on your server
   - **IMPORTANT:** Make sure `.htaccess` is uploaded (it might be hidden)
   - Enable "Show hidden files" in your FTP client to see `.htaccess`

5. **Verify the structure on your server:**
   ```
   /public_html/
   └── lats/
       ├── .htaccess          ← CRITICAL for MIME types!
       ├── index.html
       ├── assets/
       │   ├── index-222cfb29.js
       │   ├── index-d3868143.css
       │   └── ... (all other assets)
       ├── api/
       ├── icons/
       └── ... (all other files)
   ```

---

### **Method 2: Using cPanel File Manager**

1. **Log in to cPanel**
2. **Open File Manager**
3. **Navigate to `public_html/` (or your website root)**
4. **Create or open the `lats` folder**
5. **Click "Upload" button**
6. **Select all files from your `dist` folder and upload**
7. **Important:** After upload, check if `.htaccess` is there:
   - Click "Settings" (top right)
   - Enable "Show Hidden Files (dotfiles)"
   - Look for `.htaccess` in the file list
   - If not there, upload it manually from `dist/.htaccess`

---

### **Method 3: Using Command Line (SSH)**

If you have SSH access to your server:

```bash
# 1. Connect to your server
ssh username@your-server.com

# 2. Navigate to web root
cd /public_html/  # or your web root path

# 3. Create lats directory if it doesn't exist
mkdir -p lats

# 4. Exit SSH and use SCP to upload from your Mac:
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
scp -r dist/* username@your-server.com:/public_html/lats/

# 5. Verify .htaccess is uploaded
ssh username@your-server.com "ls -la /public_html/lats/.htaccess"
```

---

## 🔍 Critical Files to Verify

After uploading, **verify these files exist** on your server:

1. ✅ `/lats/.htaccess` - **CRITICAL** for fixing MIME type errors
2. ✅ `/lats/index.html`
3. ✅ `/lats/assets/index-222cfb29.js`
4. ✅ `/lats/assets/index-d3868143.css`

---

## 🧪 Testing After Upload

1. **Clear browser cache:**
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`
   - Or use Incognito/Private mode

2. **Visit your site:**
   ```
   https://dukani.site/lats/
   ```

3. **Open Developer Tools (F12):**
   - Go to Console tab
   - You should see **NO MIME type errors** ✅
   - Go to Network tab
   - Refresh page
   - Check that JavaScript files show:
     - Status: `200`
     - Type: `script`
     - Content-Type: `application/javascript`

4. **If you still see errors:**
   - Check that `.htaccess` exists in `/lats/` folder
   - Make sure your server supports `.htaccess` (Apache)
   - Contact your hosting provider if MIME types are still wrong

---

## 🔧 Troubleshooting

### **Problem: Still getting MIME type errors**

**Solution 1:** Check if `.htaccess` was uploaded
```bash
# Via SSH
ls -la /public_html/lats/.htaccess
```

**Solution 2:** Verify `.htaccess` content
- Download the `.htaccess` file from your server
- Compare it with `dist/.htaccess` on your Mac
- They should match exactly

**Solution 3:** Test if `.htaccess` is working
- Add this to the top of `.htaccess` temporarily:
```apache
# Test line
Header set X-Test-Header "htaccess-working"
```
- Upload it
- Check browser DevTools → Network → Click on any file → Response Headers
- If you see `X-Test-Header`, `.htaccess` is working

**Solution 4:** Contact your hosting provider
- Ask: "Can you enable `mod_mime` and `mod_headers` Apache modules?"
- These modules are required for `.htaccess` to set MIME types

### **Problem: Files not found (404 errors)**

- Check the exact path on your server
- Ensure files are in `/public_html/lats/` not `/public_html/dist/lats/`
- Make sure folder permissions are correct (755 for folders, 644 for files)

### **Problem: App shows white screen**

- Open DevTools Console
- Look for specific error messages
- Most likely: JavaScript files not loading due to MIME type errors

---

## 📊 Server Structure After Deployment

Your server should look like this:

```
/public_html/                    ← Your web root
└── lats/                        ← Your app folder
    ├── .htaccess                ← MIME type configuration
    ├── index.html               ← Main HTML file
    ├── assets/                  ← All JS and CSS files
    │   ├── index-222cfb29.js
    │   ├── vendor-a2ff445a.js
    │   ├── index-d3868143.css
    │   └── ... (189 JS files, 2 CSS files)
    ├── api/                     ← PHP API files
    │   ├── config.php
    │   └── ...
    ├── icons/                   ← Icon assets
    ├── logos/                   ← Logo files
    ├── favicon.svg
    └── ... (other files)
```

---

## ⚡ Quick Deploy Script (if you have SSH access)

Save this as `deploy.sh` and run it for quick deployment:

```bash
#!/bin/bash
# Quick deployment script

SERVER_USER="your_username"
SERVER_HOST="your-server.com"
SERVER_PATH="/public_html/lats"

echo "🚀 Building production app..."
npm run build:prod

echo "📦 Uploading to server..."
scp -r dist/* "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

echo "✅ Deployment complete!"
echo "🌐 Visit: https://dukani.site/lats/"
```

---

## 📞 Need Help?

If you're still having issues:

1. **Check your hosting type:**
   - cPanel? Use File Manager method
   - VPS/Dedicated? Use SSH method
   - Shared hosting? Use FTP method

2. **Verify server support:**
   - Apache server with `.htaccess` support
   - `mod_mime` and `mod_headers` modules enabled

3. **Contact hosting support:**
   - Ask them to enable `.htaccess` overrides
   - Request Apache modules: `mod_mime` and `mod_headers`

---

**Last Updated:** November 8, 2025  
**Build Version:** production with `/lats/` base path  
**Status:** ✅ Ready to deploy

