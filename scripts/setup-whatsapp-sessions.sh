#!/bin/bash

# WhatsApp Session Setup Script
# Automates database migration for WhatsApp session management

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   WhatsApp Session Management - Database Setup            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Database connection string
DB_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql (PostgreSQL client) is not installed"
    echo "   Please install PostgreSQL client tools:"
    echo "   - macOS: brew install postgresql"
    echo "   - Ubuntu: sudo apt-get install postgresql-client"
    echo "   - Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo "✓ PostgreSQL client found"
echo ""

# Check if migration file exists
if [ ! -f "migrations/create_whatsapp_sessions_table.sql" ]; then
    echo "❌ Error: Migration file not found"
    echo "   Expected: migrations/create_whatsapp_sessions_table.sql"
    exit 1
fi

echo "✓ Migration file found"
echo ""

# Run migration
echo "📊 Running database migration..."
echo "   Creating tables:"
echo "   - whatsapp_sessions"
echo "   - whatsapp_session_logs"
echo ""

psql "$DB_URL" -f migrations/create_whatsapp_sessions_table.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   ✅ WhatsApp Session Setup Complete!                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Next steps:"
    echo "1. Configure WasenderAPI Bearer Token in Admin Settings"
    echo "2. Navigate to WhatsApp Inbox page"
    echo "3. Click 'Sessions' button to manage sessions"
    echo "4. Create your first WhatsApp session"
    echo ""
    echo "📖 For detailed setup guide, see: docs/WHATSAPP_SESSION_SETUP.md"
else
    echo ""
    echo "❌ Migration failed"
    echo "   Please check the error messages above"
    echo "   Common issues:"
    echo "   - Database connection string incorrect"
    echo "   - Network connectivity issues"
    echo "   - Insufficient permissions"
    exit 1
fi

