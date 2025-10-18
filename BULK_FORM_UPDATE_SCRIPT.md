# 🚀 Bulk Form Update Script - CBM Calculator Style

## ✅ Already Updated Forms

1. **EmployeeForm.tsx** ✅
2. **AttendanceModal.tsx** ✅
3. **CreateUserModal.tsx** ✅

---

## 📋 Remaining Forms to Update (82 total)

### **High Priority (User-facing)**
- [ ] AddCustomerModal.tsx
- [ ] CustomerForm.tsx
- [ ] EditUserModal.tsx  
- [ ] StoreLocationForm.tsx
- [ ] AppointmentModal.tsx
- [ ] QuickExpenseModal.tsx

### **Medium Priority (Admin/Settings)**
- [ ] All settings forms
- [ ] All device forms
- [ ] All product forms
- [ ] All inventory forms

### **Low Priority (Specialized)**
- [ ] Diagnostic forms
- [ ] Report modals
- [ ] Analytics modals

---

## 🔧 Automated Find & Replace Patterns

### **IMPORTANT: Do these in order!**

### **Step 1: Update Modal Container**

**Find:**
```tsx
<div className="fixed inset-0.*?z-50.*?bg-black.*?backdrop-blur
```
(Use regex mode)

**Replace with:**
```tsx
<div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50"
```

---

**Find:**
```tsx
<GlassCard.*?className="(.*?)max-w-\[?\d*\]?\w*\s*w-full
```

**Replace with:**
```tsx
<div className="bg-white rounded-lg shadow-xl $1max-w-$2 w-full max-h-[90vh] overflow-y-auto"
```

---

**Close tags - Find:**
```tsx
</GlassCard>
```

**Replace with:**
```tsx
</div>
```

---

### **Step 2: Update Header Structure**

**Find:**
```tsx
<div className="flex items-center gap-3">
  <div className="p-2 bg-(\w+)-100 rounded-lg">
    <(\w+) className="w-6 h-6 text-(\w+)-600" />
  </div>
  <div>
    <h2 className="text-xl font-semibold text-gray-900">
```

**Replace with:**
```tsx
<div className="flex items-center gap-3">
  <div className="w-10 h-10 bg-$1-100 rounded-lg flex items-center justify-center">
    <$2 className="w-5 h-5 text-$3-600" />
  </div>
  <div>
    <h3 className="text-xl font-bold text-gray-900">
```

---

**Find (subtitle):**
```tsx
<p className="text-sm text-gray-500">
```

**Replace with:**
```tsx
<p className="text-xs text-gray-500">
```

---

**Find (close button):**
```tsx
<GlassButton
  variant="ghost"
  (.*?)onClick={(.*?)}
  icon={<X size={20} />}
/>
```

**Replace with:**
```tsx
<button
  type="button"
  onClick=$2
  className="text-gray-400 hover:text-gray-600 transition-colors"
>
  <X className="w-6 h-6" />
</button>
```

---

### **Step 3: Update Input Fields**

**Find:**
```
className="(.*?)px-3 py-2 border rounded-lg focus:ring-2 focus:ring-(\w+)-500 focus:border-transparent(.*?)"
```

**Replace with:**
```
className="$1px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors$3"
```

---

**Find:**
```
border-gray-300
```

**Replace with:**
```
border-gray-200
```

---

**Find:**
```
focus:border-transparent
```

**Replace with:**
```
focus:border-blue-500
```

---

### **Step 4: Update Buttons**

**Find (Cancel button):**
```tsx
<GlassButton
  type="button"
  variant="ghost"
  onClick={(.*?)}
>
  Cancel
</GlassButton>
```

**Replace with:**
```tsx
<button
  type="button"
  onClick=$1
  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
>
  Cancel
</button>
```

---

**Find (Submit button):**
```tsx
<GlassButton
  type="submit"
  (.*?)
  icon={<(\w+) size={18} />}
>
  (.*?)
</GlassButton>
```

**Replace with:**
```tsx
<button
  type="submit"
  $1
  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
>
  $3
</button>
```

---

**Find (Action button groups):**
```tsx
<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
```

**Replace with:**
```tsx
<div className="flex gap-3 mt-6">
```

---

### **Step 5: Clean Up Imports**

**Find:**
```tsx
import GlassCard from.*?;
```

**Replace with:**
```
(delete line)
```

---

**Find:**
```tsx
import GlassButton from.*?;
```

**Replace with:**
```
(delete line)
```

---

**Find (in lucide imports):**
```tsx
, Save,
```

**Replace with:**
```
(remove if not used elsewhere)
```

---

## 📝 Manual Steps (For Complex Forms)

For forms that use `react-hook-form` or complex validation:

1. **Update modal container**
   ```tsx
   // OLD
   <div className="fixed inset-0 z-50 ... backdrop-blur-sm">
     <GlassCard className="max-w-2xl ...">
   
   // NEW
   <div className="fixed inset-0 z-[99999] ... bg-black/50">
     <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
   ```

2. **Add padding to form**
   ```tsx
   // OLD
   <form onSubmit={...} className="space-y-6">
   
   // NEW
   <form onSubmit={...} className="p-6 space-y-6">
   ```

3. **Update header**
   ```tsx
   <div className="flex items-center justify-between mb-6">
     <div className="flex items-center gap-3">
       <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
         <Icon className="w-5 h-5 text-blue-600" />
       </div>
       <div>
         <h3 className="text-xl font-bold text-gray-900">Title</h3>
         <p className="text-xs text-gray-500">Subtitle</p>
       </div>
     </div>
     <button
       type="button"
       onClick={onClose}
       className="text-gray-400 hover:text-gray-600 transition-colors"
     >
       <X className="w-6 h-6" />
     </button>
   </div>
   ```

