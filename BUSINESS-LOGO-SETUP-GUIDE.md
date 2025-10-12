# 📋 Business Logo Setup Guide

This guide will help you add your business logo to receipts, invoices, and other documents in your POS system.

## 🚀 Quick Start

### Step 1: Run the Database Migration

First, run the SQL migration to ensure all business information fields exist in your database:

```sql
-- Run this in your Neon/Supabase SQL editor
\i add-business-logo-fields.sql
```

Or copy and paste the contents of `add-business-logo-fields.sql` directly into your database console.

### Step 2: Access Settings

1. Navigate to your POS system
2. Go to **Settings** → **POS Settings** → **General Settings**
3. Look for the **Business Information** section (it should be at the top)

### Step 3: Upload Your Logo

In the Business Information section, you'll find:

- **Business Name** - Your store name (e.g., "LATS Chance Store")
- **Business Address** - Your physical address
- **Business Phone** - Contact phone number
- **Business Email** - Contact email address
- **Business Website** - Your website URL (optional)
- **Business Logo** - Upload your logo here!

#### Logo Requirements:
- **Formats**: JPG, PNG, GIF, WebP
- **Max Size**: 2MB
- **Recommended Size**: 200x200 pixels (square or rectangular)
- **Tip**: Use a transparent background (PNG) for best results

#### How to Upload:
1. Click the **"Upload Logo"** button
2. Select your logo file from your computer
3. Preview will appear immediately
4. Click **"Save Settings"** at the bottom to save

#### To Remove Logo:
- Click the **X** button on the top-right corner of the logo preview
- Click **"Save Settings"** to confirm removal

## 📄 Where Your Logo Appears

Once uploaded and saved, your logo will automatically appear in:

1. **Receipts** - Printed and digital receipts
2. **Invoices** - Customer invoices
3. **Purchase Orders** - Supplier purchase orders
4. **Reports** - Various business reports

## 🔧 Technical Details

### How It Works

The logo is:
- **Stored as Base64** - No external file storage needed
- **Cached** - Loaded once and cached for 5 minutes for performance
- **Automatically Synced** - All receipt/invoice generations use the latest logo

### Code Integration

If you're a developer and want to use the business info in custom components:

```typescript
import { useBusinessInfo } from '../hooks/useBusinessInfo';

function MyComponent() {
  const { businessInfo, loading, error } = useBusinessInfo();
  
  return (
    <div>
      {businessInfo.logo && (
        <img src={businessInfo.logo} alt={businessInfo.name} />
      )}
      <h1>{businessInfo.name}</h1>
      <p>{businessInfo.address}</p>
      <p>{businessInfo.phone}</p>
    </div>
  );
}
```

Or directly use the service:

```typescript
import { businessInfoService } from '../lib/businessInfoService';

async function generateDocument() {
  const info = await businessInfoService.getBusinessInfo();
  // Use info.logo, info.name, etc.
}
```

## 📱 Receipt Settings

You can control whether the logo appears on receipts:

1. Go to **Settings** → **POS Settings** → **Receipt Settings**
2. Find **"Show Business Logo"** toggle
3. Enable/disable as needed
4. Save settings

## 🎨 Best Practices

### Logo Design Tips:
- Use high contrast colors for better printing
- Keep it simple - detailed logos may not print well on thermal printers
- Test print a receipt after uploading to ensure quality
- Use a square or slightly rectangular logo (1:1 or 2:1 ratio)

### File Size Optimization:
- Compress your logo before uploading (use tools like TinyPNG)
- A 100KB logo is plenty for most use cases
- Smaller files = faster loading

## 🐛 Troubleshooting

### Logo Not Appearing?
1. **Check if you saved settings** - Upload alone doesn't save, you must click "Save Settings"
2. **Verify Receipt Settings** - Ensure "Show Business Logo" is enabled in Receipt Settings
3. **Clear browser cache** - Sometimes cached data prevents logo from updating
4. **Check file size** - Must be under 2MB
5. **Check file format** - Must be JPG, PNG, GIF, or WebP

### Logo Quality Issues?
- Upload a higher resolution image (at least 200x200px)
- Use PNG format with transparent background
- Ensure good contrast between logo and white background

### Settings Not Saving?
1. Check browser console for errors (F12 → Console)
2. Verify database connection
3. Check if you have permission to update settings
4. Try refreshing the page and uploading again

## 🆘 Support

If you encounter any issues:

1. **Check Console Logs** - Open browser console (F12) and look for errors
2. **Verify Database** - Ensure `general_settings` table has all required columns
3. **Re-run Migration** - Try running `add-business-logo-fields.sql` again
4. **Clear Cache** - The business info service caches for 5 minutes

## ✨ Features Added

This implementation includes:

- ✅ Logo upload with drag & drop support
- ✅ Instant preview before saving
- ✅ Base64 encoding for easy storage
- ✅ Automatic caching for performance
- ✅ Integration with receipts, invoices, and reports
- ✅ Full business information management
- ✅ Easy to extend for custom use cases

## 📝 Notes

- **Privacy**: Logo is stored in your database, not on external servers
- **Performance**: Logo is cached to minimize database queries
- **Compatibility**: Works with all browsers and devices
- **Scalability**: Base64 storage works for most use cases, but for very large deployments, consider using file storage services

---

**Need help?** Check the code comments in:
- `src/lib/businessInfoService.ts` - Business info service
- `src/hooks/useBusinessInfo.ts` - React hook for business info
- `src/features/lats/components/pos/GeneralSettingsTab.tsx` - Settings UI

Happy branding! 🎨✨

