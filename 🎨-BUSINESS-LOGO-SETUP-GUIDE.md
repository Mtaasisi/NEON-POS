# 🎨 Business Logo & Info Setup Guide

## ✨ What We've Done

Your app now fetches the **business logo** and **business information** from the `lats_pos_general_settings` table and displays them throughout the app!

---

## 📍 Where Your Logo & Info Appears

### 1. **Sidebar Header** 🏢
- **Logo**: Shows your uploaded business logo (or default icon if no logo)
- **Business Name**: Displays your business name
- **Address**: Shows your business address (if provided)

### 2. **Receipts** 🧾
- Business logo on thermal and A4 receipts
- All business contact information
- Customizable in Receipt Settings

### 3. **Automatically Synced** 🔄
- Updates in real-time when you save settings
- Cache refreshes every 5 minutes
- No manual refresh needed!

---

## 🚀 How to Set Up Your Business Info

### Step 1: Navigate to Settings
1. Click on **Settings** in the sidebar
2. Go to **General Settings** tab

### Step 2: Fill in Business Information
```
✅ Business Name      → "Your Store Name"
✅ Business Address   → "123 Main St, City"
✅ Business Phone     → "+255 123 456 789"
✅ Business Email     → "info@yourstore.com"
✅ Business Website   → "www.yourstore.com"
```

### Step 3: Upload Your Logo
1. Click **"Upload Logo"** button
2. Choose an image file (PNG, JPG, GIF, WebP)
3. **Requirements:**
   - Max size: **2MB**
   - Recommended: **200x200px** square
   - Format: PNG with transparent background works best

4. Click **"Save Settings"**

### Step 4: Verify It Works
1. Check the **sidebar** - your logo should appear at the top
2. The **business name** should replace "My Store"
3. Your **address** should show below the name

---

## 🔧 Technical Details

### How It Works
```typescript
// Automatically fetches from database
const { businessInfo } = useBusinessInfo();

// businessInfo contains:
{
  name: 'Your Business Name',
  address: 'Your Address',
  phone: '+255 xxx',
  email: 'info@...',
  website: 'www...',
  logo: 'data:image/png;base64,...' // Base64 encoded
}
```

### Database Table
- **Table**: `lats_pos_general_settings`
- **Fields**: 
  - `business_name`
  - `business_address`
  - `business_phone`
  - `business_email`
  - `business_website`
  - `business_logo` (base64 string)

### Caching
- **Cache Duration**: 5 minutes
- **Auto-refresh**: When settings updated
- **Manual Clear**: Logout/login or page reload

---

## 📋 Checklist

### Setup Checklist:
- [ ] Upload business logo
- [ ] Fill in business name
- [ ] Add business address
- [ ] Add phone number
- [ ] Add email (optional)
- [ ] Add website (optional)
- [ ] Click "Save Settings"
- [ ] Verify logo appears in sidebar
- [ ] Check receipt preview

---

## 🎨 Logo Best Practices

### Recommended:
✅ **PNG with transparent background**
✅ **Square dimensions (200x200px to 512x512px)**
✅ **Simple, clear design**
✅ **High contrast for visibility**
✅ **File size under 500KB**

### Avoid:
❌ Very large images (slow loading)
❌ Complex backgrounds (doesn't scale well)
❌ Extremely detailed logos (hard to read when small)
❌ Low contrast logos (hard to see)

---

## 🔄 What Happens Behind the Scenes

### When You Upload a Logo:
1. **Image is converted to base64** (text format)
2. **Stored in `business_logo` field** in database
3. **Cached for 5 minutes** for performance
4. **Automatically displayed** in sidebar & receipts
5. **Updates propagated** to all components

### When You Update Settings:
1. Settings saved to database ✅
2. Cache cleared 🗑️
3. `settingsUpdated` event fired 📡
4. All components reload business info 🔄
5. UI updates with new info ✨

---

## 🛠️ Troubleshooting

### Logo doesn't appear?

**Check 1: Is it uploaded?**
```sql
-- Run in your database
SELECT business_name, 
       CASE WHEN business_logo IS NOT NULL 
       THEN 'Logo exists ✅' 
       ELSE 'No logo ❌' END 
FROM lats_pos_general_settings;
```

**Check 2: Is format correct?**
- Should start with `data:image/`
- Should be base64 encoded

**Check 3: File size OK?**
- Must be under 2MB
- Recommended under 500KB

**Fix:**
1. Try a smaller image
2. Use PNG format
3. Clear browser cache
4. Reload page

### Business name doesn't update?

**Solution:**
1. Make sure you clicked **"Save Settings"**
2. Check browser console for errors
3. Try logging out and back in
4. Verify database was updated (run verification SQL)

---

## 📊 Verification SQL

Run this in your Neon database to verify:

```sql
-- See the verification SQL file:
-- VERIFY-BUSINESS-INFO.sql
```

---

## 🎯 Usage Examples

### In Components:
```typescript
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

function MyComponent() {
  const { businessInfo, loading } = useBusinessInfo();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {businessInfo.logo && (
        <img src={businessInfo.logo} alt={businessInfo.name} />
      )}
      <h1>{businessInfo.name}</h1>
      <p>{businessInfo.phone}</p>
    </div>
  );
}
```

### In Services:
```typescript
import { businessInfoService } from '@/lib/businessInfoService';

// Get business info
const info = await businessInfoService.getBusinessInfo();

// Update business info
await businessInfoService.updateBusinessInfo({
  name: 'New Name',
  logo: 'data:image/...'
});

// Clear cache
businessInfoService.clearCache();
```

---

## 🎉 Summary

✅ **Business logo and info are now fetched from settings**
✅ **Displayed in sidebar automatically**
✅ **Updates in real-time**
✅ **Works throughout the entire app**
✅ **Easy to update via Settings page**

Your POS system now has **personalized branding**! 🎨

---

## 📝 Next Steps

1. Upload your business logo
2. Fill in all business details
3. Customize your receipts
4. Test by making a sample sale
5. Print a receipt to verify

**Need help?** Check the troubleshooting section or run the verification SQL!

