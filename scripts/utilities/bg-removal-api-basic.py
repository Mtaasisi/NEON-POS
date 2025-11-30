#!/usr/bin/env python3
"""
Background Removal API - Quick Start Version
Uses the U2Net model you already have downloaded for immediate use
"""
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from rembg import remove
from PIL import Image, ImageFilter
import io
import os
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

print("✅ Using U2Net model (already downloaded)")

@app.route('/api/remove-background', methods=['POST'])
def remove_background():
    """Remove background with quality optimization"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read and prepare image
        input_image = Image.open(file.stream)
        
        # Convert to RGB for better processing
        if input_image.mode == 'RGBA':
            background = Image.new('RGB', input_image.size, (255, 255, 255))
            background.paste(input_image, mask=input_image.split()[3])
            input_image = background
        elif input_image.mode != 'RGB':
            input_image = input_image.convert('RGB')
        
        print(f"🎨 Processing: {file.filename}")
        
        # Remove background with ENHANCED settings
        output_image = remove(
            input_image,
            alpha_matting=True,                      # Better edges
            alpha_matting_foreground_threshold=240,  # Keep subject details
            alpha_matting_background_threshold=10,   # Remove background
            alpha_matting_erode_size=10,            # Smooth edges
            post_process_mask=True                  # Clean mask
        )
        
        # Refine edges
        output_image = refine_edges(output_image)
        
        print("✅ Done!")
        
        # Save with optimization
        img_io = io.BytesIO()
        output_image.save(img_io, 'PNG', optimize=True)
        img_io.seek(0)
        
        return send_file(
            img_io,
            mimetype='image/png',
            as_attachment=True,
            download_name=f"{os.path.splitext(file.filename)[0]}_no_bg.png"
        )
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

def refine_edges(image):
    """Refine edges for better quality"""
    try:
        img_array = np.array(image)
        if img_array.shape[2] == 4:
            alpha = Image.fromarray(img_array[:, :, 3])
            alpha = alpha.filter(ImageFilter.SMOOTH)
            alpha = alpha.filter(ImageFilter.UnsharpMask(radius=1, percent=50, threshold=2))
            img_array[:, :, 3] = np.array(alpha)
            return Image.fromarray(img_array)
        return image
    except:
        return image

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'Background removal API (Quick Start)',
        'model': 'u2net (optimized settings)'
    })

if __name__ == '__main__':
    print("🎨 Background Removal API - Quick Start")
    print("📍 http://localhost:5001")
    print("✨ Using optimized settings:")
    print("   - Alpha matting enabled")
    print("   - Edge refinement active")
    print("   - Smart thresholds for precision")
    app.run(host='0.0.0.0', port=5001, debug=True)

