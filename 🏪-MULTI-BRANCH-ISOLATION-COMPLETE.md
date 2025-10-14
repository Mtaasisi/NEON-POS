# 🏪 MULTI-BRANCH DATA ISOLATION - COMPLETE GUIDE

**Date:** October 12, 2025  
**Status:** ✅ **FULLY IMPLEMENTED**

---

## 🎯 **WHAT IS THIS?**

A comprehensive multi-branch management system that allows each branch/location to:
- Have its **own separate data** (products, customers, inventory)
- **Share data** across all branches
- Use a **hybrid model** (choose what to share)
- **Transfer stock** between branches
- Track **branch-specific** sales and operations

---

## 📦 **WHAT WAS ADDED**

### **1. Enhanced Store Management UI**
- 3 Data isolation modes: Shared, Isolated, Hybrid
- Granular control over what data to share
- Stock transfer configuration
- Auto-sync options
- Branch permissions

### **2. Database Schema**
- Added `branch_id` to all major tables
- New `branch_transfers` table for stock transfers
- New `user_branch_assignments` table
- New `branch_activity_log` for audit trail
- Helper functions for data access control

### **3. React Context & Components**
- `BranchContext` for state management
- `BranchSelector` component
- Hooks for branch-filtered queries

---

## 🗂️ **DATA ISOLATION MODES**

### **🌐 Shared Data Mode**
**Best for:** Single business with multiple locations

**How it works:**
- All branches see the **same data**
- Products, customers, inventory are unified
- Sales are tracked per branch
- Central management and reporting

**Example:**
```
Main Store (Downtown)
├── Products: All 500 products
├── Customers: All 1,000 customers
└── Inventory: Real-time unified stock

Branch A (Airport)
├── Products: Same 500 products
├── Customers: Same 1,000 customers
└── Inventory: Same unified stock
```

**Configuration:**
```javascript
data_isolation_mode: 'shared'
share_products: true
share_customers: true
share_inventory: true
share_suppliers: true
share_categories: true
share_employees: true
```

---

### **🔒 Isolated Data Mode**
**Best for:** Franchises, independent operations

**How it works:**
- Each branch has **completely separate data**
- No data mixing between branches
- Independent operations
- Branch autonomy

**Example:**
```
Branch A (Downtown)
├── Products: 300 products (unique to Branch A)
├── Customers: 500 customers (unique to Branch A)
└── Inventory: 1,200 items (Branch A only)

Branch B (Airport)
├── Products: 250 products (unique to Branch B)
├── Customers: 400 customers (unique to Branch B)
└── Inventory: 800 items (Branch B only)
```

**Configuration:**
```javascript
data_isolation_mode: 'isolated'
share_products: false
share_customers: false
share_inventory: false
share_suppliers: false
share_categories: false
share_employees: false
```

---

### **⚖️ Hybrid Mode** ⭐ **RECOMMENDED**
**Best for:** Most businesses

**How it works:**
- **Choose what to share** and what to isolate
- Share product catalog, but separate inventory
- Share customers, but track per-branch preferences
- Maximum flexibility

**Example:**
```
All Branches Share:
✓ Product Catalog (500 products)
✓ Customer Database (1,000 customers)
✓ Suppliers
✓ Categories

Each Branch Has Own:
✗ Inventory (tracked separately)
✗ Employees (branch-specific staff)
✗ Sales data (per-branch)
```

**Configuration:**
```javascript
data_isolation_mode: 'hybrid'
share_products: true      // ✓ Shared catalog
share_customers: true     // ✓ Shared customer base
share_inventory: false    // ✗ Separate inventory per branch
share_suppliers: true     // ✓ Shared suppliers
share_categories: true    // ✓ Shared categories
share_employees: false    // ✗ Branch-specific staff
```

---

## 🚀 **INSTALLATION STEPS**

### **Step 1: Run Database Migrations**

```bash
# 1. Create new settings tables (if not done already)
psql your-connection-string < CREATE-NEW-SETTINGS-TABLES.sql

# 2. Add branch isolation columns
psql your-connection-string < ADD-BRANCH-ISOLATION-COLUMNS.sql
```

