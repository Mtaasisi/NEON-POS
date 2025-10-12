#!/bin/bash

# ============================================================================
# AUTO-FIX: Product Deletion Issues
# ============================================================================
# This script automatically runs the product deletion fix
# ============================================================================

echo ""
echo "🔧 AUTO-FIX: Product Deletion Issues"
echo "===================================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$NEON_DATABASE_URL" ]; then
  echo "❌ Error: No database connection string found!"
  echo ""
  echo "Please set DATABASE_URL or NEON_DATABASE_URL environment variable"
  echo ""
  echo "Example:"
  echo "  export DATABASE_URL='postgresql://user:password@host/database'"
  echo "  ./run-fix.sh"
  echo ""
  echo "Or run with inline variable:"
  echo "  DATABASE_URL='postgresql://user:password@host/database' ./run-fix.sh"
  echo ""
  exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed"
  echo ""
  echo "Please install Node.js from https://nodejs.org"
  echo ""
  exit 1
fi

# Run the fix script
echo "🚀 Running automatic fix..."
echo ""

node auto-fix-product-deletion.mjs

exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo ""
  echo "✅ Fix completed successfully!"
  echo ""
else
  echo ""
  echo "❌ Fix failed. Please check the error messages above."
  echo ""
  echo "📖 For manual fix:"
  echo "   1. Open Neon Database SQL Editor"
  echo "   2. Copy contents of fix-product-deletion.sql"
  echo "   3. Paste and run in SQL Editor"
  echo ""
  exit 1
fi

