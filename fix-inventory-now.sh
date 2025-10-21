#!/bin/bash

# Quick Inventory Fix Script
# This script diagnoses and fixes inventory sync issues

echo "🔧 INVENTORY SYNC FIX"
echo "===================="
echo ""
echo "This will:"
echo "  1. Analyze inventory_items vs variant quantities"
echo "  2. Show detailed discrepancies"
echo "  3. Fix the quantities automatically"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create .env file with your Supabase credentials"
    exit 1
fi

# Run the diagnostic and fix script
echo "Starting diagnostic..."
echo ""
node diagnose-and-fix-inventory-sync.js

echo ""
echo "✅ Done! Please refresh your inventory page."

