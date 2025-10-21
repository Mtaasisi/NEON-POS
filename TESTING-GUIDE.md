# 🧪 Branch Isolation Testing Guide

## Quick Test (2 Minutes)

### Option 1: Database Test (Recommended First)
```bash
./test-branch-isolation.sh
```

This will:
- ✅ Check database schema
- ✅ Verify branch_id columns exist
- ✅ Show data distribution by branch
- ✅ Check isolation integrity
- ✅ Verify indexes are in place

### Option 2: Browser Test
Open `test-isolation-browser.html` in your browser for interactive testing.

## Detailed Testing Steps

### 1. Database Schema Test

**Check if migrations ran successfully:**
```sql
-- Check devices table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'devices' AND column_name = 'branch_id';

-- Check users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'branch_id';

-- Check customer_payments table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_payments' AND column_name = 'branch_id';
```

**Expected Result:** All three should return one row showing `branch_id` column exists.

### 2. Data Distribution Test

**Check how data is distributed:**
```sql
-- Devices by branch
SELECT 
    b.name as branch_name,
    COUNT(d.id) as device_count
FROM lats_branches b
LEFT JOIN devices d ON d.branch_id = b.id
GROUP BY b.name;

-- Technicians by branch
SELECT 
    b.name as branch_name,
    COUNT(u.id) as technician_count,
    STRING_AGG(u.full_name, ', ') as technicians
FROM lats_branches b
LEFT JOIN users u ON u.branch_id = b.id 
WHERE u.role IN ('technician', 'tech')
GROUP BY b.name;
```

**Expected Result:** Should show data grouped by branches. All existing data should be in "Main Branch".

### 3. Browser Isolation Test

**Step 1: Set a Branch**
```javascript
// In browser console
localStorage.setItem('current_branch_id', '00000000-0000-0000-0000-000000000001');
location.reload();
```

**Step 2: Navigate to Devices Page**
- Go to `/devices`
- Should only show devices from Main Branch
- Check the count matches database query

**Step 3: Test Technician Assignment**
- Try to assign a device
- Should only see technicians from Main Branch
- Verify names match database query

**Step 4: Switch Branches**
```javascript
// Switch to different branch (if you have one)
localStorage.setItem('current_branch_id', 'different-branch-id');
location.reload();
```

Should see different data or no data if that branch has no records.

**Step 5: Clear Branch (See All)**
```javascript
localStorage.removeItem('current_branch_id');
location.reload();
```

Should now see ALL devices from ALL branches (if isolation toggle is OFF).

### 4. Toggle Test

**Test turning isolation ON/OFF:**

Edit `src/features/lats/lib/data/provider.supabase.ts`:

```typescript
// Turn OFF device isolation
const ISOLATION_CONFIG = {
  ENABLE_DEVICE_ISOLATION: false,  // Changed to false
  // ... rest stays same
};
```

Reload app and verify you now see ALL devices regardless of branch_id.

Turn back ON and verify filtering works again.

### 5. Create Test

**Test new records get correct branch_id:**

**Create a Device:**
```javascript
// Set branch first
localStorage.setItem('current_branch_id', 'test-branch-id');

// Now create a device in UI
// After creation, check database:
```

```sql
SELECT id, device_name, branch_id 
FROM devices 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:** The new device should have `branch_id = 'test-branch-id'`

**Create a Technician:**
```javascript
// Set branch first
localStorage.setItem('current_branch_id', 'test-branch-id');

// Create technician in UI
// Check database:
```

```sql
SELECT id, full_name, role, branch_id 
FROM users 
WHERE role = 'technician'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:** New technician should have `branch_id = 'test-branch-id'`

### 6. Statistics Test

**Test branch-aware statistics:**

```javascript
// In browser console (after importing provider)
const stats = await supabaseProvider.getDeviceStatistics();
console.log(stats);

const userStats = await supabaseProvider.getUserStatistics();
console.log(userStats);
```

**Expected Result:** Should show counts for current branch only (if isolation is ON).

### 7. Cross-Branch Test

**Verify data cannot cross branches:**

1. Create device in Branch A
2. Switch to Branch B
3. Try to view/edit the device from Branch A

**Expected Result:** Device should NOT be visible or accessible from Branch B.

## Test Checklist

Use this checklist to verify everything works:

### Database Level
- [ ] `branch_id` column exists in `devices` table
- [ ] `branch_id` column exists in `users` table
- [ ] `branch_id` column exists in `customer_payments` table
- [ ] All existing devices have `branch_id` set
- [ ] All existing users have `branch_id` set
- [ ] All existing payments have `branch_id` set
- [ ] Indexes exist for `branch_id` columns

