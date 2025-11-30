#!/bin/bash

# Stock Transfer Installation Script
# Run this to install all database functions and policies

echo "🚀 Installing Stock Transfer System..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo "Please set it first:"
    echo "  export DATABASE_URL='your-database-connection-string'"
    exit 1
fi

echo "✅ Database URL found"
echo ""

# Install functions
echo "📦 Installing database functions..."
psql "$DATABASE_URL" -f migrations/ensure-stock-transfer-functions.sql
if [ $? -eq 0 ]; then
    echo "✅ Functions installed successfully"
else
    echo "❌ Error installing functions"
    exit 1
fi

echo ""

# Install RLS policies
echo "🔒 Installing RLS policies..."
psql "$DATABASE_URL" -f migrations/fix-rls-policies-stock-transfer.sql
if [ $? -eq 0 ]; then
    echo "✅ RLS policies installed successfully"
else
    echo "❌ Error installing RLS policies"
    exit 1
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Open your app in a browser"
echo "2. Open browser console (F12)"
echo "3. Set branch ID:"
echo "   const { data } = await supabase.from('store_locations').select('id, name').eq('is_active', true);"
echo "   localStorage.setItem('current_branch_id', data[0].id);"
echo "   location.reload();"
echo ""
echo "4. Navigate to Stock Transfers page"
echo "5. Try creating a transfer"
echo ""
echo "📚 For help, see: README_STOCK_TRANSFER.md"
