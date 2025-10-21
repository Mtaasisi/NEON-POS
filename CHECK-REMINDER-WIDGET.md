# 🔍 ReminderWidget Troubleshooting Guide

## ✅ Widget Build Status
The ReminderWidget compiled successfully! File created: `reminderApi-6f0ed28d.js`

---

## 🎯 Quick Check: Is ReminderWidget Enabled?

### Step 1: Check Settings
1. Go to **Settings** → **Dashboard**
2. Scroll down to **"Other Widgets"** section
3. Look for **"Reminder Widget"** with Bell icon 🔔
4. **Is it showing a GREEN badge** that says "Added"?
   - ✅ **YES** → Widget is enabled, proceed to Step 2
   - ❌ **NO** → Click the Reminder Widget card to enable it, then click "Save Changes"

### Step 2: Check Browser Console
1. Open browser DevTools (F12 or Right-click → Inspect)
2. Go to **Console** tab
3. Look for any errors mentioning:
   - `ReminderWidget`
   - `useBranch`
   - `reminderApi`
   - `BranchContext`

---

## 🔧 Common Issues & Solutions

### Issue 1: "useBranch must be used within a BranchProvider"
**Cause:** BranchProvider is not wrapping the app
**Solution:** Check `src/App.tsx` - should have `<BranchProvider>` wrapping routes

### Issue 2: Widget Not Visible (No Error)
**Cause:** Widget might be showing empty state or loading forever
**Possible Reasons:**
1. **No branch selected** - ReminderWidget requires `currentBranch` to load data
2. **No reminders in database** - Shows empty state (bell icon + "No upcoming reminders")
3. **Still loading** - Shows 3 animated dots

### Issue 3: Widget Shows But No Data
**Cause:** No reminders exist yet
**Solution:** 
1. Go to **Reminders** page (`/reminders`)
2. Create a test reminder
3. Return to Dashboard
4. ReminderWidget should now show the reminder

---

## 🎨 What ReminderWidget Should Look Like

### When Empty (No Reminders):
```
┌─────────────────────────────┐
│ 🔔 Reminders                │
│    Stay on track            │
├─────────────────────────────┤
│  Upcoming    │   Overdue    │
│      0       │       0      │
├─────────────────────────────┤
│     📢 (large bell icon)    │
│  No upcoming reminders      │
│  [+ Create reminder]        │
└─────────────────────────────┘
```

### When Has Reminders:
```
┌─────────────────────────────┐
│ 🔔 Reminders                │
│    2 overdue                │
├─────────────────────────────┤
│  Upcoming    │   Overdue    │
│      3       │       2      │
├─────────────────────────────┤
│ 🔴 [H] Meeting - 2h overdue │
│ 🟡 [M] Call John - in 3h    │
│ 🟢 [L] Review docs - in 1d  │
├─────────────────────────────┤
│ [+ Add Reminder] [View All] │
└─────────────────────────────┘
```

---

## 🧪 Manual Test Steps

### Test 1: Enable Widget
1. Go to `Settings → Dashboard`
2. Find "Reminder Widget" (Bell icon)
3. Click it (should turn green with "Added" badge)
4. Click "Save Changes" at top
5. Navigate to Dashboard
6. Refresh page (F5)
7. **Expected:** ReminderWidget appears in "Customer Insights & Service Row"

### Test 2: Create Test Reminder
1. Navigate to `/reminders` page
2. Click "Create Reminder" or "+" button
3. Fill in:
   - **Title:** "Test Reminder"
   - **Date:** Tomorrow
   - **Time:** 10:00 AM
   - **Priority:** High
4. Save reminder
5. Go back to Dashboard
6. **Expected:** ReminderWidget shows 1 upcoming reminder

### Test 3: Check Widget Position
On Desktop:
- ReminderWidget should appear in a 3-column grid
- Row: "Customer Insights & Service Row"
- Alongside: Customer Insights Widget and Service Widget

On Mobile:
- ReminderWidget should appear in single column
- Stacked with other widgets

---

## 🔍 Debug Console Commands

Open browser console and run these commands:

### Check if widget is enabled:
```javascript
// Check localStorage for settings
const settings = localStorage.getItem('dashboard_settings');
console.log('Dashboard Settings:', JSON.parse(settings || '{}'));
```

### Check if BranchContext is working:
```javascript
// This should work if you're on Dashboard page
// Check React DevTools → Components → BranchProvider
// Should show currentBranch value
```

---

## 📍 File Locations

If you need to check the code:

1. **ReminderWidget Component:**
   - `src/features/shared/components/dashboard/ReminderWidget.tsx`

2. **Dashboard Page (renders widget):**
   - `src/features/shared/pages/DashboardPage.tsx`
   - Line ~585: `{isWidgetEnabled('reminderWidget') && <ReminderWidget />}`

3. **Settings (enable/disable):**
   - `src/features/admin/components/DashboardCustomizationSettings.tsx`
   - Line ~512: Reminder Widget configuration

4. **Hook (widget settings):**
   - `src/hooks/useDashboardSettings.ts`
   - Line ~75: `reminderWidget: boolean`

---

## ✅ Checklist

- [ ] Widget compiles without errors (✅ Already confirmed)
- [ ] Widget is enabled in Settings
- [ ] "Save Changes" clicked after enabling
- [ ] Dashboard page refreshed (F5)
- [ ] No console errors
- [ ] BranchProvider is set up
- [ ] At least one reminder exists in database
- [ ] Widget appears in dashboard

---

## 🆘 Still Not Working?

If you've tried all above steps and still don't see the widget:

1. **Clear browser cache:**
   - Ctrl+Shift+Delete (Windows/Linux)
   - Cmd+Shift+Delete (Mac)
   - Clear "Cached images and files"
   - Reload page

2. **Check widget is imported:**
   ```typescript
   // In DashboardPage.tsx, should see:
   import { ReminderWidget } from '../components/dashboard';
   ```

3. **Verify widget size setting:**
   - Go to Settings → Dashboard
   - Check "Widget Size Settings" section
   - ReminderWidget should be there if enabled

4. **Check browser console for:**
   - Red error messages
   - Network errors (failed API calls)
   - React errors

---

## 📞 Quick Commands

### Force enable ReminderWidget via console:
```javascript
// Run in browser console on Dashboard page
const currentSettings = JSON.parse(localStorage.getItem('dashboard_settings') || '{}');
currentSettings.widgets = currentSettings.widgets || {};
currentSettings.widgets.reminderWidget = true;
localStorage.setItem('dashboard_settings', JSON.stringify(currentSettings));
location.reload();
```

---

**Created:** October 20, 2025
**Status:** Troubleshooting Guide
**Widget:** ReminderWidget 🔔

