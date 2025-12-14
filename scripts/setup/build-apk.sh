#!/bin/bash

# Quick APK Build Script
# This builds a debug APK from command line

set -e

echo "🏗️  Building Android APK..."
echo "================================"
echo ""

cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE/android"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build debug APK
echo ""
echo "📦 Building debug APK..."
./gradlew assembleDebug

# Check if build was successful
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo ""
    echo "================================"
    echo "✅ APK Built Successfully!"
    echo "================================"
    echo ""
    echo "📍 Location:"
    echo "   android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📊 APK Size:"
    ls -lh app/build/outputs/apk/debug/app-debug.apk | awk '{print "   " $5}'
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Copy APK to your phone"
    echo "   2. Enable 'Install from Unknown Sources' in phone settings"
    echo "   3. Install the APK"
    echo ""
    
    # Open the folder
    open app/build/outputs/apk/debug/
else
    echo ""
    echo "❌ Build failed!"
    echo "Check the error messages above."
    exit 1
fi

