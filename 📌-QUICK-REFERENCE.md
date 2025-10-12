# 📌 Business Logo & Info - Quick Reference Card

## 🚀 Quick Start (30 seconds)

1. **Settings** → **General Settings**
2. Upload logo + Fill business info
3. **Save Settings**
4. Check sidebar ✨

---

## 📍 Where It Appears

| Location | What Shows |
|----------|------------|
| **Sidebar** | Logo + Name + Address |
| **Receipts** | Logo + All Contact Info |
| **Settings** | Edit Form |

---

## 🔧 How to Update

### Upload Logo:
```
Settings → General → Upload Logo → Save
```

### Update Name:
```
Settings → General → Business Name → Save
```

### Update Address:
```
Settings → General → Business Address → Save
```

---

## 📊 Database

**Table:** `lats_pos_general_settings`

**Fields:**
- `business_name` - Your business name
- `business_address` - Your address
- `business_phone` - Phone number
- `business_email` - Email
- `business_website` - Website
- `business_logo` - Logo (base64)

---

## 🔍 Quick Verify (SQL)

```sql
-- Check if logo exists
SELECT 
  business_name,
  CASE WHEN business_logo IS NOT NULL 
  THEN '✅ Logo exists' 
  ELSE '❌ No logo' END
FROM lats_pos_general_settings;
```

---

## 🎯 Logo Requirements

| Property | Value |
|----------|-------|
| **Format** | PNG, JPG, GIF, WebP |
| **Max Size** | 2 MB |
| **Recommended** | 200×200px to 512×512px |
| **Best** | PNG with transparent bg |
| **Stored as** | Base64 string |

---

## 🔄 How It Works

```
Upload → Database → Cache → Display
```

**Cache:** 5 minutes
**Update:** Automatic
**Fallback:** Default icon if no logo

---

## 💻 For Developers

### Use in Components:
```tsx
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

const { businessInfo, loading } = useBusinessInfo();

// Access:
businessInfo.logo
businessInfo.name
businessInfo.address
businessInfo.phone
businessInfo.email
businessInfo.website
```

### Clear Cache:
```tsx
import { businessInfoService } from '@/lib/businessInfoService';

businessInfoService.clearCache();
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Logo not showing | Check upload, refresh, clear cache |
| Logo blurry | Use higher resolution PNG |
| Changes not saving | Verify "Save Settings" clicked |
| Error on upload | Check file size < 2MB |
| Sidebar not updating | Hard refresh (Ctrl+Shift+R) |

---

## 📁 Files

### Modified:
- `src/layout/AppLayout.tsx` - Added business info to sidebar

### Created:
- `🎨-BUSINESS-LOGO-SETUP-GUIDE.md` - Full setup guide
- `🎨-BEFORE-AFTER-VISUAL.md` - Visual comparison
- `✅-CHANGES-SUMMARY.md` - Changes summary
- `🧪-TESTING-GUIDE.md` - Testing guide
- `VERIFY-BUSINESS-INFO.sql` - SQL verification
- `📌-QUICK-REFERENCE.md` - This file

---

## ✅ Test Checklist

Quick test (2 minutes):

- [ ] Upload logo in Settings
- [ ] Save settings
- [ ] Check sidebar shows logo
- [ ] Check business name shows
- [ ] Refresh page - logo persists

---

## 🎨 Visual Reference

### Sidebar Header:

**With Logo:**
```
┌─────────────────┐
│  🖼️  Your Store │
│     Your City   │
└─────────────────┘
```

**Without Logo:**
```
┌─────────────────┐
│  📱  My Store   │
│     Address     │
└─────────────────┘
```

---

## 🔑 Key Points

1. ✅ Fetches from `lats_pos_general_settings`
2. ✅ Updates automatically when saved
3. ✅ Caches for 5 minutes (performance)
4. ✅ Fallback to defaults if not set
5. ✅ Works on mobile and desktop
6. ✅ Appears in sidebar and receipts

---

## 📞 Support

**Check:**
1. Browser console for errors
2. SQL verification queries
3. Setup guide for detailed help
4. Testing guide for step-by-step

**SQL Verify:**
```bash
\i VERIFY-BUSINESS-INFO.sql
```

---

## 🎯 Success = 

✅ Your logo in sidebar
✅ Your business name displayed
✅ Your address shown
✅ Updates automatically
✅ Persists after refresh
✅ Shows on receipts

---

## 💡 Pro Tips

1. **PNG > JPG** for logos (transparency)
2. **Square images** work best (1:1 ratio)
3. **Under 500KB** ideal (faster load)
4. **High contrast** for visibility
5. **Simple design** scales better

---

## 🚀 Next Steps

1. Upload your logo now
2. Fill in business details
3. Test on receipt
4. Check on mobile
5. Done! ✨

---

**Your app now has professional branding! 🎨**

_Keep this file handy for quick reference_

