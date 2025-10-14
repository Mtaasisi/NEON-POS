# 🚀 QUICK GUIDE: Switch Between Stores

## 📍 **LOCATION**

The Branch Selector is in your **TOP-RIGHT CORNER**:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ☰  ←  [Search...]  [Create▼]  🏢 Main Store ▼  🔔  👤 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       ↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                   CLICK HERE TO SWITCH
```

---

## 🖱️ **HOW TO SWITCH** (3 Clicks!)

### **Click 1:** Click the Branch Selector
```
🏢 Main Store ▼
```

### **Click 2:** Dropdown Opens
```
┌─────────────────────────────────┐
│ Switch Branch                    │
├─────────────────────────────────┤
│ ✓ Main Store                    │
│   🌐 Shared Data • Arusha        │
├─────────────────────────────────┤
│ ○ Airport Branch                │
│   ⚖️ Hybrid Model • Arusha       │
├─────────────────────────────────┤
│ ○ Mall Branch                   │
│   🔒 Isolated • Dar es Salaam   │
└─────────────────────────────────┘
```

### **Click 3:** Click the branch you want
```
✅ Toast: "Switched to Airport Branch"
🔄 Page refreshes
📊 Data updates to show Airport Branch data
```

---

## ⚙️ **FIRST TIME SETUP**

### **Add Your First Additional Branch:**

1. **Open Settings**
   ```
   Sidebar → Settings → Store Management
   ```

2. **Click "Add Store"**
   ```
   Big blue button: "+ Add Store"
   ```

3. **Fill in Details:**
   ```
   Store Name: Airport Branch
   Code: APT-001
   Address: Airport Road, Arusha
   ```

4. **Choose Data Mode:**
   ```
   Click one of three cards:

   🌐 Shared      🔒 Isolated      ⚖️ Hybrid
   (All shared)   (All separate)   (Custom)
                                      ↑
                              RECOMMENDED!
   ```

5. **If Hybrid - Configure What to Share:**
   ```
   ☑ Products (same catalog)
   ☑ Customers (shared database)
   ☐ Inventory (separate stock) ← IMPORTANT!
   ☑ Suppliers
   ☑ Categories
   ☐ Employees
   ```

6. **Save Store**
   ```
   Click: "Save Store" button
   ```

7. **Now Use Branch Selector!**
   ```
   Top-right corner → 🏢 Select branch
   ```

---

## 🎯 **WHAT YOU SEE CHANGES**

When you switch branches, the following data changes based on your configuration:

### **Always Branch-Specific:**
- ✅ Sales reports
- ✅ Daily transactions
- ✅ Branch performance metrics

### **Depends on Sharing Settings:**
- 📦 **Products** - Shared or Branch-specific
- 👥 **Customers** - Shared or Branch-specific
- 📊 **Inventory** - Shared or Branch-specific
- 👤 **Employees** - Shared or Branch-specific

---

## 💻 **VISUAL EXAMPLE**

### **Before Switching:**
```
Current Branch: Main Store (Arusha)

Products Page:
- iPhone 15 (50 in stock)
- Samsung S24 (30 in stock)
- iPad Pro (20 in stock)

Sales Today: $5,420
```

### **After Switching to Airport Branch:**
```
Current Branch: Airport Branch

Products Page (if Hybrid - Shared Products):
- iPhone 15 (25 in stock) ← Different stock!
- Samsung S24 (15 in stock) ← Different stock!
- iPad Pro (10 in stock) ← Different stock!

Sales Today: $2,150 ← Different sales!
```

---

## ⌨️ **KEYBOARD SHORTCUTS** (Future)

| Shortcut | Action |
|----------|--------|
| `Ctrl + B` | Open branch selector |
| `Ctrl + 1` | Switch to first branch |
| `Ctrl + 2` | Switch to second branch |
| `Ctrl + 3` | Switch to third branch |

---

## 🔒 **PERMISSIONS**

### **Who Can Switch Branches?**

| Role | Can Switch? | Sees All Branches? |
|------|-------------|-------------------|
| **Admin** | ✅ Yes | ✅ All branches |
| **Manager** | ⚠️ Assigned only | ⚠️ Assigned branches only |
| **Customer Care** | ⚠️ Assigned only | ⚠️ Assigned branches only |
| **Technician** | ⚠️ Assigned only | ⚠️ Assigned branches only |

---

## 🐛 **TROUBLESHOOTING**

### **Problem: Don't see Branch Selector**
**Solution:**
- Make sure you're logged in as **admin**
- Check top-right corner (next to notifications bell)
- If on mobile, it might be in collapsed menu

### **Problem: Only one branch shows**
**Solution:**
- You need to add more branches
- Go to: Settings → Store Management → Add Store

### **Problem: Can't switch branches**
**Solution:**
- Make sure branches are **active**
- Check you have admin role
- Refresh the page

### **Problem: Data doesn't change after switching**
**Solution:**
- Check branch data isolation mode
- Verify sharing settings
- Clear browser cache
- Refresh the page

---

## 📱 **MOBILE INSTRUCTIONS**

On mobile devices:

1. Tap **☰ Menu** (top-left)
2. Look for **Branch Selector** near top
3. Tap current branch name
4. Select different branch from list
5. Tap to switch

---

## 🎯 **TESTING CHECKLIST**

Test your branch switching:

- [ ] Click branch selector in top bar
- [ ] See all your branches listed
- [ ] Click different branch
- [ ] See toast: "Switched to [Branch Name]"
- [ ] Verify data changes (products/sales)
- [ ] Switch back to original branch
- [ ] Data returns to original

---

## 🚀 **YOU'RE READY!**

**Current Location:** Top-right corner of your screen  
**Look For:** `🏢 [Your Branch Name] ▼`  
**Click:** To open dropdown  
**Select:** Any branch to switch instantly!

---

## 📞 **STILL CAN'T FIND IT?**

If you can't see the branch selector:

1. **Verify you're admin:**
   - Check top-right user menu
   - Should show "Admin" role

2. **Check screen size:**
   - On small screens, selector might be hidden
   - Try on desktop/laptop

3. **Verify database:**
   - Run: `SELECT * FROM store_locations;`
   - Should show at least one store

4. **Refresh page:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

---

**Happy branch switching! 🏪✨**

