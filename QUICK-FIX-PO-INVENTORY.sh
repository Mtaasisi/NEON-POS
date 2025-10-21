#!/bin/bash
# Quick Fix Script for Purchase Order & Inventory Setup
# This script helps you set up the environment and verify the system

echo "🔧 Purchase Order & Inventory Quick Fix"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Step 1: Creating .env file..."
    
    if [ -f ".env copy" ]; then
        cp ".env copy" .env
        echo "✅ Copied from '.env copy'"
    elif [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Copied from .env.example"
    else
        cat > .env << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Get these values from:
# Supabase Dashboard → Settings → API
EOF
        echo "✅ Created new .env file"
    fi
    
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your Supabase credentials!"
    echo "   1. Open: nano .env (or your preferred editor)"
    echo "   2. Add your VITE_SUPABASE_URL"
    echo "   3. Add your VITE_SUPABASE_ANON_KEY"
    echo "   4. Save and exit"
    echo ""
    echo "   Get credentials from: Supabase Dashboard → Settings → API"
    echo ""
    read -p "Press Enter when you've added credentials to .env..."
fi

echo ""
echo "🔍 Step 2: Checking environment..."

# Check if credentials are set
if grep -q "your_supabase_url_here" .env 2>/dev/null || grep -q "your_anon_key_here" .env 2>/dev/null; then
    echo "⚠️  WARNING: .env file still has placeholder values!"
    echo "   Please edit .env and add your actual Supabase credentials"
    echo ""
    read -p "Edit now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    else
        echo "❌ Cannot continue without valid credentials"
        echo "   Run this script again after updating .env"
        exit 1
    fi
fi

echo "✅ Environment file exists"
echo ""

# Check if node modules are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Step 3: Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Step 3: Dependencies already installed"
fi

echo ""
echo "🧪 Step 4: Running verification..."
echo ""

# Run verification script
if [ -f "verify-po-inventory-setup.js" ]; then
    node verify-po-inventory-setup.js
    VERIFY_EXIT=$?
    
    if [ $VERIFY_EXIT -eq 0 ]; then
        echo ""
        echo "✅ All checks passed!"
        echo ""
        echo "📚 Next steps:"
        echo "   1. Read: PURCHASE-ORDER-INVENTORY-CHECK-README.md"
        echo "   2. Test: Create a purchase order and receive it"
        echo "   3. Verify: Check that inventory increases"
        echo ""
    else
        echo ""
        echo "⚠️  Some issues found. Follow the recommendations above."
        echo ""
        echo "🔧 Common fixes:"
        echo "   - Missing receive function: node run-complete-receive-migration.js"
        echo "   - Inventory out of sync: node diagnose-and-fix-inventory-sync.js"
        echo ""
    fi
else
    echo "❌ Verification script not found: verify-po-inventory-setup.js"
    exit 1
fi

echo ""
echo "📄 Documentation available:"
echo "   - PURCHASE-ORDER-INVENTORY-CHECK-README.md (start here)"
echo "   - PURCHASE-ORDER-INVENTORY-SUMMARY.md (quick reference)"
echo "   - PURCHASE-ORDER-INVENTORY-ANALYSIS.md (technical details)"
echo "   - SETUP-PURCHASE-ORDER-VERIFICATION.md (detailed setup)"
echo ""
echo "✅ Setup complete!"

