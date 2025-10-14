# 🎯 Flexible Branch Control - Admin Guide

## ✨ What You Now Have

**Admin can now choose which branches see each item!**

Three modes available:
- 🔒 **Isolated** - Only owner branch sees it
- 🌐 **Shared** - All branches see it
- 👥 **Custom** - Specific branches see it

---

## 📋 Quick Setup

### **Step 1: Run SQL Migration**

Open **Neon SQL Editor** and run:
```
FLEXIBLE-BRANCH-CONTROL.sql
```

This adds:
- ✅ `visible_to_branches` column (array of branch IDs)
- ✅ `sharing_mode` column (isolated/shared/custom)
- ✅ Helper functions for visibility checks

---

### **Step 2: Refresh Browser**

Hard refresh: **Ctrl+Shift+R** (or **Cmd+Shift+R**)

---

## 🎮 How to Use

### **Option 1: Per-Item Control (Manual)**

#### **Make a Product Visible to Multiple Branches:**

```sql
-- Share "iPhone 16 Pro" to Main Store and ARUSHA
UPDATE lats_products
SET 
  sharing_mode = 'custom',
  visible_to_branches = ARRAY[
    (SELECT id FROM store_locations WHERE name = 'Main Store'),
    (SELECT id FROM store_locations WHERE name = 'ARUSHA')
  ]
WHERE name = 'iPhone 16 Pro';
```

#### **Make a Product Shared to ALL Branches:**

```sql
-- Share "MacBook Pro" to all branches
UPDATE lats_products
SET 
  sharing_mode = 'shared',
  visible_to_branches = (
    SELECT ARRAY_AGG(id) FROM store_locations WHERE is_active = true
  )
WHERE name = 'MacBook Pro';
```

#### **Make a Product Isolated (Owner Branch Only):**

```sql
-- Isolate "ARUSHA Special Item"
UPDATE lats_products
SET 
  sharing_mode = 'isolated',
  visible_to_branches = ARRAY[branch_id]
WHERE name = 'ARUSHA Special Item';
```

---

### **Option 2: Bulk Control (Category-Based)**

#### **Share All Electronics to All Branches:**

```sql
-- Share all products in Electronics category
UPDATE lats_products
SET 
  sharing_mode = 'shared',
  visible_to_branches = (
    SELECT ARRAY_AGG(id) FROM store_locations WHERE is_active = true
  ),
  is_shared = true
WHERE category_id = (SELECT id FROM lats_categories WHERE name = 'Electronics');
```

#### **Isolate All Repair Parts:**

```sql
-- Keep all repair parts isolated to owner branches
UPDATE lats_products
SET 
  sharing_mode = 'isolated',
  visible_to_branches = ARRAY[branch_id],
  is_shared = false
WHERE category_id = (SELECT id FROM lats_categories WHERE name = 'Repair Parts');
```

---

### **Option 3: Using the UI Component**

The `BranchVisibilityManager` component can be added to:
- Product Edit Page
- Customer Edit Page
- Admin Settings

**Example Usage:**

```typescript
import BranchVisibilityManager from '../components/BranchVisibilityManager';

// In your product edit form:
<BranchVisibilityManager
  itemId={product.id}
  itemType="product"
  currentBranchId={product.branch_id}
  currentSharingMode={product.sharing_mode}
  currentVisibleBranches={product.visible_to_branches}
  onUpdate={() => {
    // Reload product data
    loadProduct();
  }}
/>
```

---

## 📊 Sharing Mode Explained

### **🔒 Isolated Mode**
**Use for:** Branch-specific items that shouldn't be visible elsewhere

**Example:**
- ARUSHA has local supplier products
- Airport Branch has duty-free items
- Main Store has wholesale items

**SQL:**
```sql
sharing_mode = 'isolated'
visible_to_branches = ARRAY[owner_branch_id]
```

---

### **🌐 Shared Mode**
**Use for:** Common items all branches need

**Example:**
- Popular phones (iPhone, Samsung)
- Common accessories (chargers, cables)
- Shared categories

**SQL:**
```sql
sharing_mode = 'shared'
visible_to_branches = ARRAY[all_branch_ids]
is_shared = true
```

---

### **👥 Custom Mode**
**Use for:** Selective sharing between specific branches

**Example:**
- Main Store + ARUSHA share laptops
- Airport Branch + Main Store share tablets
- ARUSHA + Airport Branch share accessories

**SQL:**
```sql
sharing_mode = 'custom'
visible_to_branches = ARRAY[branch1_id, branch2_id]
```

---

## 🎯 Common Scenarios

### **Scenario 1: New Product - Share to All**

```sql
-- Create product and make visible to all branches
INSERT INTO lats_products (
  name, category_id, branch_id, sharing_mode, visible_to_branches, is_shared
) VALUES (
  'iPhone 15 Pro Max',
  (SELECT id FROM lats_categories WHERE name = 'Phones'),
  (SELECT id FROM store_locations WHERE is_main = true),
  'shared',
  (SELECT ARRAY_AGG(id) FROM store_locations WHERE is_active = true),
  true
);
```

---

### **Scenario 2: Branch-Specific Promotion**

```sql
-- ARUSHA has special promo items - keep isolated
UPDATE lats_products
SET 
  sharing_mode = 'isolated',
  visible_to_branches = ARRAY[(SELECT id FROM store_locations WHERE name = 'ARUSHA')]
WHERE name LIKE '%ARUSHA PROMO%';
```

---

### **Scenario 3: Share Between 2 Specific Branches**

