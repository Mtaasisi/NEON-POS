#!/bin/bash

# 🟢 Switch to Development Branch

echo "🔄 Switching to DEVELOPMENT branch..."
cp .env.development .env 2>/dev/null || cat > .env << 'EOF'
# DEVELOPMENT BRANCH Configuration
DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=development
VITE_APP_ENV=development
EOF

echo "✅ Successfully switched to DEVELOPMENT branch!"
echo ""
echo "📊 Current configuration:"
echo "   Branch: Development"
echo "   Endpoint: ep-damp-fire-adtxvumr"
echo "   Environment: development"
echo ""
echo "🚀 Start your app with:"
echo "   npm run dev"

