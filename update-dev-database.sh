#!/bin/bash

# Update Development Database Connection
# This script updates .env.development to use the correct testing database

echo "🔧 Updating .env.development with correct database connection..."
echo ""

# Backup existing file
cp .env.development .env.development.backup
echo "✅ Backed up .env.development to .env.development.backup"

# Update the DATABASE_URL
sed -i '' 's|ep-dry-brook-ad3duuog-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require|ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require\&channel_binding=require|g' .env.development

# Update the comment
sed -i '' 's|ep-dry-brook-ad3duuog|ep-damp-fire-adtxvumr|g' .env.development

echo "✅ Updated .env.development"
echo ""
echo "📊 New connection:"
grep "DATABASE_URL=" .env.development | head -1
echo ""
echo "🎉 Done! Your development database is now configured correctly."
echo ""
echo "Next steps:"
echo "1. The database is already fixed (same as production)"
echo "2. Just restart your dev server: npm run dev"
echo "3. Try creating a customer - it should work!"

