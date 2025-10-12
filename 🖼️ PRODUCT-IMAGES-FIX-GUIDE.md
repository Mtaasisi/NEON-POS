# 🖼️ Product Images Not Showing - Fix Guide

## Problem Diagnosed
Product images are not displaying because:
1. The `product_images` table might not exist in your Neon database
2. OR the table exists but has no images migrated from `lats_products.images`
3. OR RLS policies are blocking access

## Solution (Automatic Fix)

### Step 1: Run the SQL Script
1. Open **Neon Console**: https://console.neon.tech
2. Go to **SQL Editor**
3. Copy and paste contents of `FIX-PRODUCT-IMAGES-TABLE.sql`
4. Click **Run**

### What This Fix Does:
✅ Creates `product_images` table if it doesn't exist  
✅ Adds proper indexes for fast queries  
✅ Disables RLS policies (Neon doesn't need Supabase auth)  
✅ **Migrates existing images** from `lats_products.images` column  
✅ Sets first image as primary for each product  

### Step 2: Verify
After running the script, you'll see a message like:
```
✅ Product images table created! Total images: 25
```

### Step 3: Refresh Your App
1. Go to your browser
2. Hard refresh (Cmd+Shift+R on Mac)
3. Navigate to Inventory page
4. **Product images should now display!** ✨

## How It Works

The app's `RobustImageService` tries to load images in this order:
1. From `product_images` table (main source)
2. Fallback to `lats_products.images` column (legacy)
3. Show placeholder icon if no images found

After running the fix, all images will be properly stored in `product_images` table.

## If Images Still Don't Show

Check if products have images in `lats_products`:
```sql
SELECT id, name, images 
FROM lats_products 
WHERE images IS NOT NULL 
  AND jsonb_array_length(images) > 0
LIMIT 5;
```

If no products have images, you'll need to upload images:
1. Go to Inventory page
2. Click on a product
3. Click "Add Image" button
4. Upload product photos

---
**Auto-diagnosed**: Based on code inspection of `RobustImageService`  
**Fix method**: SQL table creation + data migration  
**Status**: Ready to apply  

