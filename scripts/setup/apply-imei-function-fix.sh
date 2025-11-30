#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "🔧 APPLYING IMEI FUNCTION FIX"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it first:"
    echo "  export DATABASE_URL='your_postgres_connection_string'"
    echo ""
    exit 1
fi

echo "📍 Database URL: ${DATABASE_URL:0:50}..."
echo ""

echo "🔧 Applying URGENT_FIX_add_imei_function.sql..."
psql "$DATABASE_URL" -f URGENT_FIX_add_imei_function.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "✅ IMEI FUNCTION FIX APPLIED SUCCESSFULLY!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "The add_imei_to_parent_variant function is now installed."
    echo "You can now receive purchase orders with IMEI/serial numbers!"
    echo ""
else
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "❌ FAILED TO APPLY FIX"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Please check the error messages above"
    echo ""
    exit 1
fi

