# ⚡ Quick Toggle Test - ON vs OFF

## 2-Minute Test

### Test Isolation ON

**1. Set Toggle to ON**
```typescript
// In src/features/lats/lib/data/provider.supabase.ts
const ISOLATION_CONFIG = {
  ENABLE_DEVICE_ISOLATION: true,
  ENABLE_TECHNICIAN_ISOLATION: true,
  // ... rest true
};
```

**2. Set Branch**
```javascript
// In browser console
localStorage.setItem('current_branch_id', '00000000-0000-0000-0000-000000000001');
location.reload();
```

**3. Check Devices Page**
- Go to `/devices`
- Count devices shown
- Note the count: __________

**4. Check Database**
```sql
SELECT COUNT(*) FROM devices 
WHERE branch_id = '00000000-0000-0000-0000-000000000001';
```
- Database count: __________

**Expected:** UI count = Database count ✅

---

### Test Isolation OFF

**1. Set Toggle to OFF**
```typescript
// In src/features/lats/lib/data/provider.supabase.ts
const ISOLATION_CONFIG = {
  ENABLE_DEVICE_ISOLATION: false,
  ENABLE_TECHNICIAN_ISOLATION: false,
  // ... rest false
};
```

**2. Reload App**
```javascript
location.reload();
```

**3. Check Devices Page Again**
- Go to `/devices` 
- Count devices shown
- Note the count: __________

**4. Check Database**
```sql
SELECT COUNT(*) FROM devices;
```
- Database total: __________

**Expected:** UI count = Database TOTAL (all branches) ✅

---

## Quick Comparison

| State | Branch Set | Devices Shown | Expected |
|-------|-----------|---------------|----------|
| **ON** | Main Branch | Count A | Only Main Branch devices |
| **OFF** | Main Branch | Count B | ALL devices |

**Result:** Count B should be ≥ Count A

If Count B > Count A: ✅ **Isolation is working!**  
If Count B = Count A: Either you only have one branch, or isolation might not be working

---

## Visual Test

### Isolation ON
1. Set branch to Main
2. Note device count: __________
3. Set branch to different branch
4. Note device count: __________

**Expected:** Counts should be DIFFERENT ✅

### Isolation OFF
1. Set branch to Main
2. Note device count: __________
3. Set branch to different branch
4. Note device count: __________

**Expected:** Counts should be SAME ✅

---

## Database Quick Check

Run this to see actual distribution:

```sql
-- See data by branch
SELECT 
    b.name as branch_name,
    COUNT(d.id) as devices,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role IN ('technician', 'tech')) as technicians
FROM lats_branches b
LEFT JOIN devices d ON d.branch_id = b.id
LEFT JOIN users u ON u.branch_id = b.id
GROUP BY b.name
ORDER BY b.name;
```

**What you should see:**
```
 branch_name | devices | technicians
-------------+---------+-------------
 Main Branch |      15 |           5
 Branch B    |       8 |           3
```

---

## Success Criteria

### ✅ Isolation ON Working If:
- [ ] Setting branch shows only that branch's data
- [ ] Switching branches shows different data
- [ ] UI count matches database filtered count
- [ ] Creating device assigns to current branch

### ✅ Isolation OFF Working If:
- [ ] Branch setting is ignored
- [ ] Always shows ALL data
- [ ] UI count matches database TOTAL count
- [ ] Switching branches shows SAME data

---

## Common Issues

### Issue: Always seeing all data (even when ON)
**Check:**
```typescript
// Make sure this is TRUE
console.log(ISOLATION_CONFIG.ENABLE_DEVICE_ISOLATION); // Should be true
```

### Issue: Never seeing any data (even when OFF)
**Check:**
```javascript
// Make sure you have data
console.log(localStorage.getItem('current_branch_id')); // Check value
```

### Issue: Toggle doesn't seem to do anything
**Solution:**
1. Clear browser cache
2. Hard reload (Cmd+Shift+R / Ctrl+Shift+R)
3. Verify you saved the file
4. Check browser console for errors

---

## The Ultimate Test

**Run this sequence:**

1. Toggle ON → Reload → Count devices → Note: A = _____
2. Toggle OFF → Reload → Count devices → Note: B = _____
3. Toggle ON → Reload → Count devices → Note: C = _____

**Expected Results:**
- A should equal C (consistent behavior)
- B should be ≥ A (more or equal devices when OFF)
- If B > A, isolation is working! ✅

---

## Interactive Test Tool

Open `test-toggle-functionality.html` for guided testing with visual indicators!

---

## Need More Help?

- **Full test suite**: `./test-branch-isolation.sh`
- **Browser tool**: `test-isolation-browser.html`
- **Complete guide**: `TESTING-GUIDE.md`
- **Toggle guide**: `BRANCH-ISOLATION-TOGGLE-GUIDE.md`

**Status after testing:** ____________

**Date tested:** ____________

**Tested by:** ____________


