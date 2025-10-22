# 🎨 Background Removal Tool

An integrated background removal tool for your POS system that uses AI to automatically remove backgrounds from images.

## Features

- 🚀 **Automatic Background Removal** - AI-powered background removal using rembg
- 🎯 **Drag & Drop Upload** - Easy image upload interface
- 👀 **Live Preview** - See before and after comparison
- 💾 **Instant Download** - Download processed images with transparent backgrounds
- 🎨 **Beautiful UI** - Modern, intuitive interface with gradient design
- ⚡ **Fast Processing** - Process images in seconds

## Prerequisites

All Python packages should already be installed from the previous setup:
- Python 3.10+
- `rembg` - Background removal library
- `onnxruntime` - AI model runtime
- `Pillow` - Image processing
- `Flask` - API server
- `flask-cors` - CORS support

## Quick Start

### 1. Start the Background Removal API

```bash
# Make the script executable (first time only)
chmod +x start-bg-removal.sh

# Start the API server
./start-bg-removal.sh
```

Or start manually:
```bash
python3 bg-removal-api.py
```

The API will start on `http://localhost:5001`

### 2. Start Your Development Server

In a new terminal:
```bash
npm run dev
```

### 3. Access the Tool

Open your browser and navigate to:
```
http://localhost:5173/background-removal
```

## How to Use

1. **Upload Image**
   - Drag and drop an image onto the upload area, or
   - Click "Browse Files" to select an image

2. **Automatic Processing**
   - The image is automatically processed when uploaded
   - Wait a few seconds for the AI to remove the background

3. **View Results**
   - Compare the original image with the processed version
   - The processed image shows a transparent background (checkered pattern)

4. **Download**
   - Click "Download Result" to save the image with transparent background
   - The file will be saved as PNG format with "_no_bg" suffix

5. **Process More Images**
   - Click "Clear & Upload New" to process another image

## Supported Image Formats

- PNG
- JPG/JPEG
- GIF
- WEBP
- BMP

## API Endpoints

### Remove Background
- **URL**: `http://localhost:5001/api/remove-background`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Body**: `image` (file)
- **Response**: PNG image with transparent background

### Health Check
- **URL**: `http://localhost:5001/api/health`
- **Method**: GET
- **Response**: JSON status

## Troubleshooting

### API Connection Error
If you see "Failed to remove background. Make sure the API is running":
- Make sure the API server is running on port 5001
- Check the terminal for any error messages
- Restart the API server

### Port Already in Use
If port 5001 is already in use:
1. Edit `bg-removal-api.py` and change the port number
2. Update the `API_URL` in `src/pages/BackgroundRemovalPage.tsx` to match

### Slow Processing
First-time processing may take longer as it downloads the AI model (~176MB).
Subsequent processing should be faster.

## Architecture

```
┌─────────────────┐
│   React Frontend │  (Port 5173)
│  Background      │
│  Removal Page    │
└────────┬─────────┘
         │
         │ HTTP POST
         │
┌────────▼─────────┐
│   Flask API      │  (Port 5001)
│   bg-removal-api │
└────────┬─────────┘
         │
         │ Process
         │
┌────────▼─────────┐
│   rembg Library  │
│   AI Model       │
│   (u2net)        │
└──────────────────┘
```

## File Structure

```
POS-main NEON DATABASE/
├── bg-removal-api.py           # Flask API server
├── start-bg-removal.sh         # Startup script
├── src/
│   └── pages/
│       └── BackgroundRemovalPage.tsx  # React frontend
└── BACKGROUND_REMOVAL_README.md
```

## Performance Tips

- **First Run**: The first time you process an image, the AI model (~176MB) will be downloaded to `~/.u2net/`. This is a one-time download.
- **Batch Processing**: For multiple images, process them one at a time for best results.
- **Image Size**: Larger images take longer to process. Consider resizing very large images first.

## Notes

- Processed images are always exported as PNG to preserve transparency
- The API runs locally on your machine - no data is sent to external servers
- The AI model is downloaded once and cached for future use

## Future Enhancements

Potential features to add:
- Batch processing support
- Custom background colors
- Image editing tools (crop, resize, rotate)
- History of processed images
- Background replacement (not just removal)

---

**Made with ❤️ for your POS System**

