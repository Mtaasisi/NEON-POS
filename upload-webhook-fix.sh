#!/bin/bash
# Upload fixed webhook to Hostinger

echo "🚀 Uploading fixed webhook.php to dukani.site..."

# You'll need to replace these with your actual Hostinger FTP/SSH credentials
# Option 1: Using FTP (if you have lftp installed)
# lftp -u username,password ftp://ftp.dukani.site -e "cd public_html/api/whatsapp; put public/api/whatsapp/webhook.php; bye"

# Option 2: Using SCP (if you have SSH access)
# scp public/api/whatsapp/webhook.php user@dukani.site:/path/to/public_html/api/whatsapp/

# Option 3: Manual upload via cPanel File Manager
echo "📋 Please upload the file manually:"
echo "   1. Go to https://dukani.site:2083 (cPanel)"
echo "   2. Open File Manager"
echo "   3. Navigate to: public_html/api/whatsapp/"
echo "   4. Upload: public/api/whatsapp/webhook.php"
echo ""
echo "File location: $(pwd)/public/api/whatsapp/webhook.php"

# Open the file in Finder (macOS)
open -R "$(pwd)/public/api/whatsapp/webhook.php"

echo "✅ Done! Upload the highlighted file to Hostinger"

