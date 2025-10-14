# 🎨 Integrate Branding into Dashboard Service

## Quick Integration Guide

### Step 1: Add Branding to Dashboard Stats

Update your `dashboardService.ts` to include branding:

```typescript
import { BrandingService } from './brandingService';

// Add to your DashboardStats interface
export interface DashboardStats {
  // ... existing fields ...
  
  // Add branding info
  branding?: {
    companyName: string;
    businessLogo: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
}

// In your fetchDashboardStats function, add:
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // ... existing code ...
    
    // Fetch branding (cached automatically)
    const branding = await BrandingService.getBranding();
    
    return {
      // ... existing stats ...
      
      // Add branding info
      branding: branding ? {
        companyName: branding.company_name,
        businessLogo: branding.business_logo,
        primaryColor: branding.primary_color,
        secondaryColor: branding.secondary_color
      } : undefined
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};
```

---

## Usage Examples

### Example 1: Display in Dashboard Header

```typescript
import { useDashboard } from '../hooks/useDashboard';

function DashboardHeader() {
  const { stats } = useDashboard();
  
  return (
    <header style={{ backgroundColor: stats?.branding?.primaryColor }}>
      {stats?.branding?.businessLogo && (
        <img src={stats.branding.businessLogo} alt="Logo" />
      )}
      <h1>{stats?.branding?.companyName || 'Dashboard'}</h1>
    </header>
  );
}
```

### Example 2: Use in Receipt Generation

```typescript
import { BrandingService } from '../services/brandingService';

async function generateReceipt(transactionData: any) {
  const receiptHeader = await BrandingService.getReceiptHeader();
  
  return {
    header: {
      logo: receiptHeader.logo,
      businessName: receiptHeader.businessName,
      address: receiptHeader.address,
      phone: receiptHeader.phone,
      email: receiptHeader.email
    },
    transaction: transactionData
  };
}
```

### Example 3: Dynamic Theming

```typescript
import { BrandingService } from '../services/brandingService';

async function applyBrandColors() {
  const colors = await BrandingService.getColors();
  
  // Apply to CSS variables
  document.documentElement.style.setProperty('--primary-color', colors.primary);
  document.documentElement.style.setProperty('--secondary-color', colors.secondary);
  document.documentElement.style.setProperty('--accent-color', colors.accent);
}
```

---

## Testing

### Test 1: Fetch Branding in Console

Open browser console and run:

```javascript
import { BrandingService } from './services/brandingService';

// Fetch all branding
const branding = await BrandingService.getBranding();
console.log('Branding:', branding);

// Fetch specific fields
const logo = await BrandingService.getLogo();
const companyName = await BrandingService.getCompanyName();
const colors = await BrandingService.getColors();

console.log('Logo:', logo);
console.log('Company:', companyName);
console.log('Colors:', colors);
```

### Test 2: Check Cache

```javascript
import { BrandingService } from './services/brandingService';

// First call - fetches from database
console.time('First fetch');
await BrandingService.getBranding();
console.timeEnd('First fetch');

// Second call - uses cache (much faster!)
console.time('Cached fetch');
await BrandingService.getBranding();
console.timeEnd('Cached fetch');
```

---

## Complete Example: Dashboard with Branding

