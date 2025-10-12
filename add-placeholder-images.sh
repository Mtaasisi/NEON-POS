#!/bin/bash

# Add placeholder images to all products for testing

echo "🖼️  Adding placeholder images to all products..."
echo ""

export $(cat server/.env | grep DATABASE_URL | xargs)

psql "$DATABASE_URL" << 'EOF'
-- Add placeholder images to products without images
INSERT INTO product_images (product_id, image_url, thumbnail_url, file_name, is_primary, display_order, file_size)
SELECT 
  id,
  'https://via.placeholder.com/800x600/0066CC/FFFFFF?text=' || REPLACE(name, ' ', '+'),
  'https://via.placeholder.com/200x150/0066CC/FFFFFF?text=' || SUBSTRING(REPLACE(name, ' ', '+'), 1, 15),
  LOWER(REPLACE(name, ' ', '-')) || '-placeholder.jpg',
  true,
  1,
  50000
FROM lats_products
WHERE NOT EXISTS (
  SELECT 1 FROM product_images WHERE product_id = lats_products.id
);

-- Show results
SELECT 
  p.name as product_name,
  COUNT(pi.id) as image_count,
  MAX(pi.image_url) as sample_image_url
FROM lats_products p
LEFT JOIN product_images pi ON p.id = pi.product_id
GROUP BY p.id, p.name
ORDER BY p.name;
EOF

echo ""
echo "✅ Done! All products now have placeholder images."
echo ""
echo "🎯 Next steps:"
echo "   1. Refresh your browser"
echo "   2. Images should now show in POS and Inventory"
echo "   3. Try uploading a real image to replace placeholder"
echo ""