```sql
-- Share premium laptops between Main Store and Airport Branch only
UPDATE lats_products
SET 
  sharing_mode = 'custom',
  visible_to_branches = ARRAY[
    (SELECT id FROM store_locations WHERE name = 'Main Store'),
    (SELECT id FROM store_locations WHERE name = 'Airport Branch')
  ]
WHERE category_id = (SELECT id FROM lats_categories WHERE name = 'Premium Laptops');
```

---

## 🔍 Querying Visible Items

### **Check What ARUSHA Can See:**

```sql
SELECT 
  p.name,
  p.sharing_mode,
  (SELECT name FROM store_locations WHERE id = p.branch_id) as owner_branch,
  ARRAY(
    SELECT name FROM store_locations WHERE id = ANY(p.visible_to_branches)
  ) as visible_to
FROM lats_products p
WHERE 
  p.sharing_mode = 'shared'
  OR p.branch_id = (SELECT id FROM store_locations WHERE name = 'ARUSHA')
  OR (SELECT id FROM store_locations WHERE name = 'ARUSHA') = ANY(p.visible_to_branches);
```

---

### **Find All Shared Products:**

```sql
SELECT name, sharing_mode, is_shared
FROM lats_products
WHERE sharing_mode = 'shared'
ORDER BY name;
```

---

### **Find All Isolated Products:**

```sql
SELECT 
  p.name,
  (SELECT name FROM store_locations WHERE id = p.branch_id) as owner_branch,
  p.sharing_mode
FROM lats_products p
WHERE p.sharing_mode = 'isolated'
ORDER BY owner_branch, name;
```

---

## 🎨 UI Integration

### **Add to Product Edit Page:**

```typescript
// src/features/lats/pages/EditProductPage.tsx

import BranchVisibilityManager from '../../../components/BranchVisibilityManager';

// In the form, add a new section:
<div className="bg-white rounded-lg shadow-sm p-6">
  <h2 className="text-lg font-semibold mb-4">Branch Visibility</h2>
  <BranchVisibilityManager
    itemId={productId}
    itemType="product"
    currentBranchId={product?.branch_id}
    currentSharingMode={product?.sharing_mode}
    currentVisibleBranches={product?.visible_to_branches}
    onUpdate={handleProductUpdate}
  />
</div>
```

---

### **Add to Admin Settings:**

Create a new settings page: **Admin → Settings → Branch Management**

Features:
- Bulk update sharing mode
- View distribution of sharing modes
- Manage branch-specific data

---

## 📊 Monitoring & Reports

### **Check Sharing Distribution:**

```sql
SELECT 
  sharing_mode,
  COUNT(*) as product_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM lats_products), 2) as percentage
FROM lats_products
GROUP BY sharing_mode;
```

**Expected Output:**
```
sharing_mode | product_count | percentage
-------------|---------------|------------
isolated     | 50            | 50.00
shared       | 30            | 30.00
custom       | 20            | 20.00
```

---

### **Products by Branch:**

```sql
SELECT 
  sl.name as branch_name,
  COUNT(*) as total_visible_products
FROM store_locations sl
CROSS JOIN lats_products p
WHERE 
  p.sharing_mode = 'shared'
  OR p.branch_id = sl.id
  OR sl.id = ANY(p.visible_to_branches)
GROUP BY sl.id, sl.name
ORDER BY total_visible_products DESC;
```

---

## 🐛 Troubleshooting

### **Issue: Product not appearing in branch**

**Check visibility settings:**
```sql
SELECT 
  name,
  sharing_mode,
  branch_id,
  visible_to_branches,
  CASE 
    WHEN sharing_mode = 'shared' THEN 'Visible to all'
    WHEN sharing_mode = 'isolated' THEN 'Only owner branch'
    WHEN sharing_mode = 'custom' THEN 'Custom branches'
  END as visibility_status
FROM lats_products
WHERE name = 'YOUR_PRODUCT_NAME';
```

**Fix:**
```sql
-- Make it visible to specific branch
UPDATE lats_products
SET 
  sharing_mode = 'custom',
  visible_to_branches = visible_to_branches || ARRAY[(SELECT id FROM store_locations WHERE name = 'ARUSHA')]
WHERE name = 'YOUR_PRODUCT_NAME';
```

---

### **Issue: Too many branches see a product**

**Solution: Switch to isolated:**
```sql
UPDATE lats_products
SET 
  sharing_mode = 'isolated',
  visible_to_branches = ARRAY[branch_id]
WHERE name = 'YOUR_PRODUCT_NAME';
```

---

## ✅ Best Practices

### **1. Default to Isolated**
New products default to isolated mode. Admin must explicitly share them.

### **2. Use Shared Mode for Common Items**
Popular products (iPhones, Samsung, etc.) should be shared to all branches.

### **3. Use Custom Mode for Partnerships**
If two branches share inventory, use custom mode.

### **4. Regular Audits**
Periodically review sharing settings:
```sql
-- Find products with no visibility
SELECT * FROM lats_products 
WHERE visible_to_branches IS NULL OR ARRAY_LENGTH(visible_to_branches, 1) = 0;
```

### **5. Document Decisions**
Keep notes on why items are shared/isolated in the `notes` field.

---

## 🎉 Summary

**You now have complete control over branch visibility!**

**Three simple modes:**
- 🔒 **Isolated** - Private to one branch
- 🌐 **Shared** - Visible to all branches
- 👥 **Custom** - Visible to selected branches

**Admin can:**
- ✅ Control visibility per-item or in bulk
- ✅ Share common items to all branches
- ✅ Keep branch-specific items private
- ✅ Create partnerships between branches
- ✅ Change sharing settings anytime

**Perfect flexibility for your multi-branch business!** 🚀

