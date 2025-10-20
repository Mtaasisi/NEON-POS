#!/bin/bash

# ============================================================
# Production Database Setup Script
# This script helps you set up the production database
# ============================================================

echo "============================================================"
echo "🚀 LATS CHANCE POS - Production Database Setup"
echo "============================================================"
echo ""

# Check if .env.production already exists
if [ -f ".env.production" ]; then
    echo "⚠️  .env.production already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Create .env.production from template
echo "📝 Creating .env.production from template..."
cp env.production.template .env.production

echo "✅ .env.production created!"
echo ""

# Prompt for password
echo "============================================================"
echo "🔐 Database Password Setup"
echo "============================================================"
echo ""
echo "You provided this connection string:"
echo "psql 'postgresql://neondb_owner:****************@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'"
echo ""
echo "Please enter your database password (the part after neondb_owner:)"
echo "This is the password from your connection string above."
echo ""
read -s -p "Enter password: " DB_PASSWORD
echo ""

# Validate password is not empty
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Password cannot be empty!"
    rm .env.production
    exit 1
fi

# Update the password in .env.production
echo ""
echo "🔧 Updating password in .env.production..."

# For macOS (BSD sed)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*/$DB_PASSWORD/g" .env.production
else
    # For Linux (GNU sed)
    sed -i "s/\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*/$DB_PASSWORD/g" .env.production
fi

echo "✅ Password updated successfully!"
echo ""

# Test the connection
echo "============================================================"
echo "🧪 Testing Database Connection"
echo "============================================================"
echo ""

CONNECTION_STRING="postgresql://neondb_owner:$DB_PASSWORD@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

if command -v psql &> /dev/null; then
    echo "Testing connection to production database..."
    if psql "$CONNECTION_STRING" -c "SELECT 'Production Database Connected Successfully!' as status;" 2>/dev/null; then
        echo ""
        echo "✅ Database connection successful!"
    else
        echo ""
        echo "❌ Database connection failed!"
        echo "Please verify your password and try again."
        exit 1
    fi
else
    echo "⚠️  psql not found - skipping connection test"
    echo "You can test manually with:"
    echo "psql '$CONNECTION_STRING'"
fi

echo ""
echo "============================================================"
echo "✅ Production Database Setup Complete!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Build for production: npm run build:prod"
echo "2. Deploy the dist folder to your hosting service"
echo ""
echo "Your .env.production file has been created and configured."
echo "Keep this file secure and never commit it to version control!"
echo ""
echo "============================================================"

