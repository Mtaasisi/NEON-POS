#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║          COMPREHENSIVE INVENTORY & POS SYSTEM AUDIT                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Starting comprehensive system audit..."
echo ""

# Run the comprehensive audit
psql "$DATABASE_URL" -f COMPREHENSIVE_SYSTEM_AUDIT.sql > audit_report_$(date +%Y%m%d_%H%M%S).txt 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Audit completed successfully!"
    echo "Report saved to: audit_report_*.txt"
    echo ""
else
    echo ""
    echo "❌ Audit encountered errors"
    echo ""
    exit 1
fi

