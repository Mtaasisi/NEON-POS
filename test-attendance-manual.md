# 🧪 Manual Testing Script for Attendance Page

## Test Login: care@care.com / 123456

Follow these steps exactly to test the attendance page:

---

## ✅ Step 1: Login

1. **Open your browser** (Chrome recommended)
2. **Navigate to:** `http://localhost:5173` (or your app URL)
3. **Clear cache:** Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
4. **Login credentials:**
   - Email: `care@care.com`
   - Password: `123456`
5. **Click:** Sign In button
6. **Expected:** Should redirect to dashboard

**❌ If Login Fails:**
- Check if user exists in database
- Check if password is correct
- Check browser console for errors
- Verify Supabase connection

---

## ✅ Step 2: Navigate to Attendance Page

1. **From Dashboard:**
   - Look for "Attendance" or "My Attendance" in the menu
   - OR manually navigate to: `http://localhost:5173/attendance`
   - OR try: `http://localhost:5173/employees/attendance`

2. **Expected Results:**
   - Page loads without infinite spinner
   - No console errors
   - No "loadData is not defined" error
   - Data loads successfully

**❌ If Page Shows Loading Forever:**
- Open Browser Console (F12)
- Check for infinite loop errors
- Check for "loadData" errors
- Take screenshot and report

---

## ✅ Step 3: Check Today's Summary Card

### Test 3.1: Today's Data Display
1. **Look at "Today's Summary" card**
2. **Check fields:**
   - [ ] Status field exists
   - [ ] Status shows real value (not hardcoded "Present")
   - [ ] Status color matches (Green=Present, Yellow=Late, Red=Absent)
   - [ ] Check In time field exists
   - [ ] Check In shows real time (not "08:00:00")
   - [ ] Hours Worked field exists
   - [ ] Hours show calculation (not "9.0 hours")

### Test 3.2: No Attendance State
If not checked in today:
- [ ] Shows calendar icon
- [ ] Shows "No attendance recorded for today"
- [ ] Shows helpful message

**❌ If Shows Hardcoded Data:**
- Shows "Present" when you're not checked in → BUG
- Shows "08:00:00" always → BUG
- Shows "9.0 hours" always → BUG
- Take screenshot and report

---

## ✅ Step 4: Check Attendance History Tab

1. **Click "History" tab**
2. **Expected Results:**
   - [ ] Tab switches successfully
   - [ ] Table displays (if data exists)
   - [ ] All columns show: Date, Check In, Check Out, Status, Hours
   - [ ] Data is accurate (not fake/random)
   - [ ] Status badges have correct colors

### If No History:
- [ ] Shows calendar icon
- [ ] Shows "No Attendance History"
- [ ] Shows helpful message
- [ ] NOT showing empty table

**❌ If Shows Empty Table:**
- Empty table with just headers → BUG
- Table exists but confusing → BUG

---

## ✅ Step 5: Check Statistics Tab

1. **Click "Statistics" tab**
2. **Check stat cards:**
   - [ ] Total Days shows number (not 0 if you have data)
   - [ ] Present Days shows number
   - [ ] Attendance Rate shows percentage
   - [ ] Average Hours shows number
   - [ ] All calculations look correct

### Test 5.1: Monthly Calendar
1. **Scroll to "Monthly Overview"**
2. **Check calendar:**
   - [ ] Shows current month and year in header
   - [ ] Days with attendance are colored
   - [ ] Colors match actual attendance status
   - [ ] NOT showing random colors
   - [ ] Today is highlighted with blue ring
   - [ ] Hover shows tooltip with date/status

3. **Check legend:**
   - [ ] Shows: Present (Green)
   - [ ] Shows: Late (Yellow)
   - [ ] Shows: Absent (Red)
   - [ ] Shows: No Record (Gray)
   - [ ] Shows: Today (Blue ring)

**❌ If Calendar Shows Random Data:**
- Colors change on refresh → BUG (was using Math.random())
- No relationship to actual attendance → BUG
- Take screenshot

---

## ✅ Step 6: Test Check-In/Check-Out

### Test 6.1: Check-In
1. **Click "Check In" button** (if not checked in)
2. **Expected:**
   - [ ] Security verification appears (if enabled)
   - [ ] Can complete check-in
   - [ ] Today's Summary updates immediately
   - [ ] Shows actual check-in time
   - [ ] History tab shows today's entry
   - [ ] Stats update

### Test 6.2: Check-Out
1. **Click "Check Out" button** (after check-in)
2. **Expected:**
   - [ ] Check-out completes
   - [ ] Check-out time appears
   - [ ] Hours calculate correctly
   - [ ] Shows "Day completed" message
   - [ ] Can't check in again today

