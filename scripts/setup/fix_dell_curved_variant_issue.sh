#!/bin/bash

# =====================================================
# Fix Auto-Variant Race Condition & Clean Duplicates
# =====================================================
# This script fixes the duplicate variant issue and
# removes auto-created "Default" variants from products
# that already have manual variants.

echo "🔧 Fixing Auto-Variant Race Condition..."
echo ""

# Check if NEON_CONNECTION_STRING is set
if [ -z "$NEON_CONNECTION_STRING" ]; then
    echo "⚠️  NEON_CONNECTION_STRING environment variable not set"
    echo ""
    echo "Please set it using:"
    echo "export NEON_CONNECTION_STRING='your_connection_string_here'"
    echo ""
    echo "Or provide it as an argument:"
    echo "./fix_dell_curved_variant_issue.sh 'your_connection_string_here'"
    echo ""
    
    # Check if connection string was provided as argument
    if [ -n "$1" ]; then
        NEON_CONNECTION_STRING="$1"
        echo "✅ Using connection string from argument"
    else
        exit 1
    fi
fi

echo "📝 Applying fix: fix_auto_variant_race_condition.sql"
echo ""

# Apply the fix
psql "$NEON_CONNECTION_STRING" -f migrations/fix_auto_variant_race_condition.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Fix applied successfully!"
    echo ""
    echo "🎉 Changes made:"
    echo "  • Increased wait time to 500ms (prevents race condition)"
    echo "  • Improved variant checking logic"
    echo "  • Cleaned up duplicate 'Default' variants"
    echo "  • Your 'Dell Curved' product should now have only correct variants"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Refresh your product page"
    echo "  2. Verify 'Dell Curved' now has only 1 correct variant"
    echo "  3. Create new products - they should get auto-variants correctly"
else
    echo ""
    echo "❌ Fix failed!"
    echo "Please check the error messages above and try again"
    exit 1
fi

