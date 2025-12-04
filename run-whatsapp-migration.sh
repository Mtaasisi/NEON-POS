#!/bin/bash

# WhatsApp Advanced Features - Database Migration Script
# This script will set up all advanced features tables

echo "🚀 Starting WhatsApp Advanced Features Migration..."
echo ""

# Database connection string
DB_URL='postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed"
    echo "Please install PostgreSQL client:"
    echo "  - macOS: brew install postgresql"
    echo "  - Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

echo "✅ PostgreSQL client found"
echo ""

# Run the migration
echo "📊 Running migration..."
psql "$DB_URL" -f migrations/create_whatsapp_advanced_features.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📋 Tables created:"
    echo "  ✓ whatsapp_campaigns"
    echo "  ✓ whatsapp_blacklist"
    echo "  ✓ whatsapp_media_library"
    echo "  ✓ whatsapp_reply_templates"
    echo "  ✓ whatsapp_ab_tests"
    echo "  ✓ whatsapp_scheduled_campaigns"
    echo "  ✓ whatsapp_customer_segments"
    echo "  ✓ whatsapp_api_health"
    echo "  ✓ whatsapp_campaign_metrics"
    echo "  ✓ whatsapp_failed_queue"
    echo ""
    echo "🎉 All set! Your WhatsApp system now has:"
    echo "  📊 Campaign Analytics & History"
    echo "  🚫 Blacklist Management"
    echo "  📁 Media Library"
    echo "  💬 Smart Reply Templates"
    echo "  🧪 A/B Testing"
    echo "  📅 Scheduled Campaigns"
    echo "  🎯 Customer Segments"
    echo "  🏥 API Health Monitoring"
    echo "  🔄 Smart Retry Queue"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above"
    exit 1
fi

