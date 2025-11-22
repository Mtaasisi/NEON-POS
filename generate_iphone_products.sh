#!/bin/bash

# iPhone 17 Series Product Generator Script
# This script creates a comprehensive CSV file with iPhone 17 series products
# including all storage variants, detailed specifications, and special features

echo "📱 Generating iPhone 17 Series Products CSV..."

# Create the CSV file with headers
cat > iphone_products.csv << 'EOF'
Product Name,Category Name,Supplier Name,Price,Cost Price,Stock Quantity,Min Stock Level,Specification,Variant Name,Variant Quantity,Variant Min Quantity
EOF

echo "📱 Adding iPhone 17 Series..."

# iPhone 17 Series
cat >> iphone_products.csv << 'EOF'
iPhone 17,Smartphones,Apple,0,0,0,0,"6.1"" Super Retina XDR OLED, 120Hz ProMotion, A19 Bionic chip, 8GB RAM, 3,600mAh battery, iOS 18, Dual 48MP+12MP rear, 12MP front, Ceramic Shield, USB-C, 5G, Face ID, MagSafe wireless charging",128GB Storage,0,0
iPhone 17,Smartphones,,0,0,0,0,"6.1"" Super Retina XDR OLED, 120Hz ProMotion, A19 Bionic chip, 8GB RAM, 3,600mAh battery, iOS 18, Dual 48MP+12MP rear, 12MP front, Ceramic Shield, USB-C, 5G, Face ID, MagSafe wireless charging",256GB Storage,0,0
iPhone 17,Smartphones,,0,0,0,0,"6.1"" Super Retina XDR OLED, 120Hz ProMotion, A19 Bionic chip, 8GB RAM, 3,600mAh battery, iOS 18, Dual 48MP+12MP rear, 12MP front, Ceramic Shield, USB-C, 5G, Face ID, MagSafe wireless charging",512GB Storage,0,0
iPhone 17 Plus,Smartphones,,0,0,0,0,"6.7"" Super Retina XDR OLED, 120Hz ProMotion, A19 Bionic chip, 8GB RAM, 4,200mAh battery, iOS 18, Dual 48MP+12MP rear, 12MP front, Ceramic Shield, USB-C, 5G, Face ID, MagSafe wireless charging, 25W fast charging",128GB Storage,0,0
iPhone 17 Plus,Smartphones,,0,0,0,0,"6.7"" Super Retina XDR OLED, 120Hz ProMotion, A19 Bionic chip, 8GB RAM, 4,200mAh battery, iOS 18, Dual 48MP+12MP rear, 12MP front, Ceramic Shield, USB-C, 5G, Face ID, MagSafe wireless charging, 25W fast charging",256GB Storage,0,0
iPhone 17 Plus,Smartphones,,0,0,0,0,"6.7"" Super Retina XDR OLED, 120Hz ProMotion, A19 Bionic chip, 8GB RAM, 4,200mAh battery, iOS 18, Dual 48MP+12MP rear, 12MP front, Ceramic Shield, USB-C, 5G, Face ID, MagSafe wireless charging, 25W fast charging",512GB Storage,0,0
iPhone 17 Plus,Smartphones,,0,0,0,0,"6.7"" Super Retina XDR OLED, 120Hz ProMotion, A19 Bionic chip, 8GB RAM, 4,200mAh battery, iOS 18, Dual 48MP+12MP rear, 12MP front, Ceramic Shield, USB-C, 5G, Face ID, MagSafe wireless charging, 25W fast charging",1TB Storage,0,0
iPhone 17 Pro,Smartphones,,0,0,0,0,"6.3"" Super Retina XDR OLED, 120Hz ProMotion, A19 Pro Bionic chip, 8GB RAM, 3,800mAh battery, iOS 18, Pro camera system 48MP+12MP+12MP rear, 12MP front, Ceramic Shield Pro, Titanium design, USB-C, 5G, Face ID, Action Button, MagSafe wireless charging, 30W fast charging",128GB Storage,0,0
iPhone 17 Pro,Smartphones,,0,0,0,0,"6.3"" Super Retina XDR OLED, 120Hz ProMotion, A19 Pro Bionic chip, 8GB RAM, 3,800mAh battery, iOS 18, Pro camera system 48MP+12MP+12MP rear, 12MP front, Ceramic Shield Pro, Titanium design, USB-C, 5G, Face ID, Action Button, MagSafe wireless charging, 30W fast charging",256GB Storage,0,0
iPhone 17 Pro,Smartphones,,0,0,0,0,"6.3"" Super Retina XDR OLED, 120Hz ProMotion, A19 Pro Bionic chip, 8GB RAM, 3,800mAh battery, iOS 18, Pro camera system 48MP+12MP+12MP rear, 12MP front, Ceramic Shield Pro, Titanium design, USB-C, 5G, Face ID, Action Button, MagSafe wireless charging, 30W fast charging",512GB Storage,0,0
iPhone 17 Pro,Smartphones,,0,0,0,0,"6.3"" Super Retina XDR OLED, 120Hz ProMotion, A19 Pro Bionic chip, 8GB RAM, 3,800mAh battery, iOS 18, Pro camera system 48MP+12MP+12MP rear, 12MP front, Ceramic Shield Pro, Titanium design, USB-C, 5G, Face ID, Action Button, MagSafe wireless charging, 30W fast charging",1TB Storage,0,0
iPhone 17 Pro Max,Smartphones,,0,0,0,0,"6.9"" Super Retina XDR OLED, 120Hz ProMotion, A19 Pro Bionic chip, 8GB RAM, 4,850mAh battery, iOS 18, Pro camera system 48MP+12MP+12MP rear, 12MP front, Ceramic Shield Pro, Titanium design, USB-C, 5G, Face ID, Action Button, MagSafe wireless charging, 35W fast charging, 5x Telephoto zoom",256GB Storage,0,0
iPhone 17 Pro Max,Smartphones,,0,0,0,0,"6.9"" Super Retina XDR OLED, 120Hz ProMotion, A19 Pro Bionic chip, 8GB RAM, 4,850mAh battery, iOS 18, Pro camera system 48MP+12MP+12MP rear, 12MP front, Ceramic Shield Pro, Titanium design, USB-C, 5G, Face ID, Action Button, MagSafe wireless charging, 35W fast charging, 5x Telephoto zoom",512GB Storage,0,0
iPhone 17 Pro Max,Smartphones,,0,0,0,0,"6.9"" Super Retina XDR OLED, 120Hz ProMotion, A19 Pro Bionic chip, 8GB RAM, 4,850mAh battery, iOS 18, Pro camera system 48MP+12MP+12MP rear, 12MP front, Ceramic Shield Pro, Titanium design, USB-C, 5G, Face ID, Action Button, MagSafe wireless charging, 35W fast charging, 5x Telephoto zoom",1TB Storage,0,0
EOF

echo "✅ iPhone 17 Series products CSV generated successfully!"
echo ""
echo "📊 Summary:"
echo "- 14 Total Products (4 models × multiple storage variants)"
echo "- Complete specifications with expected iPhone 17 features"
echo "- All storage variants based on typical Apple offerings"
echo "- Special features and capabilities included"
echo "- Prices and quantities set to 0 (ready for import)"
echo ""
echo "📁 File: iphone_products.csv"
echo "🚀 Ready for import into your inventory system!"
