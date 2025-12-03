#!/bin/bash

# Automatic Webhook Fix & Upload
# This script uploads webhook.php to the correct location

echo "🚀 Automatic Webhook Fix & Upload"
echo "=================================="
echo ""

# Check if lftp is installed
if command -v lftp &> /dev/null; then
    echo "✅ lftp found - attempting automatic upload..."
    echo ""
    echo "⚠️  You'll need to enter your Hostinger FTP credentials"
    echo ""
    read -p "FTP Username (usually u followed by numbers): " FTP_USER
    read -sp "FTP Password: " FTP_PASS
    echo ""
    echo ""
    
    echo "📤 Uploading webhook.php to correct location..."
    lftp -u "$FTP_USER,$FTP_PASS" ftp.dukani.site << EOF
cd public_html/api
mkdir -p whatsapp
cd whatsapp
put public/api/whatsapp/webhook.php
chmod 644 webhook.php
bye
EOF
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Upload successful!"
        echo ""
        echo "🧪 Testing webhook..."
        sleep 2
        curl -s https://dukani.site/api/whatsapp/webhook.php | jq .
        echo ""
        echo "✅ Done! Your webhook is now live at:"
        echo "   https://dukani.site/api/whatsapp/webhook.php"
    else
        echo "❌ Upload failed. Please check your credentials."
    fi
else
    echo "⚠️  lftp not installed. Installing now..."
    
    # Try to install lftp
    if command -v brew &> /dev/null; then
        echo "📦 Installing lftp via Homebrew..."
        brew install lftp
        
        # Retry after install
        echo ""
        echo "✅ lftp installed! Running upload..."
        exec "$0"
    else
        echo "❌ Homebrew not found."
        echo ""
        echo "📋 Manual steps:"
        echo "   1. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo "   2. Run: brew install lftp"
        echo "   3. Run this script again"
    fi
fi

