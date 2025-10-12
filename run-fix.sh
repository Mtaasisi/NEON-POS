#!/bin/bash

# ================================================================================
# Auto-run the variant column fix
# ================================================================================
# Usage: ./run-fix.sh "your-connection-string"
# Example: ./run-fix.sh "postgresql://user:pass@host/db"
# ================================================================================

if [ -z "$1" ]; then
    echo "❌ Error: No connection string provided"
    echo ""
    echo "Usage: ./run-fix.sh \"your-neon-connection-string\""
    echo ""
    echo "Get your connection string from:"
    echo "https://console.neon.tech → Your Project → Connection Details"
    exit 1
fi

CONNECTION_STRING="$1"

echo "🔧 Running fix on database..."
echo ""

psql "$CONNECTION_STRING" << 'EOF'
BEGIN;

UPDATE lats_product_variants 
SET name = variant_name 
WHERE name IS NULL AND variant_name IS NOT NULL;

ALTER TABLE lats_product_variants DROP COLUMN variant_name;

COMMIT;

SELECT '✅ Fixed! You can now create products.' as result;
EOF

echo ""
echo "✅ Done! Refresh your app and try creating a product."
