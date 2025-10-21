#!/bin/bash

echo "🔍 Checking Current Isolation Configuration..."
echo ""

# Check the provider file
if [ -f "src/features/lats/lib/data/provider.supabase.ts" ]; then
    echo "📄 Found provider.supabase.ts"
    echo ""
    echo "Current ISOLATION_CONFIG settings:"
    echo "════════════════════════════════════════"
    grep -A 8 "ISOLATION_CONFIG = {" src/features/lats/lib/data/provider.supabase.ts | head -9
    echo "════════════════════════════════════════"
    echo ""
    
    # Check each toggle
    echo "Individual Toggle Status:"
    echo "-------------------------"
    
    if grep -q "ENABLE_DEVICE_ISOLATION: true" src/features/lats/lib/data/provider.supabase.ts; then
        echo "✅ Device Isolation: ON"
    elif grep -q "ENABLE_DEVICE_ISOLATION: false" src/features/lats/lib/data/provider.supabase.ts; then
        echo "❌ Device Isolation: OFF"
    else
        echo "⚠️  Device Isolation: UNKNOWN"
    fi
    
    if grep -q "ENABLE_PAYMENT_ISOLATION: true" src/features/lats/lib/data/provider.supabase.ts; then
        echo "✅ Payment Isolation: ON"
    elif grep -q "ENABLE_PAYMENT_ISOLATION: false" src/features/lats/lib/data/provider.supabase.ts; then
        echo "❌ Payment Isolation: OFF"
    else
        echo "⚠️  Payment Isolation: UNKNOWN"
    fi
    
    if grep -q "ENABLE_TECHNICIAN_ISOLATION: true" src/features/lats/lib/data/provider.supabase.ts; then
        echo "✅ Technician Isolation: ON"
    elif grep -q "ENABLE_TECHNICIAN_ISOLATION: false" src/features/lats/lib/data/provider.supabase.ts; then
        echo "❌ Technician Isolation: OFF"
    else
        echo "⚠️  Technician Isolation: UNKNOWN"
    fi
    
    echo ""
    echo "💡 To change settings, edit:"
    echo "   src/features/lats/lib/data/provider.supabase.ts"
else
    echo "❌ Provider file not found!"
fi
