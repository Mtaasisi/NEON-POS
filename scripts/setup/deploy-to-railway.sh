#!/bin/bash

# Deploy PostgREST to Railway
# This script automates the deployment of your PostgREST API to Railway.app

set -e  # Exit on any error

echo "🚂 Railway Deployment Script"
echo "=============================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed!"
    echo ""
    echo "Install it with:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Or:"
    echo "  brew install railway"
    echo ""
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 You need to login to Railway first"
    echo ""
    railway login
    echo ""
fi

echo "✅ Logged in to Railway"
echo ""

# Check if project is linked
if ! railway status &> /dev/null; then
    echo "📦 Creating new Railway project..."
    echo ""
    railway init
    echo ""
else
    echo "✅ Project already linked"
    echo ""
fi

# Generate secure JWT secret
echo "🔒 Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ JWT secret generated"
echo ""

# Set environment variables
echo "⚙️  Setting environment variables..."
echo ""

railway variables set PGRST_DB_URI="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"
railway variables set PGRST_DB_SCHEMAS="public"
railway variables set PGRST_DB_ANON_ROLE="neondb_owner"
railway variables set PGRST_JWT_SECRET="$JWT_SECRET"
railway variables set PGRST_OPENAPI_SERVER_PROXY_URI='${{RAILWAY_PUBLIC_DOMAIN}}'

echo "✅ Environment variables set"
echo ""

# Deploy
echo "🚀 Deploying to Railway..."
echo ""
railway up

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Deployment successful!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Get the public URL
    echo "🌐 Getting your public URL..."
    RAILWAY_URL=$(railway domain 2>/dev/null || echo "")
    
    if [ -n "$RAILWAY_URL" ]; then
        echo ""
        echo "Your API is live at: https://$RAILWAY_URL"
        echo ""
    else
        echo ""
        echo "⚠️  No domain assigned yet. Assign one with:"
        echo "   railway domain"
        echo ""
    fi
    
    # Generate JWT token for the anon key
    echo "🔑 Generating JWT token for your frontend..."
    echo ""
    
    # Check if Node.js is available
    if command -v node &> /dev/null; then
        # Create temporary script
        cat > /tmp/gen-jwt.js << 'EOF'
const crypto = require('crypto');

// Simple JWT generation (header.payload.signature)
function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const secret = process.argv[2];
const header = { alg: 'HS256', typ: 'JWT' };
const payload = { role: 'neondb_owner', exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) };

const headerB64 = base64url(JSON.stringify(header));
const payloadB64 = base64url(JSON.stringify(payload));
const signature = crypto
  .createHmac('sha256', secret)
  .update(headerB64 + '.' + payloadB64)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

console.log(headerB64 + '.' + payloadB64 + '.' + signature);
EOF
        
        JWT_TOKEN=$(node /tmp/gen-jwt.js "$JWT_SECRET")
        rm /tmp/gen-jwt.js
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📝 UPDATE YOUR FRONTEND .env FILE WITH:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        if [ -n "$RAILWAY_URL" ]; then
            echo "VITE_SUPABASE_URL=https://$RAILWAY_URL"
        else
            echo "VITE_SUPABASE_URL=<your-railway-domain>"
        fi
        echo "VITE_SUPABASE_ANON_KEY=$JWT_TOKEN"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    else
        echo "⚠️  Install Node.js to auto-generate JWT token"
        echo ""
        echo "Or use generate-jwt.js with the secret: $JWT_SECRET"
        echo ""
    fi
    
    echo "📋 Next Steps:"
    echo ""
    echo "1. Copy the values above to your .env file"
    echo "2. Commit and push your frontend code"
    echo "3. Test your API at the Railway URL"
    echo ""
    echo "Useful commands:"
    echo "  railway logs     - View logs"
    echo "  railway status   - Check deployment status"
    echo "  railway open     - Open Railway dashboard"
    echo ""
    
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Check the logs with: railway logs"
    echo ""
    exit 1
fi

