#!/bin/bash

# 🔴 Switch to Production Branch

echo "⚠️  Switching to PRODUCTION branch..."
read -p "Are you sure you want to switch to production? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    cp .env.production .env 2>/dev/null || cat > .env << 'EOF'
# PRODUCTION BRANCH Configuration
DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
VITE_APP_ENV=production
EOF

    echo "✅ Successfully switched to PRODUCTION branch!"
    echo ""
    echo "📊 Current configuration:"
    echo "   Branch: Production"
    echo "   Endpoint: ep-damp-fire-adtxvumr"
    echo "   Environment: production"
    echo ""
    echo "🚀 Build and start your app with:"
    echo "   npm run build && npm start"
else
    echo "❌ Cancelled. Staying on current branch."
fi

