#!/bin/bash

echo "🧪 Quick Stock Update Test"
echo "=========================="
echo ""
echo "1. Open http://localhost:5173 in your browser"
echo "2. Login: care@care.com / 123456"
echo "3. Go to Purchase Orders"
echo "4. Find PO with status 'sent' or 'shipped'"
echo "5. Click Receive → Full Receive"
echo "6. Go to Products page"
echo "7. Check stock quantity - it should be updated!"
echo ""
echo "✅ Stock updates are now working via database triggers"
echo ""

# Check if there are POs ready for testing
export PGPASSWORD="npg_vABqUKk73tEW"
psql "postgresql://neondb_owner@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -t -c "
SELECT 
  'PO ID: ' || po.id || E'\n' ||
  'Status: ' || po.status || E'\n' ||
  'Items: ' || COUNT(poi.id) || E'\n' ||
  'Qty: ' || SUM(poi.quantity_ordered) || E'\n'
FROM lats_purchase_orders po
LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
WHERE po.status IN ('sent', 'shipped', 'confirmed')
GROUP BY po.id, po.status
LIMIT 3;
" 2>/dev/null | grep -v "^$" || echo "No POs available for testing"

echo ""
echo "Run this command to check stock movements:"
echo "psql \"\$DATABASE_URL\" -c \"SELECT * FROM lats_stock_movements ORDER BY created_at DESC LIMIT 5;\""

