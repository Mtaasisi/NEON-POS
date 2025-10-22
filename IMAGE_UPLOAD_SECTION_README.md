# Image Upload Section Component

Beautiful, modern image uploader with drag-and-drop support and package icon.

## Features

✅ **Drag & Drop** - Drag images directly into the upload area  
✅ **Click to Browse** - Traditional file picker support  
✅ **Image Preview** - See selected images before uploading  
✅ **Multi-file Upload** - Upload multiple images at once  
✅ **File Limit** - Set maximum number of files  
✅ **Remove Images** - Delete individual images from selection  
✅ **Beautiful UI** - Modern design with smooth animations  
✅ **Package Icon** - Your custom package icon as empty state  

## Usage

### Basic Example

```tsx
import ImageUploadSection from '@/components/ImageUploadSection';

function MyComponent() {
  const handleFilesSelected = (files: File[]) => {
    console.log('Selected files:', files);
    // Upload files here
  };

  return (
    <ImageUploadSection
      onFilesSelected={handleFilesSelected}
      maxFiles={5}
      accept="image/*"
    />
  );
}
```

### In Product Form

```tsx
import ImageUploadSection from '@/components/ImageUploadSection';

function ProductForm() {
  const [images, setImages] = useState<File[]>([]);

  return (
    <form>
      <div>
        <label className="block text-sm font-medium mb-2">
          Product Images
        </label>
        <ImageUploadSection
          onFilesSelected={setImages}
          maxFiles={5}
          accept="image/*"
          className="mb-4"
        />
      </div>
      
      <button type="submit">
        Create Product ({images.length} images)
      </button>
    </form>
  );
}
```

### With Upload Handler

```tsx
import ImageUploadSection from '@/components/ImageUploadSection';
import { UnifiedImageService } from '@/lib/unifiedImageService';

function ProductImageUpload({ productId, userId }) {
  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      const result = await UnifiedImageService.uploadImage(
        file,
        productId,
        userId,
        false
      );
      
      if (result.success) {
        console.log('✅ Uploaded:', result.image);
      } else {
        console.error('❌ Failed:', result.error);
      }
    }
  };

  return (
    <ImageUploadSection
      onFilesSelected={handleUpload}
      maxFiles={5}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onFilesSelected` | `(files: File[]) => void` | - | Callback when files are selected |
| `maxFiles` | `number` | `5` | Maximum number of files allowed |
| `accept` | `string` | `"image/*"` | File types to accept |
| `className` | `string` | `""` | Additional CSS classes |

## States

### Empty State
Shows package icon with upload instructions:
- Large package icon (80x80)
- Upload instructions text
- "Choose Files" button
- Drag & drop active area

### Files Selected
Shows grid of selected images:
- Thumbnail previews
- File names
- Remove buttons (hover to show)
- "Add More" button
- "Clear All" button

## Styling

The component uses Tailwind CSS classes. You can customize by:

1. **Override with className prop:**
```tsx
<ImageUploadSection className="shadow-lg rounded-2xl" />
```

2. **Modify component directly:**
```tsx
// Edit src/components/ImageUploadSection.tsx
// Change colors, sizes, spacing, etc.
```

## Visual States

### Normal State
- Gray border and background
- Gray package icon
- Neutral text colors

### Dragging State
- Blue border and background
- Blue package icon (scaled up)
- Blue text
- "Drop images here" message

### Hover State
- Darker border
- Slightly darker background
- Smooth transition

## File Handling

### Validation
- Only image files accepted
- Respects maxFiles limit
- File type based on `accept` prop

### Preview
- Instant preview using `URL.createObjectURL()`
- Grid layout (responsive)
- 2-5 columns based on screen size

### Removal
- Individual file removal
- "Clear All" to remove all files
- Updates callback on every change

## Browser Support

✅ Modern browsers (Chrome, Firefox, Safari, Edge)  
✅ Drag & Drop API support  
✅ FileReader API support  

## Examples

See `src/components/ImageUploadSection.example.tsx` for:
- Basic usage
- Product form integration
- Upload handling
- State management

## Integration with Your App

### Step 1: Import Component
```tsx
import ImageUploadSection from '@/components/ImageUploadSection';
```

### Step 2: Add to Form
```tsx
<ImageUploadSection
  onFilesSelected={(files) => handleFiles(files)}
  maxFiles={5}
/>
```

### Step 3: Upload Files
```tsx
const handleFiles = async (files: File[]) => {
  // Your upload logic
  for (const file of files) {
    await uploadToServer(file);
  }
};
```

## Tips

💡 **For thumbnails:** Set `maxFiles={1}` for single thumbnail upload  
💡 **For galleries:** Set `maxFiles={10}` for multiple images  
💡 **File size:** Validate file size in your upload handler  
💡 **Formats:** Use `accept=".jpg,.png,.webp"` for specific formats  

## Troubleshooting

**Images not showing:**
- Check file type matches `accept` prop
- Verify browser supports FileReader API

**Can't drag & drop:**
- Ensure browser supports Drag & Drop API
- Check for conflicting event handlers

**Too many files:**
- Check `maxFiles` prop
- Only first N files will be selected

---

**Component Location:** `src/components/ImageUploadSection.tsx`  
**Example Usage:** `src/components/ImageUploadSection.example.tsx`  
**Created:** October 2025

