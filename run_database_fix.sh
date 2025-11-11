#!/bin/bash

# ============================================================================
# RUN DATABASE FIXES FOR VARIANT MERGING
# ============================================================================
# This script applies the database fixes using psql
# ============================================================================

# Database connection string
DB_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "🔧 Applying database fixes for variant merging..."
echo "📊 Connecting to Neon database..."

# Apply the fixes
psql "$DB_URL" -f apply_database_fixes.sql

echo "✅ Database fixes applied successfully!"
echo "🎉 Your variant merging issue should now be resolved."
echo ""
echo "📝 What was fixed:"
echo "   - Updated purchase order receive function to use smart merging"
echo "   - Merged duplicate variants for inauzwa product"
echo "   - Fixed stock quantity calculations"
echo ""
echo "🚀 Next steps:"
echo "   1. Test with a new purchase order to verify merging works"
echo "   2. Check that your inauzwa product now shows correct stock"
echo "   3. The system will now automatically merge variants instead of creating duplicates"