**❌ If Buttons Don't Work:**
- Button doesn't respond → Check console
- No data update → Check network tab
- Error message → Report error

---

## ✅ Step 7: Test Error Handling

### Test 7.1: Simulate Error
To test error state (optional):
1. **Open DevTools → Network tab**
2. **Set to "Offline" mode**
3. **Refresh page**
4. **Expected:**
   - [ ] Shows red error icon
   - [ ] Shows clear error message
   - [ ] Shows "Try Again" button
   - [ ] NOT showing loading forever
   - [ ] NOT showing confusing state

### Test 7.2: Recovery
1. **Turn network back online**
2. **Click "Try Again"**
3. **Expected:**
   - [ ] Page reloads
   - [ ] Data loads successfully
   - [ ] Error state disappears

---

## ✅ Step 8: Browser Console Check

1. **Open Browser Console** (F12)
2. **Look for errors:**
   - [ ] NO "loadData is not defined"
   - [ ] NO "Maximum update depth exceeded"
   - [ ] NO "Missing dependency" warnings
   - [ ] NO infinite loop warnings
   - [ ] NO red errors

3. **Network Tab:**
   - [ ] Check if API calls succeed
   - [ ] Check if data is fetched
   - [ ] Look for failed requests (red)

**❌ If Console Has Errors:**
- Copy full error message
- Take screenshot
- Note what you were doing when error occurred

---

## ✅ Step 9: Responsive Design

### Test 9.1: Desktop
1. **Full width browser**
2. **Check:**
   - [ ] Cards display side by side
   - [ ] Table is readable
   - [ ] No horizontal scroll
   - [ ] Everything fits nicely

### Test 9.2: Mobile
1. **Resize browser to ~400px width**
2. **OR open DevTools → Toggle device toolbar**
3. **Check:**
   - [ ] Cards stack vertically
   - [ ] Table scrolls horizontally if needed
   - [ ] Buttons are clickable
   - [ ] Text is readable
   - [ ] No layout breaks

---

## ✅ Step 10: Data Persistence

1. **Note your current attendance data**
2. **Refresh the page** (F5)
3. **Expected:**
   - [ ] Data persists
   - [ ] Shows same information
   - [ ] No data loss
   - [ ] Loads successfully

4. **Navigate away and back:**
   - Go to dashboard
   - Return to attendance page
   - [ ] Data still correct

---

## 📊 Test Results Template

```
=== ATTENDANCE PAGE TEST RESULTS ===
Date: __________________
Tested By: care@care.com
Browser: __________________

✅ PASSED TESTS:
- [ ] Login successful
- [ ] Page loads without errors
- [ ] Today's Summary shows real data
- [ ] History displays correctly
- [ ] Statistics calculate correctly
- [ ] Monthly calendar shows real data
- [ ] Check-in works
- [ ] Check-out works
- [ ] Error handling works
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Data persists on refresh

❌ FAILED TESTS:
[List any issues here]

🐛 BUGS FOUND:
[Describe bugs with screenshots]

💡 NOTES:
[Any additional observations]

STATUS: [PASS / FAIL / NEEDS FIXES]
```

---

## 🚨 Common Issues to Look For

### Issue 1: Hardcoded Data
**Symptom:** Always shows "Present", "08:00:00", "9.0 hours"
**Fix:** Already fixed in code, need hard refresh (Ctrl+Shift+R)

### Issue 2: Random Calendar
**Symptom:** Calendar colors change on refresh
**Fix:** Already fixed, using real data now

### Issue 3: Loading Loop
**Symptom:** Page loads forever
**Fix:** Already fixed, need hard refresh

### Issue 4: Empty States Missing
**Symptom:** Shows confusing empty table
**Fix:** Already fixed, shows friendly message

### Issue 5: No Error Handling
**Symptom:** Page breaks with no message
**Fix:** Already fixed, shows clear error with retry

---

## ✅ Success Criteria

**Test PASSES if:**
- ✅ All data is real (no hardcoded values)
- ✅ Calendar shows actual attendance
- ✅ No infinite loading
- ✅ No console errors
- ✅ Error states are friendly
- ✅ Empty states are helpful
- ✅ Check-in/out works
- ✅ Data persists

**Test FAILS if:**
- ❌ Any hardcoded data appears
- ❌ Random/mock data displays
- ❌ Loading never stops
- ❌ Console errors present
- ❌ Page breaks or crashes

---

## 📞 Report Issues

If you find issues:
1. Take screenshot
2. Copy console errors
3. Note what you were doing
4. Save this template with results
5. Report with:
   - Browser used
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots
   - Console errors

---

**Good luck with testing! 🚀**

*Remember to hard refresh (Ctrl+Shift+R) before testing to ensure you have the latest code!*

