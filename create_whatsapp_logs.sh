#!/bin/bash

# Script to create whatsapp_logs table in Neon PostgreSQL database

# Connection string
CONNECTION_STRING="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "🔧 Creating whatsapp_logs table..."
echo ""

# Run the SQL migration
psql "$CONNECTION_STRING" -f migrations/create_whatsapp_logs_table.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ WhatsApp logs table created successfully!"
    echo ""
    echo "You can now use the WhatsApp service in your app."
else
    echo ""
    echo "❌ Error creating table. Please check the error message above."
    exit 1
fi

