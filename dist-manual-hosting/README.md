# 📦 Manual Hosting Deployment Files

This folder contains everything you need to deploy manually to any hosting provider.

## 📂 Folder Structure

```
dist-manual-hosting/
├── lats/                    # Upload this entire folder to your server
│   ├── assets/             # JavaScript, CSS, and other assets
│   ├── index.html          # Main HTML file
│   ├── .htaccess           # Apache server configuration
│   └── web.config          # IIS server configuration
├── nginx.conf.example      # Nginx configuration (if using Nginx)
└── README.md              # This file
```

## 🚀 Deployment Instructions

### For Apache Servers (Most Common - cPanel, Hostinger, etc.):

1. **Upload the `lats` folder** to your web root:
   - If deploying to root: Upload contents of `lats/` to `public_html/`
   - If deploying to subdirectory: Upload `lats/` folder to `public_html/lats/`

2. **Ensure .htaccess is uploaded**:
   - The `.htaccess` file is already inside the `lats` folder
   - Make sure hidden files are visible in your FTP client
   - The .htaccess file handles MIME types and routing

3. **Your site will be accessible at**:
   - Root deployment: `https://yourdomain.com/`
   - Subdirectory: `https://yourdomain.com/lats/`

### For Nginx Servers:

1. **Upload the `lats` folder** to your server (e.g., `/var/www/html/lats/`)

2. **Update your Nginx configuration**:
   - Open the `nginx.conf.example` file
   - Copy the configuration
   - Add it to your Nginx site config (usually in `/etc/nginx/sites-available/`)
   - Update `/path/to/your/dist/` to match your actual path
   - Reload Nginx: `sudo nginx -s reload`

### For IIS Servers (Windows):

1. **Upload the `lats` folder** to your IIS web root

2. **The web.config file** is already included and will:
   - Set correct MIME types
   - Handle SPA routing
   - Enable CORS

### For Hostinger / cPanel:

1. **Using File Manager**:
   - Log in to your hosting control panel
   - Go to File Manager
   - Navigate to `public_html`
   - Create a folder named `lats` (if deploying to subdirectory)
   - Upload all contents from `dist-manual-hosting/lats/`
   - Make sure `.htaccess` is uploaded (enable "Show Hidden Files")

2. **Using FTP**:
   - Connect via FTP/SFTP (FileZilla, etc.)
   - Navigate to `public_html`
   - Upload the `lats` folder
   - Ensure `.htaccess` is transferred

## 🔧 Important Notes

### MIME Type Issues:
If you still see MIME type errors after deployment:

1. **Verify .htaccess is working**:
   - Check if mod_rewrite is enabled on your server
   - Contact your hosting provider if needed

2. **For cPanel/Hostinger**:
   - Add this to cPanel → Select PHP Version → Options:
     ```
     AddType application/javascript .js .mjs
     AddType text/css .css
     ```

3. **Check file permissions**:
   - .htaccess should be 644
   - Directories should be 755
   - Files should be 644

### Base Path Configuration:

**Current setup is for /lats/ subdirectory**

If deploying to root instead:
1. Build with: `VITE_BASE_PATH=/ npm run build:manual`
2. Update .htaccess RewriteBase to `/`

If deploying to different subdirectory (e.g., /pos/):
1. Build with: `VITE_BASE_PATH=/pos/ npm run build:manual`
2. Upload to `public_html/pos/`

## ✅ Quick Deployment Checklist

- [ ] Run `npm run build:manual`
- [ ] Upload `dist-manual-hosting/lats/` to your server
- [ ] Verify `.htaccess` is present
- [ ] Test the site: `https://yourdomain.com/lats/`
- [ ] Check browser console for errors
- [ ] Clear browser cache (Ctrl+Shift+R)

## 🆘 Troubleshooting

### Still seeing MIME errors?

1. **Check if .htaccess is being read**:
   - Create a test file: `test.html` with a PHP syntax error
   - If you see a 500 error, .htaccess is working
   - If you see the error displayed, .htaccess is NOT working

2. **Verify mod_rewrite is enabled**:
   - Contact your hosting provider
   - Ask them to enable mod_rewrite and mod_headers

3. **Check error logs**:
   - Most hosting panels have error logs
   - Look for .htaccess related errors

### Assets not loading (404 errors)?

1. **Verify file paths**:
   - Check that assets folder exists: `lats/assets/`
   - Verify index.html references: `/lats/assets/...`

2. **Check upload**:
   - Ensure all files were uploaded
   - Check for upload errors in FTP client

### Blank page?

1. **Check browser console** (F12)
2. **Verify environment variables** are set on server
3. **Check database connection** from server

## 📞 Support

If you need help:
1. Check browser console (F12) for errors
2. Check hosting error logs
3. Verify all files were uploaded
4. Contact your hosting provider about .htaccess support
