# 🧭 Add Stock Transfer to Navigation Menu

## Quick Guide: Adding Stock Transfer to Your Menu

### Option 1: Add to Sidebar Navigation

If you have a sidebar navigation component, add this menu item:

```typescript
{
  id: 'stock-transfers',
  name: 'Stock Transfers',
  path: '/lats/stock-transfers',
  icon: <Package className="w-5 h-5" />, // or <Truck /> or <ArrowRightLeft />
  description: 'Transfer inventory between branches',
  roles: ['admin'],
  badge: pendingTransfersCount // Optional: show pending count
}
```

### Option 2: Add to Inventory Management Page

Add a card or button to your Inventory Management page:

```typescript
<GlassButton
  onClick={() => navigate('/lats/stock-transfers')}
  icon={<Package size={18} />}
  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
>
  Stock Transfers
</GlassButton>
```

### Option 3: Add to Admin Dashboard

Create a quick action tile:

```typescript
<div className="grid grid-cols-3 gap-4">
  {/* Existing tiles... */}
  
  <div 
    onClick={() => navigate('/lats/stock-transfers')}
    className="p-6 bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition-all"
  >
    <div className="flex items-center gap-4">
      <div className="p-3 bg-blue-100 rounded-lg">
        <Package className="w-6 h-6 text-blue-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Stock Transfers</h3>
        <p className="text-sm text-gray-600">Manage branch transfers</p>
      </div>
    </div>
  </div>
</div>
```

### Option 4: Add to Top Bar (Quick Access)

Add a quick access button to your top bar:

```typescript
<GlassButton
  onClick={() => navigate('/lats/stock-transfers')}
  variant="secondary"
  icon={<ArrowRightLeft size={16} />}
  className="hidden md:flex"
>
  Transfers
</GlassButton>
```

---

## 🔔 Show Pending Transfer Count (Optional)

To show a badge with pending transfer count:

```typescript
import { useState, useEffect } from 'react';
import { getTransferStats } from '../lib/stockTransferApi';

// In your component:
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  const loadPendingCount = async () => {
    const branchId = localStorage.getItem('current_branch_id');
    if (!branchId) return;
    
    const stats = await getTransferStats(branchId);
    setPendingCount(stats.pending);
  };
  
  loadPendingCount();
  
  // Refresh every minute
  const interval = setInterval(loadPendingCount, 60000);
  return () => clearInterval(interval);
}, []);

// Then use in your menu:
{pendingCount > 0 && (
  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
    {pendingCount}
  </span>
)}
```

---

## 📍 Common Navigation Locations

### Recommended Places to Add the Link:

1. **Main Sidebar** (Best for frequent access)
   - Under "Inventory" section
   - Between "Products" and "Purchase Orders"

2. **Inventory Management Page** (Contextual)
   - As a management option alongside categories, suppliers
   - Makes sense when managing inventory

3. **Dashboard Quick Actions** (Quick access)
   - For managers who frequently create transfers
   - Shows pending transfers count

4. **Top Bar** (Always visible)
   - For multi-branch managers
   - Quick switch between branches and transfers

---

## 🎨 Icon Recommendations

Choose an icon that fits your design:

```typescript
import { 
  Package,        // Generic inventory
  Truck,          // Shipping/transit
  ArrowRightLeft, // Transfer between
  Send,           // Outgoing
  Inbox,          // Incoming
  RefreshCw       // Circular transfer
} from 'lucide-react';
```

---

## 🔗 Direct Navigation from Other Pages

### From Product Detail Page:
```typescript
<GlassButton
  onClick={() => navigate(`/lats/stock-transfers?product=${productId}`)}
  variant="secondary"
  icon={<Send size={16} />}
>
  Transfer to Another Branch
</GlassButton>
```

### From Inventory List:
```typescript
<button
  onClick={() => navigate(`/lats/stock-transfers?variant=${variantId}`)}
  className="text-blue-600 hover:text-blue-800"
  title="Transfer Stock"
>
  <Send className="w-4 h-4" />
</button>
```

---

## ✨ URL Parameters Support (Future Enhancement)

You can pre-fill the transfer form with URL parameters:

```typescript
// Navigate with pre-selected product:
navigate('/lats/stock-transfers?variant=abc-123');

// Navigate with destination branch:
navigate('/lats/stock-transfers?to_branch=branch-456');

// Both:
navigate('/lats/stock-transfers?variant=abc-123&to_branch=branch-456');
```

To implement this, add to `StockTransferPage.tsx`:

```typescript
const searchParams = new URLSearchParams(location.search);
const preSelectedVariant = searchParams.get('variant');
const preSelectedBranch = searchParams.get('to_branch');

// Use these to pre-fill the form when modal opens
```

---

## 🎯 Quick Start: Minimal Addition

**Simplest way to get started:**

Add this anywhere in your existing navigation:

```typescript
<a href="/lats/stock-transfers" className="nav-link">
  📦 Stock Transfers
</a>
```

Then style it to match your existing navigation.

---

**Choose the option that best fits your UI structure!**

