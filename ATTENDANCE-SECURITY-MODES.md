# 🔒 Attendance Security Modes Guide

## Overview
You now have complete control over which security methods are used for employee attendance check-ins! This gives you flexibility to balance security with convenience based on your needs.

## How to Configure

### 1. Go to Admin Settings
Navigate to: **Admin Dashboard → Settings → Attendance**

### 2. Choose Your Security Mode
You'll see a dropdown with 6 security options:

---

## Security Modes Explained

### 🎯 Auto-Location (Recommended)
**What it does:**
- Automatically detects which office the employee is at using GPS
- If auto-detection fails, employees can manually select their office
- Requires photo verification

**Best for:**
- Multiple office locations
- Offices close to each other
- Maximum convenience with good security

**Required Steps:**
1. GPS auto-detection of nearest office
2. Photo verification

---

### 📍 Manual Location Selection
**What it does:**
- Employees manually choose their office from a list
- GPS still verifies they're within the office radius
- Requires photo verification

**Best for:**
- Employees who work at different locations
- Situations where auto-detection might be unreliable

**Required Steps:**
1. Manual office selection
2. GPS location verification
3. Photo verification

---

### 📶 WiFi Only
**What it does:**
- Only checks if employee is connected to office WiFi
- No GPS required
- Requires photo verification

**Best for:**
- Single office with reliable WiFi
- Indoor offices where GPS might be weak
- Faster check-in process

**Required Steps:**
1. WiFi network verification
2. Photo verification

---

### 🔒 Location + WiFi
**What it does:**
- Requires both GPS location AND WiFi connection
- Double security layer
- Requires photo verification

**Best for:**
- High-security environments
- Preventing attendance fraud
- Critical business operations

**Required Steps:**
1. GPS location verification
2. WiFi network verification
3. Photo verification

---

### 📷 Photo Only (Least Secure)
**What it does:**
- Only requires employee photo
- No location or network verification
- Fastest check-in

**Best for:**
- Remote work
- Field employees
- Temporary situations
- **⚠️ Not recommended for regular office attendance**

**Required Steps:**
1. Photo verification only

---

### 🛡️ Maximum Security
**What it does:**
- Requires ALL security methods
- Auto-location + WiFi + Photo
- Highest level of verification

**Best for:**
- High-value operations
- Strict compliance requirements
- Zero-tolerance for attendance fraud

**Required Steps:**
1. GPS auto-location detection
2. WiFi network verification
3. Photo verification

---

## How Employees Experience It

### Before Check-in
Employees will see a card at the top showing which security mode is active:
```
🎯 Auto-Location
GPS auto-detection with manual fallback
```

### During Check-in
Only the required verification steps will be shown:
- Progress bar updates based on completed steps
- Clear instructions for each required verification
- Skip unnecessary steps automatically

### After Changes
When you change the security mode:
1. Settings are saved to the database
2. All employees will use the new mode immediately
3. No app restart needed

---

## Tips & Best Practices

### 🎯 For Most Businesses
Use **Auto-Location** - it's the sweet spot between security and convenience.

### 🏢 For Multiple Offices
Use **Auto-Location** or **Manual Location** depending on how close your offices are.

### 📶 For Single Office
Consider **WiFi Only** if you have strong WiFi coverage throughout the office.

### 🔒 For High Security
Use **Location + WiFi** or **Maximum Security** depending on your requirements.

### ⚠️ Avoid Photo Only
Unless you have a specific use case (remote work, field staff), photo-only is not secure enough.

---

## Testing Your Configuration

1. Save your chosen security mode in Admin Settings
2. Log in as an employee (or use test account)
3. Go to **My Attendance** page
4. Click **Check In**
5. Verify that only the required security steps appear
6. Complete the check-in process

---

## Troubleshooting

### "Security mode not changing"
- Make sure you clicked **Save Settings** in the admin panel
- Refresh the employee page
- Check browser console for errors

### "GPS not working"
- Ensure location permissions are granted
- Try the manual location selection mode
- Check if GPS is enabled on the device

### "WiFi not detected"
- Verify the WiFi SSID is correctly configured in office settings
- Employee must be connected to the configured WiFi
- Check if WiFi scanning is supported by the browser

### "Photo verification failing"
- Ensure camera permissions are granted
- Try refreshing the page
- Check if camera is working in other apps

---

## Database Changes

The new `securityMode` field is automatically added to your attendance settings:
- Stored in the `settings` table
- Key: `attendance`
- Value includes: `securityMode` field

**No manual database migration needed!**

---

## Files Modified

- ✅ `src/lib/attendanceSettingsApi.ts` - Added SecurityMode type
- ✅ `src/features/admin/pages/AdminSettingsPage.tsx` - Added security mode selector UI
- ✅ `src/features/employees/components/SecureAttendanceVerification.tsx` - Updated to respect security mode

---

## Need Help?

If you need to customize the security modes further or add new verification methods, the main logic is in:
- `SecureAttendanceVerification.tsx` - Controls which steps are shown
- `attendanceSettingsApi.ts` - Defines available security modes
- `AdminSettingsPage.tsx` - Admin configuration UI

---

**Enjoy your new flexible attendance security system! 🎉**

