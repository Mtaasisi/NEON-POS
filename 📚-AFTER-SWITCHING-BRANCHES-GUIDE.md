# 📚 AFTER SWITCHING BRANCHES - COMPLETE GUIDE

## 🎯 **WHAT HAPPENS WHEN YOU SWITCH?**

When you click a branch and switch, here's what happens:

1. ✅ **Branch selector updates** to show new branch
2. ✅ **Toast notification** confirms the switch
3. ✅ **localStorage saves** your choice
4. ✅ **Data filters change** based on branch mode

---

## 📊 **WHAT DATA CHANGES**

Depends on the **data isolation mode** of the branch you switched to:

### **🌐 Shared Mode (Main Store)**
```
After Switching to Main Store:

Products:      All products (shared across branches)
Customers:     All customers (shared across branches)
Inventory:     Unified inventory (all branches)
Sales:         Only Main Store sales
Employees:     All employees
Suppliers:     All suppliers
```

### **🔒 Isolated Mode (ARUSHA)**
```
After Switching to ARUSHA Branch:

Products:      Only ARUSHA products ⚠️
Customers:     Only ARUSHA customers ⚠️
Inventory:     Only ARUSHA inventory ⚠️
Sales:         Only ARUSHA sales
Employees:     Only ARUSHA employees ⚠️
Suppliers:     Only ARUSHA suppliers ⚠️
```

### **⚖️ Hybrid Mode (Airport Branch)**
```
After Switching to Airport Branch:

Products:      All products ✅ (share_products = true)
Customers:     All customers ✅ (share_customers = true)
Inventory:     Only Airport inventory ⚠️ (share_inventory = false)
Sales:         Only Airport sales
Employees:     Only Airport employees ⚠️ (share_employees = false)
Suppliers:     All suppliers ✅ (share_suppliers = true)
```

---

## 🛒 **WHAT TO DO AFTER SWITCHING**

### **Scenario 1: Switch to Make a Sale**
```
1. Switch to: "Airport Branch"
2. Go to: POS System (/pos)
3. Make a sale
4. Result: Sale is recorded for Airport Branch
5. Inventory: Deducts from Airport Branch stock only
```

### **Scenario 2: Check Branch Inventory**
```
1. Switch to: "Airport Branch"
2. Go to: Inventory Management
3. View: Airport Branch inventory levels
4. Compare: Switch to Main Store to see their inventory
```

### **Scenario 3: View Branch Sales**
```
1. Switch to: "ARUSHA Branch"
2. Go to: Sales Reports
3. View: Only ARUSHA sales data
4. Compare: Switch to other branches to see their sales
```

### **Scenario 4: Add Branch-Specific Product**
```
1. Switch to: "Airport Branch" (Isolated or Hybrid with share_products=false)
2. Go to: Inventory → Add Product
3. Create: "Airport Exclusive Item"
4. Result: Product only shows in Airport Branch
5. Test: Switch to Main Store → Product won't appear
```

### **Scenario 5: Transfer Stock Between Branches**
```
1. Switch to: "Main Store" (has stock)
2. Go to: Inventory → Select Product
3. Click: "Transfer Stock"
4. Choose: "To: Airport Branch"
5. Enter: Quantity to transfer
6. Submit: Transfer request
7. Result: Stock moves from Main to Airport
```

---

## 📋 **TYPICAL WORKFLOWS**

### **Daily Opening Checklist:**
```
Morning Routine at Airport Branch:

1. Switch to: Airport Branch
2. Check: Inventory levels
3. Check: Pending orders
4. Review: Yesterday's sales
5. Check: Low stock alerts
6. Process: Any pending transfers
```

### **Manager Review:**
```
Weekly Manager Review:

1. Switch to: Main Store
   - Review sales: Last 7 days
   - Export report

2. Switch to: Airport Branch
   - Review sales: Last 7 days
   - Compare performance

3. Switch to: ARUSHA Branch
   - Review sales: Last 7 days
   - Identify top performers

4. Generate: Consolidated report
```

### **Inventory Management:**
```
Stock Rebalancing:

1. Switch to: Main Store
   - Check: Overstocked items
   - Mark: Items for transfer

2. Switch to: Airport Branch
   - Check: Low stock items
   - Request: Transfer from Main

3. Create: Transfer requests
4. Approve: Transfers
5. Track: Transfer status
```

---

## 🔄 **UPDATE YOUR QUERIES**

To respect branch isolation in your code, update queries:

### **Example 1: Load Products**
```typescript
import { useBranch } from '../context/BranchContext';

const MyComponent = () => {
  const { currentBranch, isDataShared } = useBranch();
  
  const loadProducts = async () => {
    let query = supabase.from('lats_products').select('*');
    
    // Only filter if products are NOT shared
    if (!isDataShared('products')) {
      query = query.or(`branch_id.eq.${currentBranch?.id},is_shared.eq.true`);
    }
    
    const { data } = await query;
    return data;
  };
};
```

