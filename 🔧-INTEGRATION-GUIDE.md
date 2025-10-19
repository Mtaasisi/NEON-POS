# 🔧 Integration Guide - Adding New Components to Purchase Order Details

## Quick Integration Steps

### Step 1: Import New Components

Add these imports to your `PurchaseOrderDetailPage.tsx`:

```typescript
import QualityCheckTab from '../components/purchase-order/QualityCheckTab';
import ReceivedItemsReport from '../components/purchase-order/ReceivedItemsReport';
```

### Step 2: Add New Tabs to Tab Navigation

Find your tab navigation section and add these new tabs:

```typescript
const tabs = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'received', label: 'Received Items', icon: CheckCircle },
  { id: 'quality-check', label: 'Quality Check', icon: Shield },  // ← NEW
  { id: 'reports', label: 'Reports', icon: BarChart3 },           // ← NEW
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
];
```

### Step 3: Add Tab Content Rendering

In your tab content section, add these cases:

```typescript
{activeTab === 'quality-check' && (
  <QualityCheckTab purchaseOrderId={purchaseOrder.id} />
)}

{activeTab === 'reports' && (
  <ReceivedItemsReport 
    purchaseOrderId={purchaseOrder.id} 
    purchaseOrderNumber={purchaseOrder.po_number} 
  />
)}
```

### Step 4: Add Icons Import

Make sure you have these icons imported:

```typescript
import { Shield, BarChart3 } from 'lucide-react';
```

---

## Complete Example

Here's a complete example of the tab structure:

```typescript
import React, { useState } from 'react';
import { 
  FileText, 
  Package, 
  CheckCircle, 
  Shield, 
  BarChart3, 
  Clock, 
  MessageCircle 
} from 'lucide-react';
import QualityCheckTab from '../components/purchase-order/QualityCheckTab';
import ReceivedItemsReport from '../components/purchase-order/ReceivedItemsReport';

const PurchaseOrderDetailPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'received', label: 'Received Items', icon: CheckCircle },
    { id: 'quality-check', label: 'Quality Check', icon: Shield },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 ${
              activeTab === tab.id 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div>Overview content...</div>
        )}
        
        {activeTab === 'items' && (
          <div>Items content...</div>
        )}
        
        {activeTab === 'received' && (
          <div>Received items content...</div>
        )}
        
        {activeTab === 'quality-check' && (
          <QualityCheckTab purchaseOrderId={purchaseOrder.id} />
        )}
        
        {activeTab === 'reports' && (
          <ReceivedItemsReport 
            purchaseOrderId={purchaseOrder.id} 
            purchaseOrderNumber={purchaseOrder.po_number} 
          />
        )}
        
        {activeTab === 'timeline' && (
          <div>Timeline content...</div>
        )}
        
        {activeTab === 'messages' && (
          <div>Messages content...</div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;
```

---

## Badge Indicators (Optional)

Add badges to show counts:

```typescript
{activeTab === 'quality-check' && pendingQcCount > 0 && (
  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
    {pendingQcCount}
  </span>
)}
```

---

## Conditional Display (Optional)

Only show Quality Check and Reports tabs when items have been received:

```typescript
const tabs = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'received', label: 'Received Items', icon: CheckCircle },
  ...(hasReceivedItems ? [
    { id: 'quality-check', label: 'Quality Check', icon: Shield },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ] : []),
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
];
```

---

## Testing

After integration, test:

1. ✅ Navigate to Purchase Order details
2. ✅ Click "Quality Check" tab
3. ✅ Verify items load correctly
4. ✅ Test pass/fail actions
5. ✅ Click "Reports" tab
6. ✅ Verify statistics calculate correctly
7. ✅ Test CSV export
8. ✅ Test print functionality

---

## That's it! 🎉

Your Purchase Order system now has:
- ✅ Enhanced serial number receiving
- ✅ Quality check workflow
- ✅ Comprehensive reporting

All integrated seamlessly into your existing Purchase Order flow!

