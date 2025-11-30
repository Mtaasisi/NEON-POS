#!/bin/bash

# Quick Install Script for POS Mobile App
# This installs the APK directly to a connected Android device

echo "📱 POS Mobile App Installer"
echo "===================================="
echo ""

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

# Check if APK exists
if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at: $APK_PATH"
    echo ""
    echo "Please build the APK first:"
    echo "   ./build-apk.sh"
    exit 1
fi

echo "✅ APK found: $APK_PATH"
echo "   Size: $(ls -lh "$APK_PATH" | awk '{print $5}')"
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found"
    echo ""
    echo "Please install Android SDK Platform Tools:"
    echo "   brew install android-platform-tools"
    echo ""
    echo "Or download from:"
    echo "   https://developer.android.com/tools/releases/platform-tools"
    exit 1
fi

echo "🔍 Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo ""
    echo "❌ No Android devices connected"
    echo ""
    echo "📋 Connection Steps:"
    echo "   1. Connect phone via USB cable"
    echo "   2. On phone: Enable Developer Options"
    echo "      (Settings → About → Tap 'Build Number' 7 times)"
    echo "   3. Enable USB Debugging"
    echo "      (Settings → Developer Options → USB Debugging)"
    echo "   4. Unlock phone and approve USB debugging prompt"
    echo "   5. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Found $DEVICES device(s)"
echo ""

# List connected devices
echo "📱 Connected devices:"
adb devices -l
echo ""

# Uninstall old version if exists
echo "🗑️  Removing old version (if exists)..."
adb uninstall com.lats.pos 2>/dev/null || echo "   No previous version found"
echo ""

# Install new version
echo "📲 Installing POS Mobile App..."
if adb install "$APK_PATH"; then
    echo ""
    echo "===================================="
    echo "✅ Installation Successful!"
    echo "===================================="
    echo ""
    echo "📱 App installed: LATS-POS"
    echo "🎨 Look for the purple POS icon on your phone"
    echo ""
    echo "🚀 Launching app..."
    sleep 1
    adb shell am start -n com.lats.pos/.MainActivity
    echo ""
    echo "✅ App launched! Check your phone."
else
    echo ""
    echo "❌ Installation failed!"
    echo ""
    echo "Possible solutions:"
    echo "   1. Enable 'Install via USB' on phone"
    echo "   2. Check phone is unlocked"
    echo "   3. Try manual installation (see HOW_TO_INSTALL_APK.md)"
    echo ""
    exit 1
fi