4. **Update buttons**
   ```tsx
   <div className="flex gap-3 mt-6">
     <button
       type="button"
       onClick={onCancel}
       className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
     >
       Cancel
     </button>
     <button
       type="submit"
       disabled={loading}
       className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
     >
       {loading ? 'Saving...' : 'Save'}
     </button>
   </div>
   ```

---

## 🎯 VS Code Multi-File Find & Replace

### **How to Update All Forms at Once**

1. **Open VS Code**
2. **Press Ctrl+Shift+H** (Cmd+Shift+H on Mac)
3. **Enable Regex** (.*) button
4. **Use "files to include"**: `**/*Modal.tsx, **/*Form.tsx`

### **Search Pattern 1: GlassCard to div**

**Find:**
```
<GlassCard\s+className="([^"]*)"
```

**Replace:**
```
<div className="bg-white rounded-lg shadow-xl $1"
```

### **Search Pattern 2: Remove GlassCard imports**

**Find:**
```
import GlassCard from ['"](.*?)['"];?\n
```

**Replace:**
```
(empty - delete)
```

### **Search Pattern 3: GlassButton to button (simple)**

**Find:**
```
<GlassButton([^>]*?)>
```

**Replace:**
```
<button$1 className="px-4 py-3 rounded-lg font-medium transition-colors">
```

### **Search Pattern 4: Update inputs**

**Find:**
```
px-3 py-2 border rounded-lg
```

**Replace:**
```
px-4 py-3 border-2 rounded-lg
```

---

## 📊 Verification Checklist

After updating each form, verify:

- [ ] Modal opens and closes properly
- [ ] Header has icon in 10x10 box
- [ ] All inputs have `px-4 py-3`
- [ ] All inputs have `border-2 border-gray-200`
- [ ] Focus states work (border turns blue)
- [ ] Buttons are equal width (`flex-1`)
- [ ] Cancel button has gray border
- [ ] Submit button is blue/green
- [ ] Hover effects work
- [ ] No GlassCard imports
- [ ] No GlassButton imports (unless used elsewhere)
- [ ] No linter errors
- [ ] Form submits correctly
- [ ] Error states still work

---

## 🎨 Color Guide for Submit Buttons

Choose button color based on action:

```tsx
// Blue - General save/submit
className="... bg-blue-600 hover:bg-blue-700 ..."

// Green - Create/Add/Success
className="... bg-green-600 hover:bg-green-700 ..."

// Red - Delete/Remove/Danger
className="... bg-red-600 hover:bg-red-700 ..."

// Orange - Update/Modify
className="... bg-orange-600 hover:bg-orange-700 ..."

// Purple - Special actions
className="... bg-purple-600 hover:bg-purple-700 ..."
```

---

## 📁 Files Updated So Far

### ✅ Completed
1. `/src/features/employees/components/EmployeeForm.tsx`
2. `/src/features/employees/components/AttendanceModal.tsx`
3. `/src/features/users/components/CreateUserModal.tsx`

### 🔄 In Progress
- (none)

### ⏳ Pending (Top Priority)
4. `/src/features/customers/components/forms/AddCustomerModal.tsx`
5. `/src/features/users/components/EditUserModal.tsx`
6. `/src/features/settings/components/StoreLocationForm.tsx`
7. `/src/components/QuickExpenseModal.tsx`
8. `/src/features/customers/components/forms/AppointmentModal.tsx`
9. `/src/features/devices/components/forms/AssignTechnicianForm.tsx`
10. `/src/features/devices/components/forms/StatusUpdateForm.tsx`

---

## 🚀 Quick Script (Node.js)

For developers who want to automate this:

```javascript
const fs = require('fs');
const glob = require('glob');

// Find all forms
const files = glob.sync('src/**/*{Modal,Form}.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace GlassCard
  content = content.replace(
    /<GlassCard\s+className="([^"]*)"/g,
    '<div className="bg-white rounded-lg shadow-xl $1"'
  );
  
  // Replace closing GlassCard
  content = content.replace(/<\/GlassCard>/g, '</div>');
  
  // Update inputs
  content = content.replace(
    /px-3 py-2 border rounded-lg/g,
    'px-4 py-3 border-2 rounded-lg'
  );
  
  // Replace border color
  content = content.replace(/border-gray-300/g, 'border-gray-200');
  
  // Remove imports
  content = content.replace(/import GlassCard from.*?;\n/g, '');
  
  fs.writeFileSync(file, content);
  console.log(`✅ Updated: ${file}`);
});
```

---

## 💡 Tips

1. **Test After Each Update** - Don't update all at once
2. **Commit Often** - Make small commits for each form
3. **Check Linter** - Run linter after each update
4. **Test Submit** - Ensure forms still submit correctly
5. **Check Errors** - Verify error states still display
6. **Mobile Test** - Check responsive behavior
7. **Use Find All** - VS Code's find all references is helpful
8. **Backup First** - Commit current state before bulk changes

---

## 📈 Progress Tracker

**Total Forms:** 82
**Updated:** 3 (3.7%)
**Remaining:** 79 (96.3%)

---

## 🎯 Next Steps

1. Update top 10 priority forms manually
2. Test each thoroughly
3. Run automated script on remaining forms
4. Fix any edge cases
5. Final testing pass
6. Document any issues

---

**Let's update all forms to CBM Calculator style!** 🚀

---

Made with ❤️ for consistent, beautiful UI across the entire app!

