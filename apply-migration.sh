#!/bin/bash

# Automatic Day Sessions Migration Script
# This script applies the database migration automatically

echo "🚀 Day Sessions Migration Script"
echo "=================================="
echo ""

# Check if setup-day-sessions-SIMPLE.sql exists
if [ ! -f "setup-day-sessions-SIMPLE.sql" ]; then
    echo "❌ Error: setup-day-sessions-SIMPLE.sql not found!"
    exit 1
fi

echo "✅ SQL file found"
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    source .env
    echo "✅ Environment variables loaded from .env"
else
    echo "⚠️  No .env file found, using system environment variables"
fi

# Check for database URL
if [ -z "$DATABASE_URL" ]; then
    echo ""
    echo "❌ DATABASE_URL not set!"
    echo ""
    echo "📝 Please set your DATABASE_URL:"
    echo "   export DATABASE_URL='your-neon-connection-string'"
    echo ""
    echo "Or create a .env file with:"
    echo "   DATABASE_URL=your-neon-connection-string"
    echo ""
    echo "💡 Alternative: Run the SQL manually in Neon dashboard"
    exit 1
fi

echo ""
echo "🔌 Connecting to database..."
echo "⚙️  Running migration..."
echo ""

# Run the migration using psql if available
if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -f setup-day-sessions-SIMPLE.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration completed successfully!"
        echo "🎉 Day Sessions table created!"
        echo "📊 You can now use session-based day management in your POS"
        echo ""
    else
        echo ""
        echo "❌ Migration failed!"
        echo "💡 Try running the SQL manually in your Neon dashboard"
        echo ""
        exit 1
    fi
else
    echo "❌ psql not found!"
    echo ""
    echo "💡 Please install PostgreSQL client or run the SQL manually:"
    echo ""
    echo "   1. Open your Neon dashboard"
    echo "   2. Go to SQL Editor"
    echo "   3. Copy/paste the contents of setup-day-sessions-SIMPLE.sql"
    echo "   4. Click Run"
    echo ""
    exit 1
fi

