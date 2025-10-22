#!/bin/bash
# Start Background Removal API

echo "🎨 Starting Background Removal API..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install it first."
    exit 1
fi

# Check if required packages are installed
echo "📦 Checking required packages..."
python3 -c "import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing Flask..."
    pip3 install flask flask-cors
fi

python3 -c "import rembg" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ rembg is not installed. It should already be installed."
    echo "If not, run: pip3 install rembg onnxruntime"
    exit 1
fi

echo ""
echo "✅ All packages installed!"
echo ""
echo "🚀 Starting API server..."
echo "📍 API will be available at: http://localhost:5001"
echo "🔗 Frontend page: http://localhost:5173/background-removal"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the API
python3 bg-removal-api.py