Or in Supabase SQL Editor:
1. Copy contents of `CREATE-NEW-SETTINGS-TABLES.sql`
2. Run it
3. Copy contents of `ADD-BRANCH-ISOLATION-COLUMNS.sql`
4. Run it

---

### **Step 2: Verify Database Structure**

```sql
-- Check that branch columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lats_products' 
AND column_name IN ('branch_id', 'is_shared');

-- Should return:
-- branch_id  | uuid
-- is_shared  | boolean
```

---

### **Step 3: Integrate Branch Context**

Update your `App.tsx` or main layout:

```typescript
import { BranchProvider } from './context/BranchContext';

function App() {
  return (
    <AuthProvider>
      <BranchProvider>  {/* Add this */}
        {/* Your app content */}
      </BranchProvider>
    </AuthProvider>
  );
}
```

---

### **Step 4: Add Branch Selector**

Add to your TopBar or Header:

```typescript
import BranchSelector from '../components/BranchSelector';

const TopBar = () => {
  return (
    <div className="topbar">
      {/* Other content */}
      <BranchSelector />
    </div>
  );
};
```

---

## 📝 **HOW TO USE IN YOUR CODE**

### **1. Get Current Branch**

```typescript
import { useBranch } from '../context/BranchContext';

const MyComponent = () => {
  const { currentBranch, isDataShared } = useBranch();

  // Check if products are shared
  const productsAreShared = isDataShared('products');

  return (
    <div>
      <h2>Current Branch: {currentBranch?.name}</h2>
      <p>Products Mode: {productsAreShared ? 'Shared' : 'Branch-Specific'}</p>
    </div>
  );
};
```

---

### **2. Filter Queries by Branch**

#### **For Shared Data:**
```typescript
const { currentBranch, isDataShared } = useBranch();

// Load products
const loadProducts = async () => {
  let query = supabase.from('lats_products').select('*');

  // Only filter if products are NOT shared
  if (!isDataShared('products')) {
    query = query.or(`branch_id.eq.${currentBranch?.id},is_shared.eq.true`);
  }

  const { data, error } = await query;
  return data;
};
```

#### **For Branch-Specific Data (like sales):**
```typescript
const loadSales = async () => {
  const { data, error } = await supabase
    .from('lats_sales')
    .select('*')
    .eq('branch_id', currentBranch?.id)  // Always filter by branch
    .order('created_at', { ascending: false });

  return data;
};
```

---

### **3. Create Branch-Specific Records**

```typescript
// When creating a new product
const createProduct = async (productData) => {
  const { currentBranch, isDataShared } = useBranch();

  const newProduct = {
    ...productData,
    branch_id: isDataShared('products') ? null : currentBranch?.id,
    is_shared: isDataShared('products'),
    created_by: currentUser?.id
  };

  const { data, error } = await supabase
    .from('lats_products')
    .insert([newProduct]);

  return data;
};
```

---

### **4. Handle Stock Transfers**

```typescript
const transferStock = async (productId, fromBranchId, toBranchId, quantity) => {
  // Create transfer request
  const { data: transfer, error } = await supabase
    .from('branch_transfers')
    .insert({
      from_branch_id: fromBranchId,
      to_branch_id: toBranchId,
      transfer_type: 'stock',
      entity_type: 'product',
      entity_id: productId,
      quantity: quantity,
      status: 'pending',
      requested_by: currentUser?.id
    });

  return transfer;
};
```

---

## 🏗️ **DATABASE SCHEMA**

### **Modified Tables:**

```sql
-- Products
lats_products
├── branch_id (UUID)           -- Which branch owns this
├── is_shared (BOOLEAN)        -- Available to all branches?
└── ...existing columns

-- Customers
customers
├── branch_id (UUID)           -- Primary branch
├── is_shared (BOOLEAN)        -- Shared customer?
├── preferred_branch_id (UUID) -- Customer's preferred branch
└── ...existing columns

-- Sales
lats_sales
├── branch_id (UUID)           -- Which branch made the sale
└── ...existing columns

-- Inventory
lats_product_variants
├── branch_id (UUID)           -- Branch-specific stock
├── stock_per_branch (JSONB)   -- { "branch1": 50, "branch2": 30 }
└── ...existing columns
```

