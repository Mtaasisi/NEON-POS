# 📋 Image Upload Not Working - Quick Fix

## ⚡ TL;DR - Quick Fix (5 minutes)

The image upload is failing because the **Supabase Storage bucket** doesn't exist.

### Do This Now:

**1. Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Go to **Storage** section (left sidebar)

**2. Create the Bucket**
   - Click **"Create bucket"** button
   - Enter name: `product-images`
   - Check **"Public bucket"** ✅
   - File size limit: `5242880` (5MB)
   - Click **"Create"**

**3. Run SQL Script**
   - Open **Neon SQL Editor** (or Supabase SQL Editor)
   - Copy and run this file: `CREATE-PRODUCT-IMAGES-BUCKET.sql`
   - Wait for "✅ Product images table is ready!"

**4. Test It**
   - Refresh your app (Ctrl+Shift+R)
   - Go to **Add Product** page
   - Try uploading an image
   - Should work now! 🎉

---

## 🔍 Why It's Not Working

Your code at line 528-530 in `src/lib/robustImageService.ts`:

```typescript
const { data, error } = await supabase.storage
  .from('product-images')  // ← This bucket doesn't exist!
  .upload(fileName, file);
```

The `product-images` bucket needs to be created in Supabase Storage.

---

## ✅ Checklist

- [ ] Created `product-images` bucket in Supabase
- [ ] Set bucket to Public
- [ ] Ran `CREATE-PRODUCT-IMAGES-BUCKET.sql`
- [ ] Refreshed the app
- [ ] Tested image upload

---

## 🧪 Test Your Fix

Run this diagnostic:

```bash
node test-image-upload.mjs
```

Should show:
- ✅ Supabase URL
- ✅ Supabase Key  
- ✅ "product-images" bucket EXISTS
- ✅ product_images table exists

---

## 🚨 Still Not Working?

1. **Check browser console** (F12):
   - Look for red errors
   - Should see "✅ Uploaded to Supabase Storage"

2. **Run diagnostic**:
   ```sql
   -- In Neon SQL Editor
   \i DIAGNOSE-IMAGE-UPLOAD-ISSUE.sql
   ```

3. **Verify bucket permissions**:
   - Supabase Dashboard → Storage → product-images
   - Click on bucket settings
   - Ensure "Public" is checked

---

## 📚 Full Guide

For detailed explanation and advanced troubleshooting:
- Read: `🔧 FIX-IMAGE-UPLOAD-COMPLETE-GUIDE.md`

---

## 🎯 What This Fixes

After completing the fix, you'll be able to:
- ✅ Upload JPG, PNG, WebP images (up to 5MB)
- ✅ Drag & drop images
- ✅ Paste images from clipboard (Ctrl+V)
- ✅ Upload multiple images (up to 5 per product)
- ✅ Set primary image
- ✅ Delete images
- ✅ See image previews immediately

---

**Estimated time to fix**: 5-10 minutes  
**Difficulty**: Easy ⭐

Good luck! 🚀

