# 🏢 Unified Business Information Architecture

## ✅ Single Source of Truth

**All business information across the entire app now fetches from:**
```
lats_pos_general_settings (Database Table)
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│   lats_pos_general_settings (Database)  │
│                                         │
│  • business_name                        │
│  • business_phone                       │
│  • business_email                       │
│  • business_website                     │
│  • business_address                     │
│  • business_logo (Base64)               │
└─────────────────────────────────────────┘
                    ▼
        ┌──────────────────────┐
        │ businessInfoService   │
        │   (with 5min cache)   │
        └──────────────────────┘
                    ▼
        ┌──────────────────────┐
        │   useBusinessInfo()   │
        │      (React Hook)     │
        └──────────────────────┘
                    ▼
    ┌───────────────────────────────┐
    │  ALL COMPONENTS IN THE APP    │
    │                               │
    │  • AppLayout (Sidebar)        │
    │  • Receipts & Invoices        │
    │  • Email Templates            │
    │  • Purchase Orders            │
    │  • Sales Reports              │
    │  • Any component needing      │
    │    business information       │
    └───────────────────────────────┘
```

---

## 🎯 Where You Can Edit Business Info

You can edit business information from **3 places** (all save to the same table):

### 1. **Admin Settings → Business Information** (Top of menu)
- Full business details form
- Logo upload with preview
- Admin UI styling
- **Recommended for initial setup**

### 2. **POS Settings → General → Business Information**
- Same fields as Admin Settings
- POS-style UI
- Integrated with other POS settings

### 3. **Settings → Profile** (if enabled)
- Business profile information
- Focused on contact details

**Important:** Changes in ANY of these locations update the SAME data!

---

## 🔄 Auto-Refresh System

When you save changes from any location:

1. ✅ Database updated (`lats_pos_general_settings`)
2. ✅ Cache cleared (`businessInfoService.clearCache()`)
3. ✅ Event fired (`settingsUpdated` custom event)
4. ✅ **All components automatically refresh** with new data

**No page reload needed!**

---

## 💻 For Developers

### Using Business Info in Components:

```tsx
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

const MyComponent = () => {
  const { businessInfo, loading, error } = useBusinessInfo();
  
  return (
    <div>
      <h1>{businessInfo.name}</h1>
      <p>{businessInfo.address}</p>
      <p>{businessInfo.phone}</p>
      {businessInfo.logo && <img src={businessInfo.logo} alt="Logo" />}
    </div>
  );
};
```

### Direct Service Access (without React):

```typescript
import { businessInfoService } from '@/lib/businessInfoService';

const info = await businessInfoService.getBusinessInfo();
console.log(info.name, info.logo);

// After updating business info:
businessInfoService.clearCache(); // Force refresh
```

### Updating Business Info:

```typescript
// Option 1: Use the service directly
await businessInfoService.updateBusinessInfo({
  name: 'New Business Name',
  logo: 'data:image/png;base64,...'
});

// Option 2: Update via Supabase (component level)
await supabase
  .from('lats_pos_general_settings')
  .update({ business_name: 'New Name' })
  .eq('id', settingsId);
  
businessInfoService.clearCache(); // Don't forget this!
```

---

## 🎨 Business Info Fields

| Field | Type | Description |
|-------|------|-------------|
| `business_name` | string | Company/Store name |
| `business_phone` | string | Contact phone number |
| `business_email` | string | Contact email |
| `business_website` | string | Website URL |
| `business_address` | string | Physical address |
| `business_logo` | string/null | Logo as Base64 or URL |

---

## 🔍 Components Using Business Info

All these components fetch from `lats_pos_general_settings`:

- ✅ **AppLayout** - Sidebar business info display
- ✅ **ReceiptWithBusinessInfo** - Receipt header
- ✅ **POSReceiptModal** - POS receipts
- ✅ **EmailReceiptTemplate** - Email receipts
- ✅ **InvoiceTemplate** - Invoice documents
- ✅ **PurchaseOrderDetailPage** - Purchase orders
- ✅ **SalesReportsPage** - Report headers
- ✅ **POcreate** - Purchase order creation
- ✅ **ImprovedReceiptSettings** - Receipt previews

---

## 🚀 Benefits

### ✅ **No Duplication**
- One table, one source of truth
- Edit once, update everywhere

### ✅ **Performance**
- 5-minute cache reduces database calls
- Automatic cache invalidation on updates

### ✅ **Consistency**
- Same business info across all features
- No sync issues between different sections

### ✅ **Real-time Updates**
- Custom events notify all components
- Automatic re-rendering when data changes

### ✅ **Easy Maintenance**
- Single service to maintain
- Clear data flow
- Centralized error handling

---

## 🔧 Cache Management

**Cache Duration:** 5 minutes

**Cache is automatically cleared when:**
- Business info updated in Admin Settings
- Business info updated in POS Settings  
- Profile information saved
- Manual call to `businessInfoService.clearCache()`

**Force refresh all components:**
```typescript
businessInfoService.clearCache();
window.dispatchEvent(new CustomEvent('settingsUpdated', { 
  detail: { type: 'general' } 
}));
```

---

## 📝 Migration Notes

**Previously:**
- Multiple tables (general_settings, unified_branding_settings, etc.)
- Duplicate data across different locations
- Manual syncing required

**Now:**
- Single table: `lats_pos_general_settings`
- Automatic synchronization
- One update affects everything

---

## 🎯 Summary

✅ **Single Table**: `lats_pos_general_settings`  
✅ **Single Service**: `businessInfoService`  
✅ **Single Hook**: `useBusinessInfo()`  
✅ **Multiple Edit Points**: Admin, POS, Profile (all save to same place)  
✅ **Auto-Refresh**: All components update automatically  
✅ **No Duplication**: One data, everywhere

Your entire app now has a unified, efficient, and consistent business information system! 🎉

