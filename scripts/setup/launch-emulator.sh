#!/bin/bash

# Launch Android Emulator and Run POS App
# This script helps you test your app in an emulator

echo "📱 Android Emulator Launcher"
echo "================================"
echo ""

# Check if Android SDK is set up
if [ -z "$ANDROID_HOME" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
fi

echo "🔍 Looking for Android emulators..."
echo ""

# List available emulators
EMULATORS=$($ANDROID_HOME/emulator/emulator -list-avds 2>/dev/null)

if [ -z "$EMULATORS" ]; then
    echo "❌ No emulators found!"
    echo ""
    echo "📋 Creating emulator in Android Studio:"
    echo ""
    echo "   1. Look for Device Manager icon on RIGHT SIDE of Android Studio"
    echo "      (phone icon 📱)"
    echo ""
    echo "   2. Click 'Create Device' button"
    echo ""
    echo "   3. Select 'Pixel 6' → Next"
    echo ""
    echo "   4. Select 'Tiramisu (API 33)' or 'UpsideDownCake (API 34)'"
    echo "      - Click 'Download' if needed"
    echo "      - Click 'Next' after download"
    echo ""
    echo "   5. Name it 'Pixel_6_API_33'"
    echo "      Click 'Finish'"
    echo ""
    echo "   6. Click ▶️ play button next to your new emulator"
    echo ""
    echo "Then run this script again!"
    echo ""
    
    # Try opening Device Manager in Android Studio
    echo "🚀 Opening Device Manager in Android Studio..."
    osascript -e 'tell application "Android Studio" to activate' 2>/dev/null
    
    exit 1
fi

echo "✅ Found emulator(s):"
echo "$EMULATORS" | while read -r emu; do
    echo "   📱 $emu"
done
echo ""

# Get first emulator name
FIRST_EMU=$(echo "$EMULATORS" | head -n 1)

# Check if an emulator is already running
RUNNING=$(adb devices | grep "emulator" | wc -l)

if [ "$RUNNING" -gt 0 ]; then
    echo "✅ Emulator already running!"
else
    echo "🚀 Starting emulator: $FIRST_EMU"
    echo "   This may take 30-60 seconds..."
    echo ""
    
    # Start emulator in background
    $ANDROID_HOME/emulator/emulator -avd "$FIRST_EMU" > /dev/null 2>&1 &
    
    # Wait for emulator to boot
    echo "⏳ Waiting for emulator to boot..."
    adb wait-for-device
    
    # Wait for boot to complete
    while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
        echo "   Still booting..."
        sleep 2
    done
    
    echo "✅ Emulator ready!"
fi

echo ""
echo "📲 Installing and launching POS app..."
echo ""

# Install APK
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    adb install -r "$APK_PATH"
    
    echo ""
    echo "🚀 Launching app..."
    adb shell am start -n com.lats.pos/.MainActivity
    
    echo ""
    echo "================================"
    echo "✅ App Launched Successfully!"
    echo "================================"
    echo ""
    echo "📱 Check your emulator - POS app should be running!"
    echo ""
else
    echo "❌ APK not found. Build it first:"
    echo "   ./build-apk.sh"
fi

