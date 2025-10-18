# 🐛 Reminders Debug Guide

## Console Logging Added

Comprehensive debug logging has been added to help troubleshoot reminder issues. Open your browser console (F12) to see detailed logs.

---

## 📋 Debug Log Categories

### 🔄 **Page Load & Branch**
```
🔄 [Reminders] useEffect triggered, currentBranch: {...}
✅ [Reminders] Branch available, loading reminders...
⚠️ [Reminders] No current branch, waiting...
```

### 📝 **Loading Reminders**
```
📝 [Reminders] Loading reminders for branch: {
  branchId: "...",
  branchName: "Main Store",
  userId: "..."
}
✅ [Reminders] Reminders loaded successfully: {
  count: 5,
  reminders: [...]
}
❌ [Reminders] Error loading reminders: {...}
```

### 🔍 **Filtering**
```
🔍 [Reminders] Filtering reminders: {
  totalReminders: 5,
  filterStatus: "all",
  searchQuery: ""
}
✅ [Reminders] Filtered results: {
  filteredCount: 5,
  reminders: [...]
}
```

### 🎨 **Modal Open**
```
🎨 [Modal] EnhancedReminderModal opened: {
  isOpen: true,
  reminder: null,
  userId: "...",
  branchId: "..."
}
```

### 📝 **Creating/Updating Reminders**
```
📝 [Reminders] Creating reminder: {
  formData: {...},
  userId: "...",
  branchId: "..."
}
✅ [Reminders] Reminder created: {...}
📝 [Reminders] Updating reminder: {...}
❌ [Reminders] Error saving reminder: {...}
```

### ✅ **Actions**
```
✅ [Reminders] Marking reminder as complete: "reminder-id"
🗑️ [Reminders] Deleting reminder: "reminder-id"
📋 [Reminders] Duplicating reminder: {...}
```

### 🔵 **API Calls**
```
🔵 [API] getReminders called with branchId: "..."
🔵 [API] Adding branch filter: "..."
⚠️ [API] No branch ID provided, fetching all reminders
✅ [API] Reminders fetched: {
  count: 5,
  data: [...]
}
❌ [API] Error fetching reminders: {...}
```

```
🔵 [API] createReminder called: {
  input: {...},
  userId: "...",
  branchId: "..."
}
🔵 [API] Inserting reminder: {...}
✅ [API] Reminder created successfully: {...}
❌ [API] Error creating reminder: {...}
```

---

## 🔍 How to Debug

### 1. **Check Branch Context**
Look for:
```
🔄 [Reminders] useEffect triggered, currentBranch: {...}
```
- If `currentBranch` is `null`, the branch context isn't loaded yet
- If it has data, check the `branchId` value

### 2. **Check API Calls**
Look for:
```
🔵 [API] getReminders called with branchId: "..."
```
- Make sure `branchId` is not `undefined`
- Check if data is returned: `✅ [API] Reminders fetched: {count: X}`

### 3. **Check Filtering**
Look for:
```
🔍 [Reminders] Filtering reminders: {totalReminders: X, ...}
```
- Compare `totalReminders` vs `filteredCount`
- If they're different, check your filter settings

### 4. **Check Creation**
When creating a reminder:
```
🔵 [API] createReminder called: {...}
🔵 [API] Inserting reminder: {...}
✅ [API] Reminder created successfully: {...}
```
- Verify `branchId` is included in the data
- Check that `created_by` has a valid user ID

### 5. **Common Issues**

#### ❌ No reminders showing
**Check:**
1. Branch ID exists: `branchId: "..."`
2. Data is fetched: `✅ [API] Reminders fetched: {count: X}`
3. Filter isn't excluding them: `filteredCount` should match

#### ❌ Reminder created but not visible
**Check:**
1. Branch ID was passed: `branchId: "..."`  (not `undefined`)
2. Reload happened: Look for `📝 [Reminders] Loading reminders...` after creation
3. Same branch filter: Compare `branchId` in create vs fetch

#### ❌ Database error
**Check:**
1. Error message: `❌ [API] Error creating reminder: {...}`
2. Check if `recurring` column exists (run migration)
3. Check RLS policies (user has permission)

---

## 🎯 Quick Checklist

When you open the reminders page, you should see (in order):

1. ✅ `🔄 [Reminders] useEffect triggered`
2. ✅ `📝 [Reminders] Loading reminders for branch`
3. ✅ `🔵 [API] getReminders called with branchId`
4. ✅ `✅ [API] Reminders fetched`
5. ✅ `✅ [Reminders] Reminders loaded successfully`
6. ✅ `🔍 [Reminders] Filtering reminders`
7. ✅ `✅ [Reminders] Filtered results`

When you create a reminder, you should see:

1. ✅ `🎨 [Modal] EnhancedReminderModal opened`
2. ✅ `📝 [Reminders] Creating reminder`
3. ✅ `🔵 [API] createReminder called`
4. ✅ `🔵 [API] Inserting reminder`
5. ✅ `✅ [API] Reminder created successfully`
6. ✅ `✅ [Reminders] Reminder created`
7. ✅ `📝 [Reminders] Loading reminders...` (reload)

---

## 💡 Tips

- Keep console open while testing
- Use Console Filter to show only `[Reminders]`, `[API]`, or `[Modal]` logs
- Take screenshots of errors for debugging
- Check Network tab for failed API calls

---

*Debug logs added: October 18, 2025*

