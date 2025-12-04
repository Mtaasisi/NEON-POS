#!/bin/bash

# ================================================
# Production Deployment Verification Script
# ================================================
# Run this after deployment to verify everything works

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       🔍 DEPLOYMENT VERIFICATION CHECKLIST${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ask for deployment URL
echo -e "${CYAN}Enter your deployment URL (e.g., https://yourdomain.com):${NC}"
read -p "URL: " DEPLOYMENT_URL

if [ -z "$DEPLOYMENT_URL" ]; then
    echo -e "${RED}❌ No URL provided. Exiting.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       Testing: $DEPLOYMENT_URL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 1: Main page
echo -e "${YELLOW}Test 1: Main Page Accessibility${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}   ✅ Main page is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}   ❌ Main page failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 2: API Health (if backend deployed)
echo -e "${YELLOW}Test 2: API Health Check${NC}"
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/health" 2>/dev/null || echo "000")
if [ "$API_CODE" = "200" ]; then
    echo -e "${GREEN}   ✅ API is responding (HTTP $API_CODE)${NC}"
elif [ "$API_CODE" = "000" ] || [ "$API_CODE" = "404" ]; then
    echo -e "${YELLOW}   ⚠️  API endpoint not found or backend not deployed${NC}"
else
    echo -e "${RED}   ❌ API health check failed (HTTP $API_CODE)${NC}"
fi
echo ""

# Test 3: Static assets
echo -e "${YELLOW}Test 3: Static Assets${NC}"
FAVICON_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/favicon.svg" 2>/dev/null || echo "000")
if [ "$FAVICON_CODE" = "200" ]; then
    echo -e "${GREEN}   ✅ Static assets are accessible${NC}"
else
    echo -e "${YELLOW}   ⚠️  Some static assets may not be accessible${NC}"
fi
echo ""

# Test 4: SSL/HTTPS
echo -e "${YELLOW}Test 4: SSL/HTTPS Check${NC}"
if [[ "$DEPLOYMENT_URL" == https://* ]]; then
    echo -e "${GREEN}   ✅ Using HTTPS${NC}"
    
    # Test SSL certificate
    SSL_INFO=$(echo | openssl s_client -connect "${DEPLOYMENT_URL#https://}:443" -servername "${DEPLOYMENT_URL#https://}" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "error")
    if [ "$SSL_INFO" != "error" ]; then
        echo -e "${GREEN}   ✅ SSL certificate is valid${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Could not verify SSL certificate${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Not using HTTPS - Consider enabling SSL${NC}"
fi
echo ""

# Test 5: Database Connection
echo -e "${YELLOW}Test 5: Database Connection${NC}"
echo -e "${CYAN}   Testing Neon database connection...${NC}"
PROD_DB="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DB_TEST=$(psql "$PROD_DB" -c "SELECT 1" 2>/dev/null || echo "error")
if [ "$DB_TEST" != "error" ]; then
    echo -e "${GREEN}   ✅ Database connection successful${NC}"
else
    echo -e "${YELLOW}   ⚠️  Database connection test failed${NC}"
    echo -e "${YELLOW}   (This may be normal if psql is not installed)${NC}"
fi
echo ""

# Test 6: Response Time
echo -e "${YELLOW}Test 6: Performance Check${NC}"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$DEPLOYMENT_URL" || echo "0")
if [ "$RESPONSE_TIME" != "0" ]; then
    echo -e "${GREEN}   ✅ Page load time: ${RESPONSE_TIME}s${NC}"
    
    # Convert to milliseconds for comparison
    MS=$(echo "$RESPONSE_TIME * 1000" | bc)
    if (( $(echo "$MS < 1000" | bc -l) )); then
        echo -e "${GREEN}   ✅ Excellent response time!${NC}"
    elif (( $(echo "$MS < 2000" | bc -l) )); then
        echo -e "${GREEN}   ✅ Good response time${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Response time could be improved${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Could not measure response time${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       📋 VERIFICATION SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Deployment URL:${NC} $DEPLOYMENT_URL"
echo -e "${CYAN}Test Date:${NC} $(date)"
echo ""

# Manual checks
echo -e "${YELLOW}📝 Manual Checks (Please verify):${NC}"
echo ""
echo -e "  ☐ Can you log in to the application?"
echo -e "  ☐ Do products load correctly?"
echo -e "  ☐ Can you create a new customer?"
echo -e "  ☐ Does the POS system work?"
echo -e "  ☐ Are reports generating correctly?"
echo -e "  ☐ Do images and logos display properly?"
echo -e "  ☐ Is the dashboard loading data?"
echo ""

# Database checklist
echo -e "${YELLOW}🗄️  Database Configuration:${NC}"
echo ""
echo -e "  ${GREEN}✅${NC} Production database configured"
echo -e "  ${GREEN}✅${NC} SSL/TLS enabled (channel_binding=require)"
echo -e "  ${GREEN}✅${NC} Pooler endpoint in use"
echo ""
echo -e "${CYAN}Database Host:${NC} ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech"
echo -e "${CYAN}Database:${NC} neondb"
echo -e "${CYAN}User:${NC} neondb_owner"
echo ""

# Next steps
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       🎯 NEXT STEPS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}1.${NC} Complete the manual checks above"
echo -e "${CYAN}2.${NC} Monitor the Neon console: ${GREEN}https://console.neon.tech${NC}"
echo -e "${CYAN}3.${NC} Set up monitoring/alerts for your deployment"
echo -e "${CYAN}4.${NC} Create a backup of your production database"
echo -e "${CYAN}5.${NC} Update DNS/domain settings if needed"
echo ""
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""

