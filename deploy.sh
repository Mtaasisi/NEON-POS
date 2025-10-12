#!/bin/bash

# 🚀 Deployment Script for POS System
# This script helps you deploy to production safely

set -e  # Exit on error

echo "🚀 POS System - Production Deployment"
echo "========================================"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found"
    echo "📝 Please create .env.production with your production database credentials"
    exit 1
fi

# Check if production DATABASE_URL is configured
if grep -q "YOUR_PASSWORD" .env.production; then
    echo "⚠️  Warning: .env.production still contains placeholder values"
    echo "📝 Please update .env.production with actual credentials"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Ask for confirmation
echo "⚠️  You are about to build for PRODUCTION"
echo "This will use your PRODUCTION DATABASE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building for production..."
npm run build:prod

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📁 Your production build is ready in the 'dist/' folder"
    echo ""
    echo "Next steps:"
    echo "  1. Upload the 'dist/' folder to your hosting service"
    echo "  2. Configure environment variables on your hosting platform"
    echo "  3. Test your production deployment"
    echo ""
    echo "Hosting options:"
    echo "  - Vercel: vercel --prod"
    echo "  - Netlify: netlify deploy --prod"
    echo "  - Manual: Upload dist/ folder to your server"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

