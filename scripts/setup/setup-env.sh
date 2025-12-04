#!/bin/bash

# ============================================
# Quick Setup Script - Create .env File
# ============================================

echo "🔧 Setting up your .env file..."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    echo ""
    echo "Do you want to:"
    echo "  1) Keep existing .env (cancel)"
    echo "  2) Backup existing and create new .env"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    if [ "$choice" = "2" ]; then
        # Backup existing .env
        BACKUP_NAME=".env.backup.$(date +%Y%m%d_%H%M%S)"
        mv .env "$BACKUP_NAME"
        echo "✅ Backed up existing .env to $BACKUP_NAME"
    else
        echo "❌ Keeping existing .env file. Exiting."
        exit 0
    fi
fi

# Create new .env file
cat > .env << 'EOF'
# LATS CHANCE Environment Configuration

# Development Configuration
NODE_ENV=development
VITE_APP_ENV=development

# ✅ NEON DATABASE CONNECTION
# This is your Neon PostgreSQL database connection string
# Required for the app to connect to your database
VITE_DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Production Configuration (uncomment for production)
# NODE_ENV=production
# VITE_APP_ENV=production
# VITE_DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Optional: Custom API endpoints
# VITE_API_BASE_URL=https://your-api-domain.com
# VITE_WHATSAPP_API_URL=https://your-whatsapp-api.com

# Optional: Feature flags
# VITE_ENABLE_DEBUG=true
# VITE_ENABLE_ANALYTICS=false
EOF

echo ""
echo "✅ Created .env file with development database URL"
echo ""
echo "📋 Database URL configured:"
grep "VITE_DATABASE_URL" .env | head -1
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. ⚡ RESTART your dev server (REQUIRED!):"
echo "   → Press Ctrl+C in terminal"
echo "   → Run: npm run dev"
echo ""
echo "2. 🔄 REFRESH your browser:"
echo "   → Press Ctrl+Shift+R (Windows)"
echo "   → Press Cmd+Shift+R (Mac)"
echo ""
echo "3. ✅ VERIFY in browser console (F12):"
echo "   → Should see: 'Neon client initializing'"
echo "   → Should see: 'Neon SQL client created successfully'"
echo "   → NO 400 errors!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Setup complete! Now restart your dev server!"
echo ""

