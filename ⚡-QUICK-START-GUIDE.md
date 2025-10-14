# ⚡ Quick Start Guide - Unified Branding

## 🎯 What This Does

Makes branding settings (logo, company name, colors, etc.) sync automatically between **Admin Settings** and **POS Settings**.

```
Before: ❌
Admin Logo ≠ POS Logo
Admin Name ≠ POS Name

After: ✅
Change logo anywhere → Updates everywhere instantly!
```

---

## 🚀 3-Step Setup (5 Minutes)

### Step 1: Run SQL Script (2 min)

1. Open your **Neon Database Console**
2. Copy and paste entire contents of `UNIFIED-BRANDING-MIGRATION.sql`
3. Click **Run**
4. Wait for: `✓ Query executed successfully`

**What this does:**
- Creates new `unified_branding_settings` table
- Copies existing data from POS settings
- Sets up permissions

---

### Step 2: Verify Migration (1 min)

In Neon Console, run:

```sql
SELECT * FROM unified_branding_settings;
```

You should see your business information already there! ✨

---

### Step 3: Test It (2 min)

**Option A: In Your App**

Add this test page to see the unified branding:

```typescript
// src/pages/TestBrandingPage.tsx
import React from 'react';
import UnifiedBrandingSettings from '../features/admin/components/UnifiedBrandingSettings';

export default function TestBrandingPage() {
  return (
    <div className="container mx-auto p-6">
      <UnifiedBrandingSettings />
    </div>
  );
}
```

Add route in `App.tsx`:
```typescript
<Route path="/test-branding" element={<TestBrandingPage />} />
```

Visit: `http://localhost:5173/test-branding`

**Option B: In Browser Console**

```javascript
// Test loading branding
import UnifiedBrandingAPI from './lib/unifiedBrandingApi';
const settings = await UnifiedBrandingAPI.loadSettings();
console.log('Branding:', settings);
```

---

## 🎨 Usage Examples

### Display Logo in Any Component

```typescript
import { useBrandingSettings } from '../hooks/useUnifiedBranding';

function MyComponent() {
  const { settings, loading } = useBrandingSettings();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <img src={settings?.business_logo} alt={settings?.company_name} />
      <h1>{settings?.company_name}</h1>
    </div>
  );
}
```

### Edit Branding (Admin Only)

```typescript
import { useUnifiedBranding } from '../hooks/useUnifiedBranding';

function BrandingEditor() {
  const { settings, saveSettings, saving } = useUnifiedBranding();

  const handleSave = async () => {
    await saveSettings({
      ...settings,
      company_name: 'New Company Name',
      primary_color: '#FF0000'
    });
  };

  return (
    <button onClick={handleSave} disabled={saving}>
      {saving ? 'Saving...' : 'Save Changes'}
    </button>
  );
}
```

---

## 📊 How It Works

```
┌─────────────────┐
│  Admin Settings │
│  Change Logo    │
└────────┬────────┘
         │
         ↓
┌────────────────────────┐
│ unified_branding_settings │  ← Single Source of Truth
└────────┬───────────────┘
         │
         ├──────→ POS Header
         ├──────→ Receipt Template
         ├──────→ Invoice Template
         └──────→ Email Signature

All update automatically! ✨
```

---

## ✅ What's Synced

- ✅ Business Logo
- ✅ App Logo (alternative)
- ✅ Company Name
- ✅ Business Address
- ✅ Phone Number
- ✅ Email Address
- ✅ Website URL
- ✅ Brand Colors (primary, secondary, accent)
- ✅ Logo Size & Position
- ✅ Tax ID & Registration Number

---

## 🔍 Troubleshooting

### Issue: "Table doesn't exist"
```
✅ Solution: Run UNIFIED-BRANDING-MIGRATION.sql
```

### Issue: "No data showing"
```typescript
// Run migration manually:
import UnifiedBrandingAPI from './lib/unifiedBrandingApi';
await UnifiedBrandingAPI.migrateFromPOSSettings();
```

### Issue: "Permission denied"
```sql
-- Verify RLS policies in database:
SELECT * FROM pg_policies WHERE tablename = 'unified_branding_settings';
```

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `UNIFIED-BRANDING-MIGRATION.sql` | Database setup |
| `src/lib/unifiedBrandingApi.ts` | Core API |
| `src/hooks/useUnifiedBranding.ts` | React hooks |
| `src/features/admin/components/UnifiedBrandingSettings.tsx` | UI component |
| `🎯-UNIFIED-BRANDING-GUIDE.md` | Detailed guide |
| `📋-SETTINGS-CONSOLIDATION-SUMMARY.md` | Complete summary |

---

## 🎉 You're Done!

Your branding is now unified. Any changes you make in Admin Settings or POS Settings will automatically sync across your entire app!

**Test it:**
1. Change logo in Admin Settings
2. Check POS - logo updated instantly! ✨
3. Generate receipt - new logo appears! ✨

---

## 💡 Pro Tips

### Tip 1: Use Read-Only Hook for Display
```typescript
// Faster, lighter - use for display only
const { settings } = useBrandingSettings();
```

### Tip 2: Use Full Hook for Editing
```typescript
// Has save/update functions - use for editing
const { settings, saveSettings, updateSettings } = useUnifiedBranding();
```

### Tip 3: Subscribe to Changes
```typescript
// Get real-time updates
useEffect(() => {
  const subscription = UnifiedBrandingAPI.subscribeToSettings((newSettings) => {
    console.log('Branding updated!', newSettings);
  });

  return () => UnifiedBrandingAPI.unsubscribeFromSettings();
}, []);
```

---

## 🚀 Next Level (Optional)

Want to add more unified settings? Check out:
- `🔍-OTHER-DUPLICATE-SETTINGS-ANALYSIS.md` for theme/language unification

---

## 🆘 Need Help?

1. Check `🎯-UNIFIED-BRANDING-GUIDE.md` for detailed API docs
2. Check `📋-SETTINGS-CONSOLIDATION-SUMMARY.md` for complete overview
3. Check browser console for error messages
4. Verify database table exists: `SELECT * FROM unified_branding_settings;`

---

That's it! Enjoy your unified branding system! 🎊

