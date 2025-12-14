#!/bin/bash

# 🚀 MIME Type Error Fix - Deployment Script
# This script rebuilds and deploys your app with the MIME type fix

set -e  # Exit on error

echo "🔧 Starting deployment with MIME type fix..."
echo ""

# Change to project directory
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"

# Step 1: Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist dist-deploy
echo "✅ Cleaned"
echo ""

# Step 2: Build for production
echo "📦 Building for production..."
npm run build:prod
echo "✅ Build complete"
echo ""

# Step 3: Verify _redirects file
echo "🔍 Verifying _redirects file..."
if [ -f "dist/_redirects" ]; then
    echo "✅ _redirects file found in dist/"
    echo "Contents:"
    cat dist/_redirects
elif [ -f "dist-deploy/lats/_redirects" ]; then
    echo "✅ _redirects file found in dist-deploy/lats/"
    echo "Contents:"
    cat dist-deploy/lats/_redirects
else
    echo "⚠️  Warning: _redirects file not found!"
    echo "Please check your build configuration."
fi
echo ""

# Step 4: Show build structure
echo "📁 Build structure:"
if [ -d "dist-deploy" ]; then
    ls -la dist-deploy/lats/ | head -20
else
    ls -la dist/ | head -20
fi
echo ""

# Step 5: Deploy options
echo "🚀 Ready to deploy!"
echo ""
echo "Choose deployment method:"
echo "  1. Deploy with Netlify CLI (recommended)"
echo "  2. Skip deployment (I'll deploy manually)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "📤 Deploying to Netlify..."
    netlify deploy --prod
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Clear your browser cache (Ctrl/Cmd + Shift + R)"
    echo "  2. Visit: https://dukani.site/lats/"
    echo "  3. Open DevTools (F12) → Console"
    echo "  4. Verify no MIME type errors"
    echo ""
elif [ "$choice" = "2" ]; then
    echo ""
    echo "✅ Build complete and ready for manual deployment"
    echo ""
    echo "📋 Manual deployment steps:"
    echo "  1. Commit changes: git add . && git commit -m 'Fix: MIME type errors'"
    echo "  2. Push to repository: git push"
    echo "  3. Wait for Netlify auto-deploy"
    echo "  4. Clear browser cache and test"
    echo ""
else
    echo "Invalid choice. Exiting."
    exit 1
fi

echo "🎉 Done!"

