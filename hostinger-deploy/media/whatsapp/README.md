# WhatsApp Media Library - Local Storage

This folder is designated for WhatsApp media files used in campaigns and messages.

## Storage System

The application uses a **hybrid local storage system**:

1. **Browser localStorage**: Media files are stored as base64-encoded data URLs in the browser's localStorage
2. **Database**: Only the relative path (e.g., `General/image-123456.jpg`) is stored in the database
3. **Public folder**: This folder serves as the designated location for media in the build

## How It Works

### Upload Process:
1. User selects a file through the Media Library Modal
2. File is validated (max 16MB, allowed types: images, videos, audio, documents)
3. File is converted to base64 and stored in localStorage with key: `local-media:{folder}/{filename}`
4. Database stores only the relative path
5. Component retrieves the base64 data from localStorage for display

### Folder Structure:
```
/media/whatsapp/
  ├── General/       (default folder for uncategorized media)
  ├── Products/      (product-related media)
  ├── Promotions/    (promotional campaign media)
  └── {custom}/      (user-created folders)
```

## Key Features

- ✅ **No External Dependencies**: All media stored locally in browser
- ✅ **Automatic Deduplication**: Same file won't be uploaded twice
- ✅ **Backup/Restore**: Export and import all media as JSON
- ✅ **No Server Required**: Works entirely in the browser
- ✅ **Build-Friendly**: Media persists across builds via localStorage

## Important Notes

1. **Storage Limits**: Browser localStorage is typically limited to 5-10MB. For larger media libraries, consider using IndexedDB (future enhancement)
2. **Data Persistence**: Media is tied to the browser/device. Clearing browser data will remove all media
3. **Backup Recommended**: Use the "Backup Media" button regularly to export media to JSON
4. **Cross-Device**: Media won't sync across devices automatically. Use backup/restore for migration

## Database Schema

```sql
-- Media stored in whatsapp_media_library table
file_url VARCHAR(500)  -- Stores relative path like "General/image-123456.jpg"
file_name VARCHAR(255) -- Original filename
file_type VARCHAR(20)  -- 'image', 'video', 'audio', or 'document'
folder VARCHAR(100)    -- Folder name (e.g., 'General', 'Products')
```

## Future Enhancements

- [ ] IndexedDB for larger storage capacity
- [ ] Server-side storage option for production deployments
- [ ] Cloud sync across devices
- [ ] Automatic compression for images
- [ ] CDN integration for better performance

## API Usage

```typescript
import { localMediaStorage } from '@/lib/localMediaStorage';

// Upload media
const result = await localMediaStorage.uploadMedia(file, 'General');

// Get media URL
const url = localMediaStorage.getMediaUrl('General/image-123456.jpg');

// Delete media
localMediaStorage.deleteMedia('General/image-123456.jpg');

// Backup all media
const backup = localMediaStorage.exportAllMedia();

// Restore media
localMediaStorage.importMedia(backupData);
```

## Troubleshooting

**Q: Images not loading?**
A: Check browser console for errors. Try the "Reload All Images" button in Media Library.

**Q: Storage quota exceeded?**
A: Delete unused media or export/clear old media. Consider upgrading to IndexedDB storage.

**Q: Lost media after clearing browser?**
A: Use the "Backup Media" feature regularly to export media to JSON file.

**Q: How to migrate media to new device?**
A: Export media on old device, import the JSON file on new device.

---

Last Updated: December 2025

