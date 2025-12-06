# 🚀 Running POS Mobile App in Android Studio

## Android Studio is Opening...

Once Android Studio opens, follow these steps:

---

## Step 1: Wait for Gradle Sync (1-2 minutes)

Watch the **bottom of the screen** for:
- "Gradle sync in progress..."
- Wait until it shows: **"Gradle Build Finished"** or **"Ready"**

**First time?** This may take 3-5 minutes as it downloads dependencies.

---

## Step 2: Choose How to Run

### **Option A: Run on Physical Device (Real Phone)**

**Before running:**
1. **Connect your Android phone** via USB
2. **Enable USB Debugging** on phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
   - Unlock phone and approve USB debugging prompt

**In Android Studio:**
1. Wait for phone to appear in device dropdown (top toolbar)
2. Click the **green Play ▶️ button** (or Shift+F10)
3. Select your phone from the list
4. App will install and launch automatically!

---

### **Option B: Run on Emulator (Virtual Device)**

**If you don't have an emulator:**

1. **Create Virtual Device:**
   - Click **Device Manager** icon (phone icon on right side)
   - Or: Tools → Device Manager
   - Click **"Create Device"**
   - Select a device (e.g., Pixel 6)
   - Select a system image (e.g., Android 13 - API 33)
   - Download if needed (takes 5-10 minutes)
   - Click **Finish**

2. **Run on Emulator:**
   - Click the **green Play ▶️ button**
   - Select your emulator from dropdown
   - Emulator will launch (takes 30-60 seconds)
   - App will install and open automatically

---

## Step 3: Debug and Test

### **View Logs (Important!)**
- Click **Logcat** tab at bottom
- Filter by "POS" or "chromium" to see app logs
- See console.log messages from your React app

### **Inspect App:**
- Click **Layout Inspector** (Tools → Layout Inspector)
- View your app's UI structure
- Debug layout issues

### **Check Network Calls:**
- Click **Network Profiler** at bottom
- See API calls to your Supabase backend
- Debug network issues

---

## Common Issues & Solutions

### Issue 1: "Gradle Sync Failed"

**Solution:**
```bash
# In Android Studio Terminal (bottom):
cd android
./gradlew clean
./gradlew build
```

Or click: **File → Invalidate Caches → Invalidate and Restart**

---

### Issue 2: "SDK Location Not Found"

**Solution:**

1. Click **File → Project Structure**
2. Set SDK location to:
   ```
   /Users/mtaasisi/Library/Android/sdk
   ```
3. Click Apply → OK

Or create `android/local.properties`:
```properties
sdk.dir=/Users/mtaasisi/Library/Android/sdk
```

---

### Issue 3: Device Not Showing Up

**Solutions:**

**For Physical Device:**
- Unlock phone
- Check USB cable is data cable (not charge-only)
- Try different USB port
- Revoke USB debugging authorizations on phone, then reconnect
- Run: `adb devices` in terminal to verify connection

**For Emulator:**
- Wait for emulator to fully boot (can take 1-2 minutes)
- If stuck, restart emulator
- Try cold boot: Device Manager → Actions (⋮) → Cold Boot Now

---

### Issue 4: Build Failed with Errors

**Check:**
1. **Java version**: File → Settings → Build → Build Tools → Gradle → Gradle JDK
   - Should be Java 17
2. **Gradle version**: Compatible with JDK 17
3. **Clean and rebuild**:
   - Build → Clean Project
   - Build → Rebuild Project

---

### Issue 5: White Screen on App Launch

**Solutions:**

1. **Check web assets are synced:**
```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
npm run build
npx cap sync android
```

2. **Clear app data on device:**
   - Settings → Apps → LATS-POS → Storage → Clear Data

3. **Check Logcat for errors:**
   - Look for JavaScript console errors
   - Check for network/API errors

---

## 🎯 Toolbar Quick Reference

```
┌─────────────────────────────────────────────────┐
│ [Device Dropdown ▼] [▶️ Run] [🐛 Debug] [⏹️ Stop] │
└─────────────────────────────────────────────────┘
```