### Code Level
- [ ] `ISOLATION_CONFIG` is defined in provider.supabase.ts
- [ ] All toggles are set to desired values (ON/OFF)
- [ ] `getCurrentBranchId()` helper function exists
- [ ] All queries check isolation config before filtering

### Functional Level
- [ ] Setting branch_id in localStorage works
- [ ] Devices page shows only branch devices
- [ ] Technician dropdown shows only branch technicians
- [ ] Creating device assigns correct branch_id
- [ ] Creating user assigns correct branch_id
- [ ] Switching branches shows different data
- [ ] Clearing branch shows all data (if toggle OFF)
- [ ] Statistics are branch-specific

### Edge Cases
- [ ] What happens with NULL branch_id? (Should see in default branch or all)
- [ ] What happens when branch doesn't exist? (Should see nothing)
- [ ] Can admin see all branches? (Depends on toggle)
- [ ] Can data be moved between branches? (Yes, via SQL)

## Common Issues & Solutions

### Issue 1: Not Seeing Any Data
**Problem:** Set branch_id but seeing no devices/technicians

**Solution:**
```sql
-- Check if that branch actually has data
SELECT COUNT(*) FROM devices WHERE branch_id = 'your-branch-id';

-- If 0, either:
-- 1. That branch has no data yet (expected)
-- 2. Branch ID is wrong (check lats_branches table)
```

### Issue 2: Seeing All Data Despite Branch Set
**Problem:** Branch is set but still seeing everything

**Solution:**
```typescript
// Check if isolation is enabled
// In provider.supabase.ts:
console.log(ISOLATION_CONFIG.ENABLE_DEVICE_ISOLATION); // Should be true

// If false, turn it on or this is expected behavior
```

### Issue 3: New Records Not Getting Branch ID
**Problem:** Creating records but branch_id is NULL

**Solution:**
```javascript
// Make sure branch is set BEFORE creating
localStorage.setItem('current_branch_id', 'your-branch-id');

// Then create the record
// Check toggle is ON in ISOLATION_CONFIG
```

### Issue 4: Cannot Move Data Between Branches
**Problem:** Need to reassign devices to different branch

**Solution:**
```sql
-- Move specific devices
UPDATE devices 
SET branch_id = 'new-branch-id'
WHERE id IN ('device-1', 'device-2');

-- Move technician
UPDATE users 
SET branch_id = 'new-branch-id'
WHERE id = 'technician-id';
```

## Performance Testing

### Test Query Performance

```sql
-- Should be fast (uses index)
EXPLAIN ANALYZE
SELECT * FROM devices 
WHERE branch_id = '00000000-0000-0000-0000-000000000001'
LIMIT 100;

-- Check if index is being used
-- Look for "Index Scan using idx_devices_branch_id"
```

**Expected Result:** Query should use index scan, not sequential scan.

## Automated Test Script

Run the complete test suite:

```bash
# Make executable (first time only)
chmod +x test-branch-isolation.sh

# Run tests
./test-branch-isolation.sh
```

This will run all database-level tests automatically.

## Browser Test Tool

Open the interactive test tool:

```bash
# In your project directory
open test-isolation-browser.html

# Or if on Linux
xdg-open test-isolation-browser.html
```

This provides a GUI for:
- Setting branch ID
- Running tests
- Viewing current status
- Quick branch switching

## Next Steps After Testing

Once all tests pass:

1. ✅ **Assign Branches**: Move existing data to correct branches if needed
2. ✅ **Configure Toggles**: Set final isolation settings
3. ✅ **Train Users**: Show them how branch switching works
4. ✅ **Deploy**: Push to production
5. ✅ **Monitor**: Watch for any isolation issues

## Need Help?

- Check logs in browser console for errors
- Run SQL queries to verify data
- Check `ISOLATION_CONFIG` settings
- Review toggle guide: `BRANCH-ISOLATION-TOGGLE-GUIDE.md`
- See examples: `COMPLETE-ISOLATION-QUICK-REFERENCE.md`

---

**Test Status Template:**

```
🧪 TEST RESULTS
═══════════════════════════════════════
✅ Database schema - PASS
✅ Data distribution - PASS  
✅ Isolation integrity - PASS
✅ Performance indexes - PASS
✅ Browser localStorage - PASS
✅ Device filtering - PASS
✅ Technician filtering - PASS
✅ Payment filtering - PASS
✅ Statistics - PASS
✅ Create operations - PASS

STATUS: ALL TESTS PASSED ✅
Ready for production! 🚀
```

Good luck with testing! 🎉

