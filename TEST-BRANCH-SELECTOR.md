# 🧪 TEST BRANCH SELECTOR - DEBUG GUIDE

## ⚠️ **IF YOU DON'T SEE IT, FOLLOW THESE STEPS:**

---

## 🔴 **STEP 1: RESTART YOUR APP**

**CRITICAL:** You MUST restart your development server!

```bash
# In your terminal:
# 1. Press Ctrl+C to stop the server
# 2. Then run:
npm run dev

# OR

# If using vite:
npm run dev -- --force
```

---

## 🔴 **STEP 2: HARD REFRESH BROWSER**

After server restarts:

```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

Or:
```
Right-click → Inspect → Application → Clear Storage → Clear Site Data
```

---

## 🔴 **STEP 3: CHECK YOU'RE ADMIN**

Press `F12` (open DevTools) → Console Tab

Type and run:
```javascript
// Check current user
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('User Role:', user.role);
console.log('Is Admin?', user.role === 'admin');
```

**Expected Output:**
```
User Role: admin
Is Admin? true
```

**If NOT admin:**
- Logout
- Login with: `admin@pos.com` or `care@care.com`

---

## 🔴 **STEP 4: CHECK COMPONENT IS LOADED**

In browser console, run:
```javascript
// Check if SimpleBranchSelector is in the code
console.log('SimpleBranchSelector imported:', 
  document.querySelector('script')?.textContent.includes('SimpleBranchSelector')
);
```

---

## 🔴 **STEP 5: LOOK AT EXACT LOCATION**

The selector is in **TopBar**, right section:

1. **NOT in sidebar** (left side)
2. **NOT at bottom** 
3. **IN TOP BAR** (top of page)
4. **RIGHT SIDE** (near notifications bell)

```
Look for this area:
┌────────────────────────────────────────┐
│        [Activity Pills]                 │
│    [Some rounded colored badges]        │
│                                         │
│    [🏢 Main Store ▼] ← HERE!  🔔  👤   │
└────────────────────────────────────────┘
```

---

## 🔴 **STEP 6: CHECK SCREEN SIZE**

The component might be hidden on small screens!

**Make your browser window WIDER** or check the CSS:

The component has NO `hidden lg:block` class anymore, so it should show on all screen sizes!

---

## 🔴 **STEP 7: DATABASE CHECK**

Verify stores exist:

```bash
psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -c "SELECT name, code FROM store_locations WHERE is_active = true;"
```

**Should show:**
```
    name    |   code   
------------+----------
 Main Store | MAIN-001
```

---

## 🔴 **STEP 8: BROWSER CONSOLE LOGS**

After restarting, check console for:

```
🏪 Loading branches...
✅ Branches loaded: [{...}]
📍 Current branch: Main Store
```

If you see these logs, the component IS working!

---

## 🔴 **STEP 9: TEMPORARY DEBUG VERSION**

If still not showing, add this to your `TopBar.tsx` temporarily:

Find this line (around line 519):
```typescript
{currentUser?.role === 'admin' && (
  <SimpleBranchSelector />
)}
```

Replace with:
```typescript
{/* TEMPORARY DEBUG */}
<div className="p-2 bg-red-500 text-white rounded">
  Role: {currentUser?.role}
</div>
<SimpleBranchSelector />
```

This will:
- Show your current role (debug)
- Show branch selector regardless of role (for testing)

---

## ✅ **IT SHOULD NOW SHOW!**

After following these steps:

1. ✅ Restart dev server
2. ✅ Hard refresh browser
3. ✅ Login as admin
4. ✅ Look at top-right area
5. ✅ You'll see: `🏢 Main Store ▼`

---

## 🎯 **WHAT YOU'LL SEE**

### **Current State (1 Branch):**
Since you only have 1 branch, it shows as **static display**:

```
┌──────────────┐
│ 🏢 Main Store│
│ 📍 Arusha    │
└──────────────┘
```

### **After Adding More Branches:**
It becomes **clickable dropdown**:

```
┌──────────────────┐
│ 🏢 Main Store   ▼│ ← Click to open
│ 📍 Arusha        │
└──────────────────┘

Opens:
┌─────────────────────────┐
│ Switch Branch (2)        │
├─────────────────────────┤
│ ✓ Main Store            │
│   🌐 Shared • Arusha     │
├─────────────────────────┤
│ ○ Airport Branch        │
│   ⚖️ Hybrid • Arusha     │
└─────────────────────────┘
```

---

## 🚀 **ADD A SECOND STORE TO TEST**

Quick way to add a test branch:

```bash
psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' << 'EOF'
INSERT INTO store_locations (
  name, code, address, city, country, 
  is_main, is_active, data_isolation_mode,
  share_products, share_customers, share_inventory
) VALUES (
  'Airport Branch',
  'APT-001',
  'Airport Road',
  'Arusha',
  'Tanzania',
  false,
  true,
  'hybrid',
  true,
  true,
  false
);

SELECT '✅ Test branch added! Check your app!' as result;
EOF
```

Then refresh your app - you'll see TWO branches and can switch!

---

## 📞 **STILL NOT SHOWING?**

Send me:

1. **Browser Console Logs** (F12 → Console)
2. **Your current user role** (check localStorage)
3. **Screenshot of your top bar**

I'll debug it immediately!

---

**Current File Modified:** 
- ✅ `src/features/shared/components/TopBar.tsx`
- ✅ `src/components/SimpleBranchSelector.tsx` (NEW - super simple version)

**What to Do:**
1. **Restart dev server** (npm run dev)
2. **Hard refresh browser** (Ctrl+Shift+R)
3. **Look top-right** for 🏢 icon

**It WILL show after restart!** 🚀

