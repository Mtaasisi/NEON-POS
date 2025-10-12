#!/bin/bash

# 🔍 Schema Comparison Script
# Compares development and production database schemas

set -e

echo "🔍 Neon Database Schema Comparison Tool"
echo "========================================"
echo ""

# Database connections
DEV_DB="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-dry-brook-ad3duuog-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
PROD_DB="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo "📊 Exporting schemas..."
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump not found"
    echo "📝 Please install PostgreSQL client tools:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Export dev schema
echo "1️⃣  Exporting DEVELOPMENT schema..."
pg_dump "$DEV_DB" \
    --schema-only \
    --no-owner \
    --no-acl \
    --no-privileges \
    > dev-schema.sql 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Development schema exported (dev-schema.sql)"
else
    echo "   ❌ Failed to export development schema"
    exit 1
fi

# Export prod schema
echo "2️⃣  Exporting PRODUCTION schema..."
pg_dump "$PROD_DB" \
    --schema-only \
    --no-owner \
    --no-acl \
    --no-privileges \
    > prod-schema.sql 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Production schema exported (prod-schema.sql)"
else
    echo "   ❌ Failed to export production schema"
    exit 1
fi

echo ""
echo "📝 Comparing schemas..."
echo ""

# Generate diff
diff -u prod-schema.sql dev-schema.sql > schema-diff.txt || true

if [ -s schema-diff.txt ]; then
    echo "✅ Schema differences found!"
    echo ""
    echo "📁 Files created:"
    echo "   - dev-schema.sql      (Development schema)"
    echo "   - prod-schema.sql     (Production schema)"
    echo "   - schema-diff.txt     (Differences)"
    echo ""
    echo "📊 Summary of changes:"
    echo ""
    
    # Count changes
    ADDED=$(grep "^+" schema-diff.txt | grep -v "^+++" | wc -l | tr -d ' ')
    REMOVED=$(grep "^-" schema-diff.txt | grep -v "^---" | wc -l | tr -d ' ')
    
    echo "   📈 Lines added: $ADDED"
    echo "   📉 Lines removed: $REMOVED"
    echo ""
    
    # Show preview
    echo "🔍 Preview of differences:"
    echo "=========================="
    head -50 schema-diff.txt
    echo ""
    echo "... (see schema-diff.txt for full diff)"
    echo ""
    
    # Extract table changes
    echo "📋 New/Modified Tables:"
    grep -E "^[+-]\s*CREATE TABLE" schema-diff.txt | sed 's/^[+-]/  /' || echo "   None found"
    echo ""
    
    # Extract function changes
    echo "⚙️  New/Modified Functions:"
    grep -E "^[+-]\s*CREATE.*FUNCTION" schema-diff.txt | sed 's/^[+-]/  /' || echo "   None found"
    echo ""
    
else
    echo "✅ No schema differences found!"
    echo "   Development and Production schemas are identical."
fi

echo ""
echo "🚀 Next Steps:"
echo "============="
echo ""
echo "1. Review the differences:"
echo "   cat schema-diff.txt"
echo ""
echo "2. Create migration script from differences:"
echo "   nano migration.sql"
echo ""
echo "3. Test migration on a branch first!"
echo ""
echo "4. Apply to production (when ready):"
echo "   psql \"\$PROD_DB\" -f migration.sql"
echo ""

# Cleanup option
read -p "🗑️  Delete exported schema files? (y/N): " cleanup
if [ "$cleanup" = "y" ] || [ "$cleanup" = "Y" ]; then
    rm -f dev-schema.sql prod-schema.sql
    echo "   ✅ Schema files deleted (kept schema-diff.txt)"
else
    echo "   📁 Files kept for review"
fi

echo ""
echo "✨ Done!"

