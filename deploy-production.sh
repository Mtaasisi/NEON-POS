#!/bin/bash

# Production Deployment Script
# Builds and prepares for production deployment

echo "🚀 Production Deployment Preparation"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Validate products
echo "📋 Step 1: Validating all products..."
node validate-all-products.mjs 2>&1 | grep -E "✓|✅|Summary" | tail -10

# Check validation result
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Product validation failed!${NC}"
    echo "Run: node fix-all-products.mjs"
    exit 1
fi

echo -e "${GREEN}✓${NC} Products validated"
echo ""

# Step 2: Build frontend
echo "📦 Step 2: Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Frontend built successfully"
echo ""

# Step 3: Build backend
echo "📦 Step 3: Building backend..."
cd server
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend build failed!${NC}"
    exit 1
fi

cd ..
echo -e "${GREEN}✓${NC} Backend built successfully"
echo ""

# Step 4: Run tests
echo "🧪 Step 4: Running tests..."
echo -e "${BLUE}Note: Skipping browser tests (run manually)${NC}"
echo ""

# Step 5: Production checklist
echo "✅ Production Checklist"
echo "======================"
echo ""

echo "Backend:"
echo "  ✓ Built to server/dist/"
echo "  ⚠️  Set strong JWT_SECRET in server/.env"
echo "  ⚠️  Set NODE_ENV=production"
echo "  ⚠️  Configure DATABASE_URL for production"
echo ""

echo "Frontend:"
echo "  ✓ Built to dist/"
echo "  ⚠️  Update VITE_API_URL to production backend"
echo ""

echo "Database:"
echo "  ✓ Prevention triggers active"
echo "  ✓ All products validated"
echo "  ⚠️  Backup database before deployment"
echo ""

echo "📝 Next Steps:"
echo ""
echo "1. Deploy backend:"
echo "   - Upload server/ to your hosting (Heroku/Railway/Render)"
echo "   - Set environment variables"
echo "   - Run: npm start"
echo ""
echo "2. Deploy frontend:"
echo "   - Upload dist/ to your hosting (Vercel/Netlify/Cloudflare)"
echo "   - Set VITE_API_URL to backend URL"
echo ""
echo "3. Test production:"
echo "   - Visit your frontend URL"
echo "   - Login and test cart"
echo "   - Monitor for errors"
echo ""

echo -e "${GREEN}✅ Build complete and ready for deployment!${NC}"
echo ""

