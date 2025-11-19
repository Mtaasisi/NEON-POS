#!/bin/bash

# Android APK Setup Script for POS Mobile App
# This script automates the initial setup for building an Android APK

set -e

echo "🚀 Setting up Android APK build for POS Mobile App"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "📦 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version) found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version) found${NC}"
echo ""

# Check Java
echo "☕ Checking Java installation..."
if ! command -v java &> /dev/null; then
    echo -e "${YELLOW}⚠️  Java JDK is not installed${NC}"
    echo "Installing Java JDK 17..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install openjdk@17
            echo -e "${GREEN}✅ Java JDK 17 installed${NC}"
        else
            echo -e "${RED}❌ Homebrew not found. Please install Java manually from:${NC}"
            echo "https://adoptium.net/"
            exit 1
        fi
    else
        echo -e "${YELLOW}Please install Java JDK 11 or 17 from:${NC}"
        echo "https://adoptium.net/"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Java $(java -version 2>&1 | head -n 1) found${NC}"
fi
echo ""

# Check Android Studio
echo "🤖 Checking Android Studio..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -d "/Applications/Android Studio.app" ]; then
        echo -e "${GREEN}✅ Android Studio found${NC}"
    else
        echo -e "${YELLOW}⚠️  Android Studio not found${NC}"
        echo "Please download and install from: https://developer.android.com/studio"
        echo "After installation, run this script again."
        exit 1
    fi
fi
echo ""

# Install Capacitor
echo "⚡ Installing Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android
echo -e "${GREEN}✅ Capacitor installed${NC}"
echo ""

# Get app details from user
echo "📱 App Configuration"
echo "==================="
read -p "Enter App Name (default: POS Mobile): " APP_NAME
APP_NAME=${APP_NAME:-"POS Mobile"}

read -p "Enter App ID in reverse domain format (default: com.company.posmobile): " APP_ID
APP_ID=${APP_ID:-"com.company.posmobile"}

# Determine web directory
if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ]; then
    WEB_DIR="dist"
    echo -e "${GREEN}✅ Detected Vite project - using 'dist' directory${NC}"
elif [ -f "package.json" ] && grep -q "react-scripts" package.json; then
    WEB_DIR="build"
    echo -e "${GREEN}✅ Detected Create React App - using 'build' directory${NC}"
else
    read -p "Enter web build directory (dist/build): " WEB_DIR
    WEB_DIR=${WEB_DIR:-"dist"}
fi
echo ""

# Initialize Capacitor
echo "🔧 Initializing Capacitor..."
npx cap init "$APP_NAME" "$APP_ID" --web-dir="$WEB_DIR"
echo -e "${GREEN}✅ Capacitor initialized${NC}"
echo ""

# Update vite.config if it exists
if [ -f "vite.config.ts" ]; then
    echo "📝 Updating vite.config.ts for Capacitor..."
    if ! grep -q "base: '\.\/'" vite.config.ts; then
        echo "⚠️  Please manually add this to your vite.config.ts:"
        echo ""
        echo "export default defineConfig({"
        echo "  base: './', // Add this line"
        echo "  // ... rest of config"
        echo "})"
        echo ""
    fi
fi

# Build the app
echo "🏗️  Building React app..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo "Please fix build errors and run this script again."
    exit 1
fi
echo ""

# Add Android platform
echo "🤖 Adding Android platform..."
npx cap add android
echo -e "${GREEN}✅ Android platform added${NC}"
echo ""

# Sync web assets
echo "🔄 Syncing web assets to Android..."
npx cap sync android
echo -e "${GREEN}✅ Assets synced${NC}"
echo ""

# Create .gitignore entries
echo "📝 Updating .gitignore..."
if [ -f ".gitignore" ]; then
    if ! grep -q "android/" .gitignore; then
        echo "" >> .gitignore
        echo "# Android build files" >> .gitignore
        echo "android/app/build/" >> .gitignore
        echo "android/.gradle/" >> .gitignore
        echo "android/build/" >> .gitignore
        echo "android/key.properties" >> .gitignore
        echo "*.jks" >> .gitignore
    fi
fi
echo ""

# Success message
echo ""
echo "============================================"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Open Android Studio:"
echo "   npx cap open android"
echo ""
echo "2. Build Debug APK in Android Studio:"
echo "   Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo ""
echo "3. Or build from command line:"
echo "   cd android && ./gradlew assembleDebug"
echo ""
echo "4. Find your APK at:"
echo "   android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "📖 For detailed instructions, see:"
echo "   EXPORT_TO_APK_GUIDE.md"
echo ""
echo "============================================"
echo ""

# Optional: Open Android Studio
read -p "Do you want to open Android Studio now? (y/n): " OPEN_STUDIO
if [[ "$OPEN_STUDIO" == "y" || "$OPEN_STUDIO" == "Y" ]]; then
    npx cap open android
fi

