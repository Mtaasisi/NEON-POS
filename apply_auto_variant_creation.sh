#!/bin/bash

# =====================================================
# Apply Auto-Variant Creation Feature
# =====================================================
# This script applies the auto-variant creation feature
# to your Neon database, allowing products without variants
# to be added to Purchase Orders.

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
    echo "./apply_auto_variant_creation.sh 'your_connection_string_here'"
    echo ""
    
    # Check if connection string was provided as argument
    if [ -n "$1" ]; then
        NEON_CONNECTION_STRING="$1"
        echo "✅ Using connection string from argument"
    else
        exit 1
    fi
fi

echo "📝 Applying migration: add_auto_variant_creation_to_po_receive.sql"
echo ""

# Apply the migration
psql "$NEON_CONNECTION_STRING" -f migrations/add_auto_variant_creation_to_po_receive.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "🎉 You can now:"
    echo "  1. Add products WITHOUT variants to Purchase Orders"
    echo "  2. Variants will be created automatically when you receive the PO"
    echo "  3. Stock and pricing will be set automatically"
    echo ""
    echo "📖 Read AUTO_VARIANT_CREATION_GUIDE.md for detailed usage instructions"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again"
    exit 1
fi

