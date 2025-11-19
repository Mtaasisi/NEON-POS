#!/bin/bash

echo "🔄 Switching to Development Environment..."

# Check if .env exists, if not copy from .env copy
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from .env copy..."
    cp ".env copy" ".env"
fi

# Update environment variables for development
echo "⚙️  Setting development environment variables..."

# Use sed to update the .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed
    sed -i '' 's/NODE_ENV=production/NODE_ENV=development/' .env
    sed -i '' 's/VITE_APP_ENV=production/VITE_APP_ENV=development/' .env
else
    # Linux sed
    sed -i 's/NODE_ENV=production/NODE_ENV=development/' .env
    sed -i 's/VITE_APP_ENV=production/VITE_APP_ENV=development/' .env
fi

echo "✅ Environment switched to DEVELOPMENT"
echo "📝 Current .env configuration:"
echo "   NODE_ENV=development"
echo "   VITE_APP_ENV=development"
echo ""
echo "🚀 Ready for development!"
echo "   Run: npm run dev"
