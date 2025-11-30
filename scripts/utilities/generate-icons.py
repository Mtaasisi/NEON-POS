#!/usr/bin/env python3
"""
Generate Android app icons for POS Mobile
"""

import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("❌ PIL/Pillow not installed. Installing now...")
    os.system("pip3 install Pillow")
    from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    """Create a single icon of specified size"""
    # Create image with gradient-like background
    img = Image.new('RGB', (size, size), color='#667eea')
    draw = ImageDraw.Draw(img)
    
    # Draw gradient effect (simple two-tone)
    for y in range(size):
        # Interpolate between two colors
        ratio = y / size
        r1, g1, b1 = 102, 126, 234  # #667eea
        r2, g2, b2 = 118, 75, 162    # #764ba2
        
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    
    # Draw white text "POS"
    try:
        # Try to use a nice font
        font_size = int(size * 0.35)
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # Fallback to default
        font = ImageFont.load_default()
    
    text = "POS"
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center text
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]
    
    # Draw text with shadow for depth
    shadow_offset = max(2, size // 100)
    draw.text((x + shadow_offset, y + shadow_offset), text, fill=(0, 0, 0, 128), font=font)
    draw.text((x, y), text, fill='white', font=font)
    
    # Draw decorative circle
    circle_radius = int(size * 0.39)
    circle_center = size // 2
    circle_bbox = [
        circle_center - circle_radius,
        circle_center - circle_radius,
        circle_center + circle_radius,
        circle_center + circle_radius
    ]
    draw.ellipse(circle_bbox, outline=(255, 255, 255, 80), width=max(2, size // 64))
    
    return img

def main():
    print("🎨 Generating POS Mobile App Icons...")
    print("=" * 50)
    
    # Define icon sizes for different densities
    sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }
    
    # Base path
    base_path = Path('android/app/src/main/res')
    
    # Create icons for each density
    for folder, size in sizes.items():
        print(f"📦 Creating {folder} ({size}x{size})...")
        
        # Create folder if it doesn't exist
        folder_path = base_path / folder
        folder_path.mkdir(parents=True, exist_ok=True)
        
        # Generate icon
        icon = create_icon(size)
        
        # Save as ic_launcher.png
        icon_path = folder_path / 'ic_launcher.png'
        icon.save(icon_path, 'PNG')
        print(f"   ✅ Saved: {icon_path}")
        
        # Also save as ic_launcher_round.png
        icon_round_path = folder_path / 'ic_launcher_round.png'
        icon.save(icon_round_path, 'PNG')
        print(f"   ✅ Saved: {icon_round_path}")
    
    # Create a 512x512 icon for Play Store
    print(f"\n🎯 Creating Play Store icon (512x512)...")
    playstore_icon = create_icon(512)
    playstore_icon.save('android/ic_launcher-playstore.png', 'PNG')
    print(f"   ✅ Saved: android/ic_launcher-playstore.png")
    
    print("\n" + "=" * 50)
    print("✅ All icons generated successfully!")
    print("\n📋 Next steps:")
    print("   1. Icons are placed in android/app/src/main/res/mipmap-*/")
    print("   2. Rebuild your APK: ./build-apk.sh")
    print("   3. Your app will now have a custom icon!")

if __name__ == '__main__':
    main()

