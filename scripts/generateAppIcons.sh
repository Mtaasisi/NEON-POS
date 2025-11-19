#!/bin/bash

##############################################
# Android App Icon Generator
# Generates all required icon sizes for Android
##############################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎨 Android App Icon Generator${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick is not installed!${NC}"
    echo -e "${YELLOW}Install it with:${NC}"
    echo -e "  macOS: brew install imagemagick"
    echo -e "  Linux: sudo apt-get install imagemagick"
    echo -e "  Windows: Download from https://imagemagick.org/script/download.php"
    exit 1
fi

# Check if source logo is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}📁 Usage: ./generateAppIcons.sh <path-to-logo.png>${NC}"
    echo -e "${YELLOW}Example: ./generateAppIcons.sh ../public/logo.png${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Logo requirements:${NC}"
    echo -e "  • Size: At least 1024x1024 pixels (recommended)"
    echo -e "  • Format: PNG with transparency"
    echo -e "  • Shape: Square"
    echo ""
    exit 1
fi

SOURCE_LOGO="$1"

# Check if source file exists
if [ ! -f "$SOURCE_LOGO" ]; then
    echo -e "${RED}❌ Error: File not found: $SOURCE_LOGO${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found logo: $SOURCE_LOGO${NC}"

# Get image dimensions
DIMENSIONS=$(identify -format "%wx%h" "$SOURCE_LOGO")
echo -e "${BLUE}📐 Dimensions: $DIMENSIONS${NC}\n"

# Base directory
ANDROID_RES="../android/app/src/main/res"

# Icon sizes for different densities
declare -A SIZES=(
    ["mdpi"]="48"
    ["hdpi"]="72"
    ["xhdpi"]="96"
    ["xxhdpi"]="144"
    ["xxxhdpi"]="192"
)

# Generate icons
echo -e "${BLUE}🔄 Generating app icons...${NC}\n"

for density in "${!SIZES[@]}"; do
    size="${SIZES[$density]}"
    output_dir="$ANDROID_RES/mipmap-$density"
    
    mkdir -p "$output_dir"
    
    echo -e "${YELLOW}  📱 $density (${size}x${size})${NC}"
    
    # Main launcher icon
    convert "$SOURCE_LOGO" -resize ${size}x${size} "$output_dir/ic_launcher.png"
    echo -e "    ✓ ic_launcher.png"
    
    # Round launcher icon
    convert "$SOURCE_LOGO" -resize ${size}x${size} \
        \( +clone -threshold -1 -negate -fill white -draw "circle $(($size/2)),$(($size/2)) $(($size/2)),0" \) \
        -alpha off -compose copy_opacity -composite \
        "$output_dir/ic_launcher_round.png"
    echo -e "    ✓ ic_launcher_round.png"
    
    # Foreground icon (adaptive icon)
    convert "$SOURCE_LOGO" -resize ${size}x${size} "$output_dir/ic_launcher_foreground.png"
    echo -e "    ✓ ic_launcher_foreground.png"
    
    echo ""
done

# Generate Play Store icon (512x512)
echo -e "${BLUE}🎮 Generating Play Store icon (512x512)...${NC}"
convert "$SOURCE_LOGO" -resize 512x512 "$ANDROID_RES/../ic_launcher-playstore.png"
echo -e "${GREEN}  ✓ ic_launcher-playstore.png${NC}\n"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ SUCCESS! All icons generated!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}📦 Generated files:${NC}"
echo -e "  • 5 density variants (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)"
echo -e "  • 3 icons per density (launcher, round, foreground)"
echo -e "  • 1 Play Store icon (512x512)"
echo -e "  ${GREEN}Total: 16 icon files${NC}\n"

echo -e "${YELLOW}📱 Next steps:${NC}"
echo -e "  1. Rebuild your APK: cd android && ./gradlew assembleDebug"
echo -e "  2. Your app will now have the new icon!"
echo -e ""
echo -e "${BLUE}🎉 Done!${NC}"

