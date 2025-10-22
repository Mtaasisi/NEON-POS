# Manual Thumbnail Upload Guide

## Overview
You now have full control over your product image thumbnails! You can upload your own custom thumbnails instead of auto-generated ones.

## What Changed

### ✅ Auto-Generation Disabled
- Thumbnail auto-generation is now **OFF**
- You have full control over thumbnail images
- Upload your own custom-designed thumbnails

### ✅ Manual Upload Added
- New `ThumbnailUploader` component created
- Upload separate thumbnail for each product image
- Supports JPG, PNG, WebP, and GIF formats

## How to Upload Custom Thumbnails

### Option 1: Use the ThumbnailUploader Component

Add the thumbnail uploader to your product form:

```tsx
import ThumbnailUploader from '@/components/ThumbnailUploader';

// In your product image section
<ThumbnailUploader
  imageId={image.id}
  currentThumbnailUrl={image.thumbnailUrl}
  userId={currentUserId}
  onThumbnailUploaded={(url) => {
    console.log('Thumbnail uploaded:', url);
    // Refresh your image list
  }}
  onError={(error) => {
    console.error('Upload failed:', error);
  }}
/>
```

### Option 2: Use the API Directly

```typescript
import { UnifiedImageService } from '@/lib/unifiedImageService';

// Upload a custom thumbnail
const result = await UnifiedImageService.uploadThumbnail(
  thumbnailFile,  // Your thumbnail File object
  imageId,        // The product image ID
  userId          // Current user ID
);

if (result.success) {
  console.log('Thumbnail uploaded:', result.thumbnailUrl);
} else {
  console.error('Upload failed:', result.error);
}
```

## Thumbnail Recommendations

### Best Sizes
- **Small Thumbnails**: 150x150px (for lists, grids)
- **Medium Thumbnails**: 300x300px (for cards)
- **Large Thumbnails**: 600x600px (for detail views)

### File Format
- **WebP**: Best compression and quality (recommended)
- **JPEG**: Good for photos
- **PNG**: Good for graphics with transparency
- **Max Size**: 2MB per thumbnail

### Design Tips
1. **Square Format**: Use 1:1 aspect ratio (square)
2. **Clear Subject**: Center your product
3. **Good Lighting**: Ensure visibility
4. **Consistent Style**: Use same background/style across products
5. **Optimize**: Compress images before upload

## Example Workflow

1. **Create Product** → Upload main high-res image
2. **Create Thumbnail** → Design/crop a smaller version (150x150px)
3. **Upload Thumbnail** → Use ThumbnailUploader component
4. **Verify** → Check thumbnail appears correctly in product lists

## Where Thumbnails Are Used

- ✅ Product listing grids
- ✅ Search results
- ✅ Shopping cart items
- ✅ Quick view modals
- ✅ Related products sections
- ✅ Mobile views

## Database Structure

### product_images Table
```sql
- id (uuid) - Primary key
- product_id (uuid) - Link to product
- image_url (text) - Full-size image URL
- thumbnail_url (text) - Custom thumbnail URL ← YOU CONTROL THIS
- file_name (text) - Original filename
- file_size (integer) - File size in bytes
- is_primary (boolean) - Primary image flag
- uploaded_by (uuid) - User who uploaded
- created_at (timestamp) - Upload timestamp
```

## API Reference

### UnifiedImageService.uploadThumbnail()

**Parameters:**
- `thumbnailFile` (File) - The thumbnail image file
- `imageId` (string) - The product image ID
- `userId` (string) - Current user ID

**Returns:**
```typescript
{
  success: boolean;
  thumbnailUrl?: string;  // URL of uploaded thumbnail
  error?: string;         // Error message if failed
}
```

## Troubleshooting

### Thumbnail Not Showing
1. Check if thumbnail_url is set in database
2. Verify file was uploaded successfully
3. Check browser console for errors
4. Ensure image URL is accessible

### Upload Fails
1. Check file size (max 2MB)
2. Verify file format (JPG, PNG, WebP, GIF)
3. Ensure you have internet connection (production)
4. Check user has upload permissions

### Quality Issues
1. Use higher resolution source (300x300px minimum)
2. Try WebP format for better compression
3. Use image optimization tools before upload
4. Avoid over-compression

## Need Auto-Generation Back?

If you want to re-enable automatic thumbnail generation:

1. Edit `src/features/lats/config/imageSystemConfig.ts`
2. Change `autoGenerateThumbnails: false` to `autoGenerateThumbnails: true`
3. Thumbnails will be auto-generated on upload

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify database connection
3. Test with a small image file first
4. Review this guide for best practices

---

**Last Updated**: October 2025  
**Version**: 1.0.0

