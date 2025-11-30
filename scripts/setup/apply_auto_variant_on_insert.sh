#!/bin/bash

# =====================================================
# Apply Auto-Variant Creation on Product Insert
# =====================================================
# This script enables automatic default variant creation
# for all new products created in the system.

echo "🚀 Applying Auto-Variant Creation Feature..."
echo ""

# Check if NEON_CONNECTION_STRING is set
if [ -z "$NEON_CONNECTION_STRING" ]; then
    echo "⚠️  NEON_CONNECTION_STRING environment variable not set"
    echo ""
    echo "Please set it using:"
    echo "export NEON_CONNECTION_STRING='your_connection_string_here'"
    echo ""
    echo "Or provide it as an argument:"
    echo "./apply_auto_variant_on_insert.sh 'your_connection_string_here'"
    echo ""
    
    # Check if connection string was provided as argument
    if [ -n "$1" ]; then
        NEON_CONNECTION_STRING="$1"
        echo "✅ Using connection string from argument"
    else
        exit 1
    fi
fi

echo "📝 Applying migration: enable_auto_variant_creation_on_product_insert.sql"
echo ""

# Apply the migration
psql "$NEON_CONNECTION_STRING" -f migrations/enable_auto_variant_creation_on_product_insert.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "🎉 Products will now automatically get a 'Default' variant when created!"
    echo ""
    echo "✨ Benefits:"
    echo "  • No need to manually create variants for simple products"
    echo "  • Products are immediately usable in POs and sales"
    echo "  • Automatic stock and pricing inheritance"
    echo "  • Faster product creation workflow"
    echo ""
    echo "📖 Read AUTO_CREATE_VARIANTS_ON_PRODUCT_INSERT.md for detailed usage"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again"
    exit 1
fi