- **Device Dropdown**: Select phone or emulator
- **▶️ Run (Shift+F10)**: Install and run app
- **🐛 Debug (Shift+F9)**: Run with debugger attached
- **⏹️ Stop**: Stop the app

---

## 📊 Bottom Tabs Reference

- **Logcat**: View app logs and console messages
- **Run**: Build output and installation logs
- **Terminal**: Run commands
- **Problems**: View build errors
- **Build**: Build progress and results

---

## 🎨 Verify Your New Icon

Once app is installed:
1. Check app drawer on phone/emulator
2. Look for purple gradient icon with "POS" text
3. Icon should appear crisp on all screen densities

---

## 🔄 Live Reload (Hot Reload)

For faster development:

1. **Run your Vite dev server** in a separate terminal:
```bash
npm run dev
```

2. **Update Capacitor config** to point to dev server:
```typescript
// capacitor.config.ts
server: {
  url: 'http://YOUR_COMPUTER_IP:5173',
  cleartext: true
}
```

3. **Sync and run**:
```bash
npx cap sync android
```

4. Now changes in your React code will reload automatically!

---

## 🎬 What Happens When You Click Run ▶️

1. **Gradle builds** the Android project (5-30 seconds)
2. **APK is generated** in build folder
3. **APK installs** on selected device
4. **App launches** automatically
5. **Logcat shows** app output

---

## 🐛 Debugging Your App

### Enable Chrome DevTools:
1. Open app on device/emulator
2. Open Chrome on computer
3. Navigate to: `chrome://inspect`
4. Find "LATS-POS" in the list
5. Click "inspect"
6. Full Chrome DevTools available!

---

## 📱 Testing Different Screen Sizes

**Create multiple emulators:**
1. Device Manager → Create Device
2. Try different devices:
   - Pixel 6 (6.4" - Modern)
   - Pixel 4a (5.8" - Compact)
   - Pixel Tablet (10.95" - Tablet)
   - Nexus 5 (4.95" - Small)

Test your app on each to ensure responsive design!

---

## 🚀 Quick Commands in Android Studio Terminal

```bash
# Rebuild app
./gradlew assembleDebug

# Clean build
./gradlew clean

# Install on connected device
./gradlew installDebug

# Uninstall from device
./gradlew uninstallDebug

# View all tasks
./gradlew tasks
```

---

## ✅ Success Checklist

When app runs successfully, you should see:
- ✅ Purple POS icon in launcher
- ✅ App opens without crashing
- ✅ Branch selector visible (if branches exist)
- ✅ Navigation bar at bottom works
- ✅ Can navigate between screens
- ✅ Data loads from your Supabase backend

---

## 📖 What to Expect

**First Launch:**
- App icon appears with purple POS logo
- Splash screen (if configured)
- Mobile dashboard loads
- Bottom navigation appears
- All branch-aware features work

**Features Available:**
- 🏠 Dashboard with statistics
- 📦 Inventory with product images
- 💰 POS for sales
- 👥 Clients management
- ⚙️ Settings and more

---

## 🎯 Pro Tips

1. **Keep Logcat open** - See all console.log messages
2. **Use Debug mode** (🐛) - Set breakpoints in Kotlin/Java code
3. **Shake phone** - Open developer menu (if enabled)
4. **Use emulator toolbar** - Rotate, take screenshots, simulate GPS
5. **Profile performance** - Tools → Profiler

---

## 🔥 Hot Reload During Development

For fastest development cycle:

**Terminal 1 (Vite dev server):**
```bash
npm run dev
```

**Terminal 2 (Update capacitor config):**
```typescript
// capacitor.config.ts
server: {
  url: 'http://YOUR_LOCAL_IP:5173',  // Find with: ifconfig | grep "inet "
  cleartext: true
}
```

**Terminal 3:**
```bash
npx cap sync android
# Then run in Android Studio
```

Now changes appear instantly without rebuilding!

---

**Android Studio should be open now. Click the green ▶️ button to run! 🚀**

If you encounter any issues, check the solutions above or let me know!

