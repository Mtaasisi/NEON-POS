# 🚀 Quick Start - Background Removal Tool

## ✅ What's Been Created

1. **Python API Server** (`bg-removal-api.py`)
   - Flask-based REST API for background removal
   - Uses `rembg` library with AI model
   - Runs on port 5001

2. **React Page** (`src/pages/BackgroundRemovalPage.tsx`)
   - Beautiful drag & drop interface
   - Live preview of before/after
   - Integrated into your POS app

3. **Helper Scripts**
   - `start-bg-removal.sh` - Easy startup script
   - `test-bg-removal.html` - Test the API connection

## 🎯 How to Use (2 Simple Steps)

### Step 1: Start the Background Removal API

Open a terminal and run:

```bash
./start-bg-removal.sh
```

Or manually:
```bash
python3 bg-removal-api.py
```

You should see:
```
🎨 Background Removal API Starting...
📍 API will be available at: http://localhost:5001
```

**Keep this terminal open!** The API needs to run in the background.

### Step 2: Start Your Development Server

Open a **NEW terminal** (keep the first one running) and run:

```bash
npm run dev
```

### Step 3: Access the Tool

Open your browser and go to:

```
http://localhost:5173/background-removal
```

## 📝 Testing Before Full Integration

Want to test if the API is working first?

Open `test-bg-removal.html` in your browser:

```bash
open test-bg-removal.html
```

This will check if the API is running and let you test it.

## 🎨 Using the Tool

1. **Drag & drop** an image or click "Browse Files"
2. **Wait** a few seconds for processing
3. **View** the before/after comparison
4. **Download** your image with transparent background

## 🛠️ Troubleshooting

### "Failed to remove background" error
- Make sure the API is running in a terminal
- Check that port 5001 is not blocked

### First time is slow
- The AI model (~176MB) downloads on first use
- It's saved to `~/.u2net/` for future use

### API won't start
Check if all packages are installed:
```bash
pip3 install flask flask-cors rembg onnxruntime pillow
```

## 📦 What's Installed

All Python packages are already installed:
- ✅ `rembg` - Background removal AI
- ✅ `onnxruntime` - AI model runtime  
- ✅ `Pillow` - Image processing
- ✅ `flask` - Web server
- ✅ `flask-cors` - Cross-origin support

## 🔗 URLs

- **React App**: http://localhost:5173/background-removal
- **API**: http://localhost:5001
- **API Health**: http://localhost:5001/api/health

## 💡 Pro Tips

1. **Run both servers**: Keep both the API (port 5001) and dev server (port 5173) running
2. **Use PNG files**: Best quality for transparent backgrounds
3. **Keep images reasonable**: Very large images take longer to process
4. **First run**: Be patient - the AI model downloads once

## 📊 npm Scripts

Added to your `package.json`:

```bash
npm run bg-removal    # Start the API server
npm run dev          # Start your React app
```

## 🎉 You're Ready!

Everything is set up and ready to go. Just start both servers and visit the page!

---

**Questions?** Check `BACKGROUND_REMOVAL_README.md` for detailed documentation.

