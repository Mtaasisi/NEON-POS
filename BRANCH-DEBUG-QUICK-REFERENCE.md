# 🔍 Branch Isolation Debug - Quick Reference Card

## 🚀 Quick Start (3 Steps)

1. **Go to**: Admin Settings → Branch Isolation Debug
2. **Select**: A branch from the branch selector
3. **Click**: "Run Test" button

## 💻 Console Commands

```javascript
// Run full test
await window.testBranchIsolation()

// Enable debug logging
window.enableBranchDebug()

// Disable debug logging
window.disableBranchDebug()
```

## 📊 Reading Results

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ Green | Isolation working | None needed |
| ❌ Red | Isolation FAILED | Investigate immediately |
| ⚠️ Yellow | Warning (no data) | Add test data or ignore |

## 🎯 Expected Counts

### Isolated Mode
- Current Branch: > 0 (your data)
- Other Branches: **0** ← Must be zero!
- Total Visible: = Current Branch

### Shared Mode
- Current Branch: > 0 (your data)
- Other Branches: > 0 (others' data)
- Total Visible: = Sum of all

### Hybrid Mode
- Depends on individual feature settings
- Check each feature separately

## 🐛 Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Found items from other branches" | Isolation not working | Check `data_isolation_mode` setting |
| "No branch selected" | Branch not set | Select a branch in the navigation |
| Debug logs not showing | Mode not enabled | Click "Debug On" button |
| Wrong counts | Cache issue | Refresh page and re-test |

## 🔧 Debug Mode

**What it does:** Logs every database query with filtering info

**How to use:**
1. Click "Debug On" in the debug panel
2. Open browser console (F12)
3. Perform actions (view products, etc.)
4. See detailed logs in console

**Log format:**
```
🔍 QUERY DEBUG: products
   Isolation Mode: isolated
   Filtered by Branch: YES
   Branch ID: abc-123
```

## 📋 Quick Tests

### Test 1: Isolated Products
```
Settings: isolated mode + share_products = false
Add: 5 products to Branch A
Expected: Other Branches = 0
```

### Test 2: Shared Customers
```
Settings: hybrid mode + share_customers = true
Add: 3 customers in Branch A, 2 in Branch B
Expected: Total Visible = 5 (from both branches)
```

### Test 3: Hybrid Mix
```
Settings: hybrid mode
  - share_products = true
  - share_customers = false
Expected:
  - Products: See ALL products
  - Customers: See ONLY your branch
```

## 🎨 UI Features

| Button | Function |
|--------|----------|
| 🐛 Debug On/Off | Toggle query logging |
| 🔄 Auto-refresh On/Off | Test every 10 seconds |
| ▶️ Run Test | Manual test execution |

## 📈 Success Metrics

✅ **100% Pass Rate**: All features working correctly  
✅ **Zero Cross-Branch Items**: No data leaks  
✅ **Logs Show Filters**: Queries are being filtered  
✅ **Users Happy**: No reports of wrong data  

## 🆘 Emergency Checklist

If tests fail:

- [ ] Check branch is selected
- [ ] Verify isolation mode setting
- [ ] Check share_* flags (hybrid mode)
- [ ] Confirm data has branch_id values
- [ ] Re-run database migrations
- [ ] Clear cache and retry
- [ ] Check browser console for errors

## 🔗 Full Documentation

[📖 Complete Debug Guide](./BRANCH-ISOLATION-DEBUG-GUIDE.md)

---

**Pro Tip:** Keep this card open while configuring branch isolation settings!

