# 🚀 Business Logo - Quick Reference

## For End Users

### Upload Logo (3 Steps):
1. **Go to**: Settings → POS Settings → General Settings
2. **Click**: "Upload Logo" button in Business Information section
3. **Save**: Click "Save Settings" button at the bottom

**That's it!** Your logo will now appear on all receipts and invoices.

---

## For Developers

### Option 1: Use the Hook (Recommended)
```typescript
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

function MyComponent() {
  const { businessInfo } = useBusinessInfo();
  
  return (
    <div>
      {businessInfo.logo && <img src={businessInfo.logo} alt="Logo" />}
      <h1>{businessInfo.name}</h1>
    </div>
  );
}
```

### Option 2: Use the Service Directly
```typescript
import { businessInfoService } from '@/lib/businessInfoService';

async function generateDocument() {
  const info = await businessInfoService.getBusinessInfo();
  console.log(info.logo, info.name, info.address);
}
```

### Option 3: Use the Receipt Wrapper (Easiest)
```typescript
import ReceiptWithBusinessInfo from '@/features/lats/components/pos/ReceiptWithBusinessInfo';

function SalesPage() {
  return (
    <ReceiptWithBusinessInfo
      receiptData={{
        transactionId: "12345",
        date: new Date(),
        cashier: "John",
        items: [...],
        subtotal: 1000,
        total: 1180,
        // storeInfo automatically added!
      }}
      onPrint={() => window.print()}
    />
  );
}
```

---

## File Locations

| Purpose | File Path |
|---------|-----------|
| Upload UI | `src/features/lats/components/pos/GeneralSettingsTab.tsx` |
| Business Service | `src/lib/businessInfoService.ts` |
| React Hook | `src/hooks/useBusinessInfo.ts` |
| Receipt Wrapper | `src/features/lats/components/pos/ReceiptWithBusinessInfo.tsx` |
| Types | `src/lib/posSettingsApi.ts` (GeneralSettings interface) |
| Database Migration | `add-business-logo-fields.sql` |

---

## Database Fields

The `general_settings` table contains:
- `business_name` (TEXT)
- `business_address` (TEXT)
- `business_phone` (TEXT)
- `business_email` (TEXT)
- `business_website` (TEXT)
- `business_logo` (TEXT) - Base64 encoded image

---

## API Reference

### `businessInfoService`

```typescript
// Get business info (cached for 5 minutes)
const info = await businessInfoService.getBusinessInfo();

// Clear cache (call after settings update)
businessInfoService.clearCache();

// Update business info
await businessInfoService.updateBusinessInfo({
  name: "My Store",
  logo: "data:image/png;base64,..."
});
```

### `useBusinessInfo()` Hook

```typescript
const { 
  businessInfo,  // BusinessInfo object
  loading,       // boolean
  error          // string | null
} = useBusinessInfo();
```

Returns:
```typescript
interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  logo?: string | null;
}
```

---

## Event System

When settings are saved, a custom event is dispatched:

```typescript
// Listen for settings updates
window.addEventListener('settingsUpdated', (event: CustomEvent) => {
  if (event.detail?.type === 'general') {
    // Reload business info
    businessInfoService.clearCache();
  }
});

// Dispatch after saving (automatically done in GeneralSettingsTab)
window.dispatchEvent(new CustomEvent('settingsUpdated', { 
  detail: { type: 'general' } 
}));
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logo not showing | 1. Check "Save Settings" was clicked<br>2. Enable "Show Business Logo" in Receipt Settings |
| Upload fails | 1. Check file size < 2MB<br>2. Use JPG/PNG/GIF/WebP format |
| Cache issues | Call `businessInfoService.clearCache()` |
| Type errors | Import `BusinessInfo` type from `businessInfoService` |

---

## Testing

```typescript
// Test in browser console:
import { businessInfoService } from './src/lib/businessInfoService';

// Get info
const info = await businessInfoService.getBusinessInfo();
console.log('Business Info:', info);

// Check if logo exists
console.log('Has logo:', !!info.logo);
```

---

**Need more details?** See `BUSINESS-LOGO-SETUP-GUIDE.md`

