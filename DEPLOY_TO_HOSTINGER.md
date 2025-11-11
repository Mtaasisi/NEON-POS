# 🚀 Deploy to Hostinger - Complete Guide

## ✅ Build Complete!

Your app has been built successfully with the correct `/lats/` base path.

**Build location:** `dist/` folder in your project

---

## 📤 Upload Options

### Option 1: Hostinger File Manager (Recommended for beginners)

1. **Login to Hostinger:**
   - Go to: https://hpanel.hostinger.com/
   - Navigate to: **Websites** → **dukani.site**

2. **Open File Manager:**
   - Click **File Manager** button
   - Navigate to `public_html/`

3. **Prepare the /lats/ directory:**
   - If `/lats/` folder doesn't exist, create it
   - If it exists, delete all old files inside it
   - Keep the folder structure: `public_html/lats/`

4. **Upload files:**
   - Enter the `/lats/` directory
   - Click **Upload Files**
   - Select **ALL files and folders** from your local `dist/` directory
   - Upload everything (including the `assets` folder, `index.html`, etc.)

5. **Verify upload:**
   - You should see these in `public_html/lats/`:
     ```
     /lats/
       ├── index.html
       ├── favicon.svg
       └── assets/
           ├── index-222cfb29.js
           ├── vendor-a2ff445a.js
           ├── routing-a2f0f6d2.js
           ├── supabase-7e851d02.js
           ├── ui-551a39a6.js
           ├── index-d3868143.css
           └── ... (other files)
     ```

---

### Option 2: Upload via FTP (Faster)

1. **Get FTP credentials from Hostinger:**
   - In hPanel, go to: **Files** → **FTP Accounts**
   - Note down:
     - FTP Host (usually: `ftp.dukani.site`)
     - FTP Username
     - FTP Password
     - Port (usually: `21`)

2. **Use an FTP client:**
   - **FileZilla** (free): https://filezilla-project.org/
   - **Cyberduck** (Mac): https://cyberduck.io/

3. **Connect via FTP:**
   - Host: `ftp.dukani.site`
   - Username: (from Hostinger)
   - Password: (from Hostinger)
   - Port: `21`

4. **Upload files:**
   - Navigate to `public_html/lats/` on the server
   - Delete all old files in `/lats/`
   - Upload all contents of your local `dist/` folder

---

### Option 3: Command Line (macOS/Linux)

If you have FTP credentials, you can use this command:

```bash
# Install lftp if you don't have it
brew install lftp  # macOS
# or
sudo apt install lftp  # Linux

# Upload files (replace with your credentials)
lftp -e "
  set ftp:ssl-allow no;
  open ftp://YOUR_USERNAME:YOUR_PASSWORD@ftp.dukani.site;
  cd public_html/lats;
  mirror -R --delete dist/ .;
  bye
"
```

---

## 🔍 After Upload - Verify Deployment

1. **Clear browser cache:**
   - Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)

2. **Visit your site:**
   - Go to: https://dukani.site/lats/

3. **Check browser console:**
   - Press `F12` to open DevTools
   - Go to **Console** tab
   - Should see **NO MIME type errors** ✅

4. **Check Network tab:**
   - Press `F12` → **Network** tab
   - Refresh the page
   - Look for these files:
     - `/lats/assets/index-222cfb29.js` → Status: `200` ✅
     - `/lats/assets/vendor-a2ff445a.js` → Status: `200` ✅
     - `/lats/assets/index-d3868143.css` → Status: `200` ✅
   - All should show `200 OK` status

---

## ⚙️ Hostinger Configuration (if needed)

If you still see MIME type errors after upload, add this to your `.htaccess` file:

### Create/Edit `.htaccess` in `public_html/lats/`:

```apache
# Set correct MIME types
<IfModule mod_mime.c>
  AddType application/javascript .js .mjs
  AddType text/css .css
  AddType application/json .json
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
</IfModule>

# Cache control for assets
<IfModule mod_headers.c>
  <FilesMatch "\.(js|mjs|css)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

# React Router support (SPA)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /lats/
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>
```

---

## 🎯 Quick Upload Checklist

- [ ] Build completed successfully (`npm run build:prod`)
- [ ] Logged into Hostinger hPanel
- [ ] Navigated to File Manager
- [ ] Located `public_html/lats/` directory
- [ ] Deleted old files in `/lats/`
- [ ] Uploaded ALL files from `dist/` folder
- [ ] Cleared browser cache
- [ ] Tested site: https://dukani.site/lats/
- [ ] Verified no MIME type errors in console
- [ ] Confirmed all assets load with 200 status

---

## 📁 Your Built Files Location

```
Local path:
/Users/mtaasisi/Downloads/POS-main NEON DATABASE/dist/

Should be uploaded to:
public_html/lats/ (on Hostinger)
```

---

## 🆘 Troubleshooting

### Still seeing MIME errors?

1. **Check file locations:**
   - Files should be in `public_html/lats/`, NOT `public_html/dist/lats/`

2. **Check .htaccess:**
   - Create the `.htaccess` file shown above
   - Make sure it's in the `/lats/` directory

3. **Clear everything:**
   - Clear browser cache completely
   - Try incognito/private window
   - Try different browser

4. **Check Hostinger settings:**
   - In hPanel, check if PHP or other settings are interfering
   - Make sure "Static website" mode is enabled (if available)

---

## 💡 Alternative: Deploy to Root Domain

If you want to deploy to `https://dukani.site/` (root) instead of `/lats/`:

1. **Rebuild with root path:**
   ```bash
   VITE_BASE_PATH=/ npm run build:prod
   ```

2. **Upload to:**
   ```
   public_html/
   ```

---

**Your build is ready! Just upload the `dist/` folder contents to Hostinger and you're done!** 🚀

