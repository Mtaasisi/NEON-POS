# 📖 HOW TO SWITCH BETWEEN STORES (ADMIN)

## 🎯 **Quick Answer**

As an admin, you can switch between stores using the **Branch Selector** in your top navigation bar!

---

## 🖼️ **Where to Find It**

After logging in as admin, look at the **top-right corner** of your screen:

```
┌─────────────────────────────────────────────────────────────┐
│  [Back] [Search...] [Create ▼]  [🏢 Main Store ▼] [🔔] [👤] │
└─────────────────────────────────────────────────────────────┘
                                      ↑
                              Branch Selector Here!
```

---

## 📋 **STEP-BY-STEP GUIDE**

### **Step 1: Click the Branch Selector**
Look for the building icon `🏢` with your current branch name

```
┌────────────────────┐
│ 🏢 Downtown Branch │
│ 📍 Arusha         │
│         ▼         │
└────────────────────┘
```

### **Step 2: Select a Branch**
A dropdown will appear showing all your branches:

```
┌───────────────────────────────────┐
│  Switch Branch                     │
├───────────────────────────────────┤
│ ✓ Downtown Branch                 │
│   🌐 Shared Data                   │
│   MAIN-001 • Arusha               │
├───────────────────────────────────┤
│ ○ Airport Branch                  │
│   ⚖️ Hybrid Model                  │
│   APT-001 • Arusha                │
├───────────────────────────────────┤
│ ○ Mall Branch                     │
│   🔒 Isolated Data                │
│   MALL-001 • Dar es Salaam        │
└───────────────────────────────────┘
```

### **Step 3: Click on Any Branch**
Click the branch you want to switch to. You'll see:
- ✅ Success toast notification
- The page will refresh to show data for that branch
- Branch selector updates to show current branch

---

## 🏪 **BRANCH INDICATORS**

Each branch shows different indicators:

### **🌐 Shared Data**
- All branches see the same data
- Products, customers, inventory unified

### **🔒 Isolated Data**
- Each branch completely separate
- No data sharing

### **⚖️ Hybrid Model**
- Custom configuration
- Some data shared, some isolated

### **⭐ Main**
- Headquarters/primary location badge

---

## 🎨 **WHAT HAPPENS WHEN YOU SWITCH?**

### **If Branch is in SHARED Mode:**
```
You switch to: Airport Branch (🌐 Shared)

What you see:
✓ All products (same as other branches)
✓ All customers (same as other branches)
✓ All inventory (unified stock)
✓ Sales filtered to Airport Branch
```

### **If Branch is in ISOLATED Mode:**
```
You switch to: Mall Branch (🔒 Isolated)

What you see:
✓ Only products created for Mall Branch
✓ Only customers registered at Mall Branch
✓ Only inventory for Mall Branch
✓ Only sales from Mall Branch
```

### **If Branch is in HYBRID Mode:**
```
You switch to: Airport Branch (⚖️ Hybrid)

Example Configuration:
- Share Products: ✓
- Share Customers: ✓
- Share Inventory: ✗

What you see:
✓ All products (shared catalog)
✓ All customers (shared database)
✓ Only Airport inventory (separate stock)
✓ Sales filtered to Airport Branch
```

---

## 🔧 **CONFIGURE BRANCHES**

### **To Add/Edit Branches:**
1. Go to **Settings** (in sidebar)
2. Click **Store Management**
3. Click **Add Store** or **Edit** existing
4. Choose data isolation mode
5. Configure sharing preferences
6. Save

---

## 📱 **MOBILE VIEW**

On mobile/tablet, the branch selector might be collapsed. Access it by:
1. Tap the **menu icon** (☰)
2. Branch selector appears in the sidebar or top area
3. Tap to switch branches

---

## 💡 **PRO TIPS**

### **Tip 1: Use Keyboard Shortcut (Coming Soon)**
Future update: Press `Ctrl+B` to open branch selector

### **Tip 2: Bookmarks**
You can bookmark specific branches:
```
/dashboard?branch=airport-branch-id
```

### **Tip 3: Recent Branches**
The system remembers your last selected branch and restores it on login

### **Tip 4: Quick Reports**
Switch branches to quickly see sales/inventory for different locations without filtering

---

## 🛡️ **PERMISSIONS**

### **Admin Users:**
- ✅ Can see ALL branches
- ✅ Can switch to ANY branch
- ✅ Can configure all branch settings
- ✅ Can view cross-branch reports

### **Non-Admin Users:**
- ⚠️ Can only see assigned branches
- ⚠️ Cannot switch if only one branch assigned
- ⚠️ Limited by branch permissions

---

## 🧪 **TEST IT NOW!**

### **1. Create Test Branches**
```
Go to: Settings → Store Management

Add 3 branches:
1. Main Store (Shared Mode)
2. Airport Branch (Hybrid Mode)
3. Mall Branch (Isolated Mode)
```

### **2. Test Switching**
```
1. Click branch selector in top bar
2. Switch to "Airport Branch"
3. Check products page - should see shared products
4. Switch to "Mall Branch"
5. Check products page - should see only Mall products
```

### **3. Test Data Isolation**
```
1. Go to Mall Branch (Isolated)
2. Create a product "Mall Exclusive Item"
3. Switch to Main Store
4. Product should NOT appear
5. Switch back to Mall Branch
6. Product should appear
```

---

## 📊 **CURRENT SETUP**

You currently have:
- **1 store:** Main Store (Arusha)
- **Mode:** Shared Data (default)
- **Ready to add more branches!**

---

## 🎯 **QUICK START CHECKLIST**

- [x] Database migrations completed
- [x] Branch Provider integrated
- [x] Branch Selector added to TopBar
- [ ] Add your first branch (Settings → Store Management)
- [ ] Choose data isolation mode
- [ ] Test switching between branches
- [ ] Configure sharing preferences
- [ ] Assign users to branches (optional)

---

## 📞 **NEED HELP?**

Check these files:
- `🏪-MULTI-BRANCH-ISOLATION-COMPLETE.md` - Complete guide
- `✨-BRANCH-ISOLATION-SUMMARY.md` - Quick reference

---

## 🎉 **YOU'RE ALL SET!**

The Branch Selector is now live in your top navigation bar!

**Look for:** `🏢 Main Store ▼` in the top-right corner

**Click it to** switch between your stores/branches instantly! 🚀✨

---

**Last Updated:** October 12, 2025  
**Status:** ✅ **READY TO USE**

