# Quick Start: Export to Android APK

## 🚀 Fastest Way to Get Started

### Option 1: Use Setup Script (Recommended)
```bash
# Run the automated setup script
./setup-android.sh
```

This will:
- Check all requirements
- Install Capacitor
- Configure your app
- Build the React app
- Add Android platform
- Open Android Studio

---

### Option 2: Manual Setup (5 Steps)

#### Step 1: Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

#### Step 2: Initialize Capacitor
```bash
npx cap init
```
- App name: `POS Mobile`
- App ID: `com.yourcompany.posmobile`
- Web directory: `dist` (or `build` for CRA)

#### Step 3: Build Your App
```bash
npm run build
```

#### Step 4: Add Android
```bash
npx cap add android
npx cap sync android
```

#### Step 5: Open Android Studio
```bash
npx cap open android
```

Then in Android Studio:
- **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- Wait for build
- Click "locate" to find your APK!

---

## 📱 APK Locations

### Debug APK (for testing):
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (for distribution):
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔄 Workflow for Updates

Every time you make changes:

```bash
# 1. Build your React app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build APK
npx cap open android
# Then: Build > Build APK
```

---

## ⚡ Command Line Build

```bash
# Build debug APK
cd android
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build AAB for Play Store
./gradlew bundleRelease
```

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- ✅ Node.js 14+ installed
- ✅ Java JDK 11 or 17 installed
- ✅ Android Studio installed
- ✅ Android SDK installed (via Android Studio)

### Install Prerequisites (macOS):
```bash
# Install Java
brew install openjdk@17

# Download Android Studio from:
# https://developer.android.com/studio
```

---

## 🔐 Creating Release APK (Signed)

### 1. Generate Keystore (first time):
```bash
cd android/app
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

### 2. Create `android/key.properties`:
```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=my-key-alias
storeFile=my-release-key.jks
```

### 3. Build signed APK in Android Studio:
- **Build > Generate Signed Bundle / APK**
- Select APK
- Choose keystore
- Select release variant

---

## 🎯 Common Issues & Fixes

### White screen on launch?
```bash
# Make sure you built the React app
npm run build

# Sync again
npx cap sync android
```

### "SDK not found" error?
```bash
# Set Android SDK path
export ANDROID_HOME=$HOME/Library/Android/sdk
```

### Gradle build failed?
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

---

## 📦 APK Size

Expected sizes:
- Debug APK: **50-80 MB**
- Release APK: **20-40 MB** (with optimization)
- AAB (Play Store): **15-25 MB**

---

## 🌟 Tips

1. **Test on real device first** - Emulators can be slow
2. **Build release APK for distribution** - Debug APKs are larger
3. **Use AAB for Play Store** - Automatically optimized per device
4. **Update version in `package.json`** before each build
5. **Keep your keystore safe!** - You can't update app without it

---

## 📚 Need More Help?

See the complete guide: **EXPORT_TO_APK_GUIDE.md**

Or visit:
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio/intro)

---

## 🎉 That's It!

You now have an Android APK of your POS mobile app!

**Next**: Test on device, optimize, and distribute! 📱