### **Example 2: Load Sales (Always Branch-Specific)**
```typescript
const loadSales = async () => {
  const { data } = await supabase
    .from('lats_sales')
    .select('*')
    .eq('branch_id', currentBranch?.id)  // Always filter by branch
    .gte('created_at', startDate)
    .lte('created_at', endDate);
    
  return data;
};
```

### **Example 3: Create Product**
```typescript
const createProduct = async (productData) => {
  const newProduct = {
    ...productData,
    branch_id: isDataShared('products') ? null : currentBranch?.id,
    is_shared: isDataShared('products'),
    created_by: currentUser?.id
  };
  
  const { data } = await supabase
    .from('lats_products')
    .insert([newProduct]);
    
  return data;
};
```

---

## 🎯 **PRACTICAL USE CASES**

### **Use Case 1: Multi-Location Retail**
```
Configuration: Hybrid Mode
- Share: Products, Customers, Suppliers
- Isolate: Inventory, Employees

Daily Operations:
1. Morning: Switch to your branch
2. View: Shared product catalog
3. Check: Your branch's inventory
4. Sell: Products (deducts from your stock)
5. Customer: Can shop at any branch (shared customer DB)
6. Evening: Review your branch's sales only
```

### **Use Case 2: Franchise Management**
```
Configuration: Isolated Mode

Each Franchise:
1. Has own products
2. Has own customers
3. Has own inventory
4. Independent operations
5. Separate reporting

Owner View:
1. Switch between franchises to review each
2. Compare performance
3. No data mixing
```

### **Use Case 3: Service Center Network**
```
Configuration: Shared Mode

All Centers:
1. See all devices
2. See all customers
3. Share inventory
4. Collaborative

Benefits:
- Customer drops device at Center A
- Picks up from Center B
- All data synchronized
```

---

## 📈 **REPORTING AFTER SWITCHING**

### **Branch Performance Report:**
```
Steps:
1. Switch to: Airport Branch
2. Go to: Sales Reports
3. View: 
   - Total sales (Airport only)
   - Top products (Airport sales)
   - Customer count (if isolated)
   - Revenue trends

4. Switch to: Main Store
5. Compare: Performance metrics
```

### **Inventory Comparison:**
```
Steps:
1. Switch to: Main Store
2. Note: iPhone 15 stock = 50 units

3. Switch to: Airport Branch
4. Note: iPhone 15 stock = 25 units

5. Analysis: Main Store has more stock
6. Action: Transfer if Airport running low
```

---

## 🔧 **ADMIN TASKS AFTER SWITCHING**

### **As Admin, You Can:**

#### **When in Main Store:**
- Review overall performance
- Approve transfer requests
- Manage shared catalog
- View consolidated reports

#### **When in Airport Branch:**
- Check branch-specific stock
- Process branch sales
- Manage branch employees
- Request stock transfers

#### **When in ARUSHA Branch:**
- Manage isolated inventory
- Handle local customers
- Independent operations
- Branch-specific reporting

---

## 🚨 **IMPORTANT NOTES**

### **Sales Are ALWAYS Branch-Specific**
```
No matter what mode:
- Sales made in Main Store → Tagged as Main Store
- Sales made in Airport → Tagged as Airport Branch

Why? Each transaction must be tracked to a location!
```

### **Inventory Depends on Mode**
```
Shared Mode:
- Sell 1 unit in Main Store
- All branches see stock decrease by 1

Isolated/Hybrid (inventory isolated):
- Sell 1 unit in Main Store
- Only Main Store stock decreases
- Airport Branch stock unchanged
```

### **Customers Can Shop Anywhere (if shared)**
```
If share_customers = true:
- Customer registered at Main Store
- Can shop at Airport Branch
- Loyalty points work everywhere
- Purchase history consolidated
```

---

## 💡 **PRO TIPS**

### **Tip 1: Default to Your Main Branch**
Start your day at your main branch, then switch as needed

### **Tip 2: Use for Quick Comparisons**
Switch between branches to quickly compare:
- Stock levels
- Sales performance
- Customer activity

### **Tip 3: Transfer Stock Smart**
- Check stock in Branch A
- Switch to Branch B
- See what they need
- Create transfer

### **Tip 4: Track Everything**
All switches are logged in `branch_activity_log`

---

## 🎯 **QUICK REFERENCE**

| After Switching | What To Do |
|-----------------|------------|
| To make a sale | Go to POS → Sell (records to current branch) |
| To check inventory | Go to Inventory → View branch stock |
| To view sales | Go to Reports → See branch sales |
| To add product | Go to Products → Add (branch-specific or shared) |
| To transfer stock | Inventory → Transfer → Select branches |
| To manage staff | Employees → Assign to current branch |

---

## 🎊 **YOU'RE ALL SET!**

**After switching branches:**
1. ✅ All data auto-filters to that branch
2. ✅ Sales record to that branch
3. ✅ Inventory shows branch stock
4. ✅ Reports show branch data
5. ✅ Everything just works!

---

**REFRESH YOUR APP, SWITCH BRANCHES, AND START WORKING!** 🚀✨

**Your multi-branch POS is now FULLY OPERATIONAL!** 💪

