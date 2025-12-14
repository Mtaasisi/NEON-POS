#!/usr/bin/env node

/**
 * Setup script for manual hosting deployment
 * This prepares the dist folder with proper structure and configuration files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up files for manual hosting...\n');

const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

// Create .htaccess for Apache servers (most common for manual hosting)
const htaccess = `# Enable rewrite engine
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Set base for subdirectory deployment
  RewriteBase /lats/
  
  # Force correct MIME types for JavaScript files
  <FilesMatch "\\.js$">
    ForceType application/javascript
    Header set Content-Type "application/javascript; charset=utf-8"
  </FilesMatch>
  
  <FilesMatch "\\.mjs$">
    ForceType application/javascript
    Header set Content-Type "application/javascript; charset=utf-8"
  </FilesMatch>
  
  # Force correct MIME type for CSS files
  <FilesMatch "\\.css$">
    ForceType text/css
    Header set Content-Type "text/css; charset=utf-8"
  </FilesMatch>
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # Rewrite everything else to index.html to allow HTML5 state links
  RewriteRule ^ index.html [L]
</IfModule>

# Enable CORS if needed
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization, apikey, X-Client-Info"
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType application/x-javascript "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>`;

// Create web.config for IIS servers
const webConfig = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Handle History Mode and custom 404/500" stopProcessing="true">
          <match url="(.*)" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/lats/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <mimeMap fileExtension=".mjs" mimeType="application/javascript" />
      <mimeMap fileExtension=".css" mimeType="text/css" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="Access-Control-Allow-Origin" value="*" />
        <add name="Access-Control-Allow-Methods" value="GET, POST, PUT, DELETE, OPTIONS" />
        <add name="Access-Control-Allow-Headers" value="Content-Type, Authorization, apikey, X-Client-Info" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>`;

// Create nginx.conf snippet
const nginxConfig = `# Add this to your nginx configuration

location /lats/ {
    alias /path/to/your/dist/;
    
    # Try to serve file directly, fallback to index.html
    try_files $uri $uri/ /lats/index.html;
    
    # Set correct MIME types
    location ~* \\.js$ {
        add_header Content-Type "application/javascript; charset=utf-8";
    }
    
    location ~* \\.mjs$ {
        add_header Content-Type "application/javascript; charset=utf-8";
    }
    
    location ~* \\.css$ {
        add_header Content-Type "text/css; charset=utf-8";
    }
    
    # Enable CORS
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, apikey, X-Client-Info";
    
    # Cache static assets
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;

// Create manual deployment folder
const manualDeployPath = path.join(__dirname, 'dist-manual-hosting');
if (!fs.existsSync(manualDeployPath)) {
    fs.mkdirSync(manualDeployPath, { recursive: true });
}

// Create lats subdirectory
const latsPath = path.join(manualDeployPath, 'lats');
if (!fs.existsSync(latsPath)) {
    fs.mkdirSync(latsPath, { recursive: true });
}

console.log('✅ Created dist-manual-hosting/lats/ folder\n');

// Copy all files from dist to dist-manual-hosting/lats/
console.log('📦 Copying build files...');
const copyRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(
                path.join(src, childItemName),
                path.join(dest, childItemName)
            );
        });
    } else {
        fs.copyFileSync(src, dest);
    }
};

copyRecursiveSync(distPath, latsPath);
console.log('✅ Copied dist/ → dist-manual-hosting/lats/\n');

// Write .htaccess to lats folder
fs.writeFileSync(path.join(latsPath, '.htaccess'), htaccess);
console.log('✅ Created .htaccess (for Apache servers)\n');

// Write web.config to lats folder
fs.writeFileSync(path.join(latsPath, 'web.config'), webConfig);
console.log('✅ Created web.config (for IIS servers)\n');

// Write nginx config as reference
fs.writeFileSync(path.join(manualDeployPath, 'nginx.conf.example'), nginxConfig);
console.log('✅ Created nginx.conf.example (for Nginx servers)\n');

// Create README for manual deployment
const manualDeployReadme = `# 📦 Manual Hosting Deployment Files

This folder contains everything you need to deploy manually to any hosting provider.

## 📂 Folder Structure

\`\`\`
dist-manual-hosting/
├── lats/                    # Upload this entire folder to your server
│   ├── assets/             # JavaScript, CSS, and other assets
│   ├── index.html          # Main HTML file
│   ├── .htaccess           # Apache server configuration
│   └── web.config          # IIS server configuration
├── nginx.conf.example      # Nginx configuration (if using Nginx)
└── README.md              # This file
\`\`\`

## 🚀 Deployment Instructions

### For Apache Servers (Most Common - cPanel, Hostinger, etc.):

1. **Upload the \`lats\` folder** to your web root:
   - If deploying to root: Upload contents of \`lats/\` to \`public_html/\`
   - If deploying to subdirectory: Upload \`lats/\` folder to \`public_html/lats/\`

2. **Ensure .htaccess is uploaded**:
   - The \`.htaccess\` file is already inside the \`lats\` folder
   - Make sure hidden files are visible in your FTP client
   - The .htaccess file handles MIME types and routing

3. **Your site will be accessible at**:
   - Root deployment: \`https://yourdomain.com/\`
   - Subdirectory: \`https://yourdomain.com/lats/\`

### For Nginx Servers:

1. **Upload the \`lats\` folder** to your server (e.g., \`/var/www/html/lats/\`)

2. **Update your Nginx configuration**:
   - Open the \`nginx.conf.example\` file
   - Copy the configuration
   - Add it to your Nginx site config (usually in \`/etc/nginx/sites-available/\`)
   - Update \`/path/to/your/dist/\` to match your actual path
   - Reload Nginx: \`sudo nginx -s reload\`

### For IIS Servers (Windows):

1. **Upload the \`lats\` folder** to your IIS web root

2. **The web.config file** is already included and will:
   - Set correct MIME types
   - Handle SPA routing
   - Enable CORS

### For Hostinger / cPanel:

1. **Using File Manager**:
   - Log in to your hosting control panel
   - Go to File Manager
   - Navigate to \`public_html\`
   - Create a folder named \`lats\` (if deploying to subdirectory)
   - Upload all contents from \`dist-manual-hosting/lats/\`
   - Make sure \`.htaccess\` is uploaded (enable "Show Hidden Files")

2. **Using FTP**:
   - Connect via FTP/SFTP (FileZilla, etc.)
   - Navigate to \`public_html\`
   - Upload the \`lats\` folder
   - Ensure \`.htaccess\` is transferred

## 🔧 Important Notes

### MIME Type Issues:
If you still see MIME type errors after deployment:

1. **Verify .htaccess is working**:
   - Check if mod_rewrite is enabled on your server
   - Contact your hosting provider if needed

2. **For cPanel/Hostinger**:
   - Add this to cPanel → Select PHP Version → Options:
     \`\`\`
     AddType application/javascript .js .mjs
     AddType text/css .css
     \`\`\`

3. **Check file permissions**:
   - .htaccess should be 644
   - Directories should be 755
   - Files should be 644

### Base Path Configuration:

**Current setup is for /lats/ subdirectory**

If deploying to root instead:
1. Build with: \`VITE_BASE_PATH=/ npm run build:manual\`
2. Update .htaccess RewriteBase to \`/\`

If deploying to different subdirectory (e.g., /pos/):
1. Build with: \`VITE_BASE_PATH=/pos/ npm run build:manual\`
2. Upload to \`public_html/pos/\`

## ✅ Quick Deployment Checklist

- [ ] Run \`npm run build:manual\`
- [ ] Upload \`dist-manual-hosting/lats/\` to your server
- [ ] Verify \`.htaccess\` is present
- [ ] Test the site: \`https://yourdomain.com/lats/\`
- [ ] Check browser console for errors
- [ ] Clear browser cache (Ctrl+Shift+R)

## 🆘 Troubleshooting

### Still seeing MIME errors?

1. **Check if .htaccess is being read**:
   - Create a test file: \`test.html\` with a PHP syntax error
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
   - Check that assets folder exists: \`lats/assets/\`
   - Verify index.html references: \`/lats/assets/...\`

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
`;

fs.writeFileSync(path.join(manualDeployPath, 'README.md'), manualDeployReadme);
console.log('✅ Created README.md with deployment instructions\n');

console.log('🎉 Manual hosting setup complete!\n');
console.log('📂 Your deployment files are in: dist-manual-hosting/lats/\n');
console.log('📖 Read dist-manual-hosting/README.md for upload instructions\n');
console.log('🌐 Upload the "lats" folder to your web server\'s public_html directory\n');

