#!/bin/bash

echo "🔄 Switching to Production Environment..."

# Check if .env exists, if not copy from .env copy
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from .env copy..."
    cp ".env copy" ".env"
fi

# Update environment variables for production
echo "⚙️  Setting production environment variables..."

# Use sed to update the .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed
    sed -i '' 's/NODE_ENV=development/NODE_ENV=production/' .env
    sed -i '' 's/VITE_APP_ENV=development/VITE_APP_ENV=production/' .env
else
    # Linux sed
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
    sed -i 's/VITE_APP_ENV=development/VITE_APP_ENV=production/' .env
fi

echo "✅ Environment switched to PRODUCTION"
echo "📝 Current .env configuration:"
echo "   NODE_ENV=production"
echo "   VITE_APP_ENV=production"
echo ""
echo "🚀 Ready for production build!"
echo "   Run: npm run build:prod"
