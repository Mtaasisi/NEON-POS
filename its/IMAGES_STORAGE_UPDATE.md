# Images Storage Update - Local Build Storage

## Overview

All images in the Media Library are now stored locally inside the build in the `/public/images/` folder. The database stores only the filename (e.g., `food1-1234567890-abc123.jpg`), and the application constructs the full path (`/images/food1-1234567890-abc123.jpg`) when rendering.

## Changes Made

### 1. Created `/public/images/` Folder
- Created `public/images/` directory for storing image files
- Added `.gitkeep` to ensure the folder is tracked in git
- Images are served statically from this folder

### 2. New Image Storage Service (`src/lib/imageStorage.ts`)
- `ImageStorageService` handles image uploads to `/public/images/`
- Validates file types (JPEG, PNG, WebP, GIF)
- Generates safe filenames with timestamps and random IDs
- Provides `getImageUrl()` to construct full paths from filenames
- Handles image deletion

### 3. API Endpoints (`server/api.mjs`)
- **POST `/api/upload-image`**: Uploads images to `public/images/` folder
- **DELETE `/api/delete-image`**: Deletes images from `public/images/` folder
- Images are served statically via `/images` route

### 4. Updated WhatsApp Advanced Service (`src/services/whatsappAdvancedService.ts`)
- **Upload**: 
  - Images → Saved to `/public/images/` via API, filename stored in DB
  - Other media (videos, documents, audio) → Still use localStorage
- **Get All**: Constructs `/images/` URLs from stored filenames
- **Delete**: Deletes images from `/public/images/` folder

### 5. Updated Media Library Modal (`src/features/whatsapp/components/MediaLibraryModal.tsx`)
- Handles `/images/` paths correctly
- No longer tries to load images from localStorage
- Improved error handling for missing images

## Database Schema

The `whatsapp_media_library` table stores:
- **Images**: Only the filename (e.g., `food1-1234567890-abc123.jpg`)
- **Other media**: Relative path (e.g., `General/video-1234567890-abc123.mp4`)

## File Paths

### Images
- **Stored in DB**: `food1-1234567890-abc123.jpg`
- **Rendered URL**: `/images/food1-1234567890-abc123.jpg`
- **Physical location**: `public/images/food1-1234567890-abc123.jpg`

### Other Media (Videos, Documents, Audio)
- **Stored in DB**: `General/video-1234567890-abc123.mp4`
- **Rendered URL**: Base64 data URL from localStorage
- **Physical location**: Browser localStorage (not physical files)

## Build Process

When building the project:
1. Vite copies `public/images/` to `dist/images/`
2. All images in `public/images/` are included in the build output
3. Images are served as static assets

## Usage

### Uploading an Image
```typescript
import { imageStorage } from '@/lib/imageStorage';

const result = await imageStorage.uploadImage(file);
// Returns: { success: true, filename: 'food1-1234567890-abc123.jpg', path: 'images/food1-1234567890-abc123.jpg' }
```

### Getting Image URL
```typescript
const url = imageStorage.getImageUrl('food1-1234567890-abc123.jpg');
// Returns: '/images/food1-1234567890-abc123.jpg'
```

### In Media Library Service
Images are automatically handled:
- Uploaded via `whatsappAdvancedService.mediaLibrary.upload(file, folder)`
- URLs are constructed automatically when retrieving media
- No external URLs required

## Benefits

1. ✅ **No External Dependencies**: Images stored locally in build
2. ✅ **Fast Loading**: Static files served directly
3. ✅ **Build-Friendly**: Images included in dist output
4. ✅ **Simple Paths**: Just filename in database, full path constructed when needed
5. ✅ **No External URLs**: All images are local

## Migration Notes

- Existing images in localStorage will continue to work
- New image uploads go to `/public/images/`
- Old images can be migrated by re-uploading them
- Non-image files (videos, documents, audio) still use localStorage