### **New Tables:**

```sql
-- Branch Transfers
branch_transfers
├── id (UUID)
├── from_branch_id (UUID)
├── to_branch_id (UUID)
├── transfer_type (TEXT)       -- 'stock', 'customer', 'product'
├── entity_type (TEXT)
├── entity_id (UUID)
├── quantity (INTEGER)
├── status (TEXT)              -- 'pending', 'approved', 'completed', etc.
├── requested_by (UUID)
├── approved_by (UUID)
├── notes (TEXT)
└── timestamps...

-- User Branch Assignments
user_branch_assignments
├── id (UUID)
├── user_id (UUID)
├── branch_id (UUID)
├── is_primary (BOOLEAN)       -- User's main branch
├── can_manage (BOOLEAN)
├── can_view_reports (BOOLEAN)
├── can_manage_inventory (BOOLEAN)
└── can_manage_staff (BOOLEAN)

-- Branch Activity Log
branch_activity_log
├── id (UUID)
├── branch_id (UUID)
├── user_id (UUID)
├── action_type (TEXT)
├── entity_type (TEXT)
├── entity_id (UUID)
├── description (TEXT)
├── metadata (JSONB)
└── created_at (TIMESTAMP)
```

---

## 🎨 **UI EXAMPLES**

### **Branch Selector in TopBar:**
```
┌─────────────────────────────────────────┐
│  [🏢 Downtown Branch ▼]   [Profile] [⚙️] │
└─────────────────────────────────────────┘

On Click:
┌──────────────────────────────────┐
│ Switch Branch                     │
├──────────────────────────────────┤
│ ✓ Downtown Branch                │
│   🌐 Shared Data                  │
│   MAIN • Arusha                  │
├──────────────────────────────────┤
│ ○ Airport Branch                 │
│   ⚖️ Hybrid Model                 │
│   CODE-002 • Arusha              │
├──────────────────────────────────┤
│ ○ Mall Branch                    │
│   🔒 Isolated Data               │
│   CODE-003 • Dar es Salaam       │
└──────────────────────────────────┘
```

---

### **Store Management Configuration:**
```
Data Isolation Model

┌────────────┐  ┌────────────┐  ┌────────────┐
│ 🌐 Shared  │  │ 🔒 Isolated│  │ ⚖️ Hybrid  │
│            │  │            │  │            │
│ All data   │  │ Separate   │  │ Choose     │
│ shared     │  │ per branch │  │ what to    │
│            │  │            │  │ share      │
└────────────┘  └────────────┘  └────────────┘

If Hybrid Selected:

Configure What to Share:
☑ Products & Catalog
☑ Customers
☐ Inventory (each branch has own stock)
☑ Suppliers
☑ Categories
☐ Employees (branch-specific staff)
```

---

## 💡 **USE CASES**

### **Use Case 1: Retail Chain (Hybrid)**
```
🎯 Goal: Share products but separate inventory

Configuration:
- Mode: Hybrid
- Share Products: ✓ (Same catalog everywhere)
- Share Customers: ✓ (Loyalty across branches)
- Share Inventory: ✗ (Each branch tracks own stock)

Result:
- Customer shops at Branch A today, Branch B tomorrow
- Each branch manages their own stock levels
- Unified product catalog and pricing
```

---

### **Use Case 2: Franchise (Isolated)**
```
🎯 Goal: Complete independence

Configuration:
- Mode: Isolated
- All Sharing: ✗

Result:
- Each franchise is completely separate
- No data mixing
- Independent operations
- Separate reporting
```

---

### **Use Case 3: Service Center (Shared)**
```
🎯 Goal: One unified system

Configuration:
- Mode: Shared
- All Sharing: ✓

Result:
- All branches see all data
- Unified inventory
- Seamless transfers
- Consolidated reporting
```