```typescript
// src/services/dashboardService.ts

import { supabase } from '../lib/supabaseClient';
import { BrandingService } from './brandingService';

export interface DashboardStats {
  // Device stats
  totalDevices: number;
  activeDevices: number;
  completedDevices: number;
  
  // Customer stats
  totalCustomers: number;
  activeCustomers: number;
  
  // Financial stats
  totalRevenue: number;
  revenueThisMonth: number;
  
  // Branding info
  branding?: {
    companyName: string;
    businessName: string;
    businessLogo: string | null;
    appLogo: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    console.log('📊 Fetching dashboard stats...');

    // Fetch all stats in parallel
    const [
      devices,
      customers,
      revenue,
      branding
    ] = await Promise.all([
      fetchDeviceStats(),
      fetchCustomerStats(),
      fetchRevenueStats(),
      BrandingService.getBranding() // Add branding fetch
    ]);

    return {
      // Device stats
      totalDevices: devices.total,
      activeDevices: devices.active,
      completedDevices: devices.completed,
      
      // Customer stats
      totalCustomers: customers.total,
      activeCustomers: customers.active,
      
      // Revenue stats
      totalRevenue: revenue.total,
      revenueThisMonth: revenue.thisMonth,
      
      // Branding info
      branding: branding ? {
        companyName: branding.company_name,
        businessName: branding.business_name,
        businessLogo: branding.business_logo,
        appLogo: branding.app_logo,
        primaryColor: branding.primary_color,
        secondaryColor: branding.secondary_color,
        accentColor: branding.accent_color,
        address: branding.business_address,
        phone: branding.business_phone,
        email: branding.business_email,
        website: branding.business_website
      } : undefined
    };
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    throw error;
  }
};

// Helper functions
async function fetchDeviceStats() {
  const { data, error } = await supabase
    .from('devices')
    .select('status');
  
  if (error) throw error;
  
  return {
    total: data?.length || 0,
    active: data?.filter(d => d.status === 'active').length || 0,
    completed: data?.filter(d => d.status === 'completed').length || 0
  };
}

async function fetchCustomerStats() {
  const { count: total } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });
  
  const { count: active } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  return {
    total: total || 0,
    active: active || 0
  };
}

async function fetchRevenueStats() {
  // Your existing revenue logic
  return {
    total: 0,
    thisMonth: 0
  };
}
```

---

## React Component Example

```typescript
// src/components/DashboardHeader.tsx

import React, { useEffect, useState } from 'react';
import { BrandingService } from '../services/brandingService';
import { UnifiedBrandingSettings } from '../lib/unifiedBrandingApi';

export const DashboardHeader: React.FC = () => {
  const [branding, setBranding] = useState<UnifiedBrandingSettings | null>(null);

  useEffect(() => {
    const loadBranding = async () => {
      const data = await BrandingService.getBranding();
      setBranding(data);
    };

    loadBranding();

    // Subscribe to changes
    const unsubscribe = BrandingService.subscribe((newBranding) => {
      setBranding(newBranding);
    });

    return () => unsubscribe();
  }, []);

  if (!branding) return null;

  return (
    <header className="bg-white shadow-md p-4" style={{ borderLeftColor: branding.primary_color }}>
      <div className="flex items-center gap-4">
        {branding.app_logo && (
          <img 
            src={branding.app_logo} 
            alt={branding.company_name}
            className="h-12 w-12 object-contain"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: branding.primary_color }}>
            {branding.company_name}
          </h1>
          {branding.tagline && (
            <p className="text-sm text-gray-600">{branding.tagline}</p>
          )}
        </div>
      </div>
    </header>
  );
};
```

---

## Performance Notes

✅ **Automatic Caching**: BrandingService caches results for 5 minutes
✅ **Parallel Fetching**: Use Promise.all() to fetch with other dashboard stats
✅ **Real-time Updates**: Subscribe to changes for instant updates

---

## Troubleshooting

### Issue: "No branding data"
```typescript
// Check if database table exists
const branding = await BrandingService.getBranding();
if (!branding) {
  console.log('⚠️ Run UNIFIED-BRANDING-MIGRATION.sql first!');
}
```

### Issue: "Slow fetching"
```typescript
// Branding is cached automatically
// First fetch: ~100ms
// Subsequent fetches: <1ms (from cache)

// Force clear cache if needed:
BrandingService.clearCache();
```

---

## Summary

✅ Created `BrandingService` for non-React usage
✅ Easy integration into dashboard service
✅ Automatic caching for performance
✅ Real-time updates support
✅ Type-safe API

**Next Step:** Run `UNIFIED-BRANDING-MIGRATION.sql` to create the database table!

