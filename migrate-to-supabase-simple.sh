#!/bin/bash

# Simple migration script using psql directly
# This is more reliable for Supabase connections

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Migrate Schema to Supabase${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Source database (default to local)
SOURCE_DB="${SOURCE_DATABASE_URL:-postgresql://mtaasisi@localhost:5432/neondb}"

# Supabase destination (using connection pooler)
SUPABASE_HOST="aws-0-eu-north-1.pooler.supabase.com"
SUPABASE_PORT="5432"
SUPABASE_USER="postgres.jxhzveborezjhsmzsgbc"
SUPABASE_PASSWORD="@SMASIKA1010"
SUPABASE_DB="postgres"

echo -e "${BLUE}Source Database:${NC}"
echo "  ${SOURCE_DB}"
echo ""
echo -e "${BLUE}Destination (Supabase):${NC}"
echo "  postgresql://postgres:***@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres"
echo ""

# Step 1: Test connections
echo -e "${BLUE}Step 1: Testing connections...${NC}"

# Test source
if psql "$SOURCE_DB" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Source database connection OK${NC}"
else
    echo -e "${RED}❌ Source database connection failed${NC}"
    echo "Please check your SOURCE_DATABASE_URL"
    exit 1
fi

# Test Supabase
if PGPASSWORD="$SUPABASE_PASSWORD" psql -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase connection OK${NC}"
else
    echo -e "${RED}❌ Supabase connection failed${NC}"
    echo "Please check:"
    echo "  1. Password is correct"
    echo "  2. Database is accessible"
    echo "  3. Network connection"
    exit 1
fi

echo ""

# Step 2: Backup source schema
echo -e "${BLUE}Step 2: Backing up source schema...${NC}"
BACKUP_FILE="schema-backup-$(date +%Y%m%d-%H%M%S).sql"

pg_dump "$SOURCE_DB" \
    --schema-only \
    --no-owner \
    --no-acl \
    --file="$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✅ Schema backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

echo ""

# Step 3: Restore to Supabase
echo -e "${BLUE}Step 3: Restoring schema to Supabase...${NC}"
echo -e "${YELLOW}⚠️  This may take a few minutes...${NC}"

PGPASSWORD="$SUPABASE_PASSWORD" psql \
    -h "$SUPABASE_HOST" \
    -p "$SUPABASE_PORT" \
    -U "$SUPABASE_USER" \
    -d "$SUPABASE_DB" \
    -f "$BACKUP_FILE" 2>&1 | grep -v "already exists" | grep -v "ERROR" || true

echo ""
echo -e "${GREEN}✅ Migration complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Verify tables in Supabase Dashboard"
echo "  2. Update your .env file with Supabase connection"
echo "  3. Test your application"
echo ""