---

## 🔄 **STOCK TRANSFER WORKFLOW**

### **Step 1: Request Transfer**
```
Branch A needs 10 units of iPhone 15
Branch B has 50 units in stock

Action: Create transfer request
Status: Pending
```

### **Step 2: Approval (if required)**
```
Manager at Branch B reviews request
Decision: Approve or Reject
Status: Approved
```

### **Step 3: Fulfillment**
```
Branch B ships items
Status: In Transit
```

### **Step 4: Completion**
```
Branch A receives items
Inventory automatically updated:
- Branch B: -10 units
- Branch A: +10 units
Status: Completed
```

---

## 📊 **REPORTING & ANALYTICS**

### **Per-Branch Reports:**
```sql
-- Sales by branch
SELECT 
  sl.name as branch_name,
  COUNT(ls.id) as total_sales,
  SUM(ls.total_amount) as revenue
FROM lats_sales ls
JOIN store_locations sl ON ls.branch_id = sl.id
WHERE ls.created_at >= NOW() - INTERVAL '30 days'
GROUP BY sl.id, sl.name;
```

### **Inventory by Branch:**
```sql
-- Current stock per branch
SELECT 
  sl.name as branch_name,
  p.name as product_name,
  pv.quantity as stock_level
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
JOIN store_locations sl ON pv.branch_id = sl.id
WHERE pv.quantity > 0
ORDER BY sl.name, p.name;
```

### **Transfer Activity:**
```sql
-- Recent transfers
SELECT 
  bt.*,
  from_branch.name as from_branch_name,
  to_branch.name as to_branch_name
FROM branch_transfers bt
JOIN store_locations from_branch ON bt.from_branch_id = from_branch.id
JOIN store_locations to_branch ON bt.to_branch_id = to_branch.id
WHERE bt.created_at >= NOW() - INTERVAL '7 days'
ORDER BY bt.created_at DESC;
```

---

## ⚙️ **CONFIGURATION GUIDE**

### **1. Create Stores**
```
Admin Settings → Store Management → Add Store

Store 1 (Main):
- Name: Downtown Branch
- Code: MAIN-001
- Mode: Shared Data
- Is Main: ✓

Store 2:
- Name: Airport Branch  
- Code: CODE-002
- Mode: Hybrid
- Share Products: ✓
- Share Customers: ✓
- Share Inventory: ✗
```

### **2. Assign Users to Branches**
```sql
INSERT INTO user_branch_assignments (user_id, branch_id, is_primary, can_manage)
VALUES 
  ('user-id-1', 'downtown-branch-id', true, true),
  ('user-id-2', 'airport-branch-id', true, false);
```

### **3. Configure Permissions**
```
Branch Settings:
- Can View Other Branches: ✗ (staff can only see their branch)
- Allow Stock Transfers: ✓
- Require Approval: ✓
- Auto-Sync Products: ✓
```

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Products not showing**
**Solution:**
1. Check data isolation mode
2. Verify `is_shared` flag on products
3. Ensure user is assigned to branch
4. Check query includes branch filter

### **Issue: Cannot transfer stock**
**Solution:**
1. Verify `allow_stock_transfer` is enabled
2. Check user has permissions
3. Ensure both branches are active
4. Verify stock is available in source branch

### **Issue: User can't see their branch**
**Solution:**
1. Check `user_branch_assignments` table
2. Verify user has at least one assignment
3. Check branch is active
4. Admin users should see all branches

---

## 🎉 **SUCCESS!**

You now have a **professional multi-branch system** with:
- ✅ Flexible data isolation (Shared/Isolated/Hybrid)
- ✅ Granular control over data sharing
- ✅ Stock transfer management
- ✅ Branch-specific operations
- ✅ Comprehensive audit trail
- ✅ User-branch assignments
- ✅ Role-based access control

**Your POS system can now handle:**
- Multiple locations ✓
- Franchises ✓
- Retail chains ✓
- Service centers ✓
- Independent branches ✓

---

**Enjoy your multi-branch POS system!** 🚀✨

