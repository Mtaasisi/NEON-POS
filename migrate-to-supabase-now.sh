#!/bin/bash

# Migration script: Development Database → Supabase
# This script migrates missing tables and schema from development to Supabase

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Migrate Schema: Dev → Supabase${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Source database (Development)
SOURCE_DB="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Supabase destination
SUPABASE_HOST="aws-0-eu-north-1.pooler.supabase.com"
SUPABASE_PORT="5432"
SUPABASE_USER="postgres.jxhzveborezjhsmzsgbc"
SUPABASE_PASSWORD="@SMASIKA1010"
SUPABASE_DB="postgres"

echo -e "${BLUE}Source:${NC} Development Database (Neon)"
echo -e "${BLUE}Target:${NC} Supabase (${SUPABASE_USER}@${SUPABASE_HOST})"
echo ""

# Step 1: Test connections
echo -e "${BLUE}Step 1: Testing connections...${NC}"

# Test source
if psql "$SOURCE_DB" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Source database connection OK${NC}"
else
    echo -e "${RED}❌ Source database connection failed${NC}"
    exit 1
fi

# Test Supabase
if PGPASSWORD="$SUPABASE_PASSWORD" psql -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase connection OK${NC}"
else
    echo -e "${RED}❌ Supabase connection failed${NC}"
    exit 1
fi

echo ""

# Step 2: Export schema for missing tables
echo -e "${BLUE}Step 2: Exporting schema...${NC}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SCHEMA_FILE="schema-migration-${TIMESTAMP}.sql"

# Export full schema (will use IF NOT EXISTS in restore)
pg_dump "$SOURCE_DB" \
    --schema-only \
    --no-owner \
    --no-acl \
    --file="$SCHEMA_FILE" 2>&1 | grep -v "WARNING" || true

if [ -f "$SCHEMA_FILE" ]; then
    FILE_SIZE=$(du -h "$SCHEMA_FILE" | cut -f1)
    echo -e "${GREEN}✅ Schema exported: $SCHEMA_FILE (${FILE_SIZE})${NC}"
else
    echo -e "${RED}❌ Export failed${NC}"
    exit 1
fi

echo ""

# Step 3: Modify SQL to use IF NOT EXISTS where possible
echo -e "${BLUE}Step 3: Preparing migration SQL...${NC}"
# Add IF NOT EXISTS to CREATE TABLE statements
sed -i.bak 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' "$SCHEMA_FILE" 2>/dev/null || \
sed -i '' 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' "$SCHEMA_FILE" 2>/dev/null || true

# Add IF NOT EXISTS to CREATE INDEX
sed -i.bak 's/CREATE INDEX /CREATE INDEX IF NOT EXISTS /g' "$SCHEMA_FILE" 2>/dev/null || \
sed -i '' 's/CREATE INDEX /CREATE INDEX IF NOT EXISTS /g' "$SCHEMA_FILE" 2>/dev/null || true

# Add IF NOT EXISTS to CREATE FUNCTION
sed -i.bak 's/CREATE FUNCTION /CREATE OR REPLACE FUNCTION /g' "$SCHEMA_FILE" 2>/dev/null || \
sed -i '' 's/CREATE FUNCTION /CREATE OR REPLACE FUNCTION /g' "$SCHEMA_FILE" 2>/dev/null || true

echo -e "${GREEN}✅ SQL prepared with IF NOT EXISTS clauses${NC}"
echo ""

# Step 4: Restore to Supabase
echo -e "${BLUE}Step 4: Restoring schema to Supabase...${NC}"
echo -e "${YELLOW}⚠️  This may take several minutes...${NC}"
echo -e "${YELLOW}⚠️  Some errors are expected (existing objects will be skipped)${NC}"
echo ""

# Restore with error handling
PGPASSWORD="$SUPABASE_PASSWORD" psql \
    -h "$SUPABASE_HOST" \
    -p "$SUPABASE_PORT" \
    -U "$SUPABASE_USER" \
    -d "$SUPABASE_DB" \
    -f "$SCHEMA_FILE" 2>&1 | \
    grep -v "already exists" | \
    grep -v "does not exist" | \
    grep -v "WARNING" | \
    grep -E "(ERROR|FATAL)" || true

echo ""
echo -e "${GREEN}✅ Migration complete!${NC}"
echo ""

# Step 5: Verify
echo -e "${BLUE}Step 5: Verifying migration...${NC}"
SUPABASE_COUNT=$(PGPASSWORD="$SUPABASE_PASSWORD" psql -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')

echo -e "${GREEN}✅ Supabase now has ${SUPABASE_COUNT} tables${NC}"
echo ""

echo -e "${BLUE}📝 Next steps:${NC}"
echo "  1. Verify tables in Supabase Dashboard:"
echo "     https://app.supabase.com/project/jxhzveborezjhsmzsgbc/editor"
echo "  2. Check for any migration errors above"
echo "  3. Test your application with Supabase"
echo "  4. Update .env file with Supabase connection"
echo ""

# Cleanup backup file
rm -f "${SCHEMA_FILE}.bak" 2>/dev/null || true

echo -e "${GREEN}🎉 Migration script completed!${NC}"
echo ""

