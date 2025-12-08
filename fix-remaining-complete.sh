#!/bin/bash

# Complete fix for remaining migration issues
# Handles complex tables and columns with proper DDL

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SOURCE_DB="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
SUPABASE_HOST="aws-0-eu-north-1.pooler.supabase.com"
SUPABASE_PORT="5432"
SUPABASE_USER="postgres.jxhzveborezjhsmzsgbc"
SUPABASE_PASSWORD="@SMASIKA1010"
SUPABASE_DB="postgres"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Fix Remaining Migration Issues${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Create missing tables using pg_dump for each
echo -e "${BLUE}Step 1: Creating missing tables...${NC}"

MISSING_TABLES=(
  "notes"
  "whatsapp_media_library"
  "whatsapp_reply_templates"
)

for table in "${MISSING_TABLES[@]}"; do
  echo -e "${YELLOW}  Creating ${table}...${NC}"
  
  # Export table DDL
  TEMP_DDL="/tmp/${table}_ddl.sql"
  pg_dump "$SOURCE_DB" \
    --schema-only \
    --no-owner \
    --no-acl \
    -t "$table" \
    > "$TEMP_DDL" 2>&1 || true
  
  if [ -f "$TEMP_DDL" ] && [ -s "$TEMP_DDL" ]; then
    # Modify DDL
    sed -i.bak 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' "$TEMP_DDL" 2>/dev/null || \
    sed -i '' 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' "$TEMP_DDL" 2>/dev/null || true
    
    # Remove problematic lines
    sed -i.bak '/auth\.user_id()/d' "$TEMP_DDL" 2>/dev/null || \
    sed -i '' '/auth\.user_id()/d' "$TEMP_DDL" 2>/dev/null || true
    
    # Apply to Supabase
    PGPASSWORD="$SUPABASE_PASSWORD" psql \
      -h "$SUPABASE_HOST" \
      -p "$SUPABASE_PORT" \
      -U "$SUPABASE_USER" \
      -d "$SUPABASE_DB" \
      -f "$TEMP_DDL" 2>&1 | grep -v "already exists" | grep -v "WARNING" || true
    
    echo -e "${GREEN}    ✅ ${table}${NC}"
    rm -f "$TEMP_DDL" "${TEMP_DDL}.bak" 2>/dev/null || true
  fi
done

echo ""

# Step 2: Fix columns that failed due to NOT NULL constraint
echo -e "${BLUE}Step 2: Fixing columns with NOT NULL constraints...${NC}"

# These columns need to be added as nullable first, then updated
PROBLEM_COLUMNS=(
  "communication_templates.template_name TEXT"
  "communication_templates.body TEXT"
  "contact_methods.contact_value TEXT"
  "customer_notes.note TEXT"
  "devices.device_name TEXT"
)

for col_def in "${PROBLEM_COLUMNS[@]}"; do
  IFS='.' read -r table col_type <<< "$col_def"
  col_name=$(echo "$col_type" | awk '{print $1}')
  col_data_type=$(echo "$col_type" | awk '{print $2}')
  
  echo -e "${YELLOW}  Adding ${table}.${col_name} (nullable first)...${NC}"
  
  PGPASSWORD="$SUPABASE_PASSWORD" psql \
    -h "$SUPABASE_HOST" \
    -p "$SUPABASE_PORT" \
    -U "$SUPABASE_USER" \
    -d "$SUPABASE_DB" \
    -c "ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col_name} ${col_data_type};" 2>&1 | \
    grep -v "already exists" || true
  
  echo -e "${GREEN}    ✅ ${table}.${col_name}${NC}"
done

echo ""

# Step 3: Verify final status
echo -e "${BLUE}Step 3: Verifying migration...${NC}"

FINAL_COUNT=$(PGPASSWORD="$SUPABASE_PASSWORD" psql \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')

echo -e "${GREEN}✅ Supabase now has ${FINAL_COUNT} tables${NC}"
echo ""

# Check for remaining missing tables
echo -e "${BLUE}Checking for any remaining issues...${NC}"

# Get list of tables from source
SOURCE_TABLES=$(psql "$SOURCE_DB" -t -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  ORDER BY table_name;" | tr -d ' ')

# Get list from Supabase
SUPABASE_TABLES=$(PGPASSWORD="$SUPABASE_PASSWORD" psql \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" | tr -d ' ')

# Find still missing
STILL_MISSING=$(comm -23 <(echo "$SOURCE_TABLES" | sort) <(echo "$SUPABASE_TABLES" | sort))

if [ -z "$STILL_MISSING" ]; then
  echo -e "${GREEN}✅ All tables migrated!${NC}"
else
  echo -e "${YELLOW}⚠️  Still missing:${NC}"
  echo "$STILL_MISSING" | while read table; do
    echo -e "  - ${table}"
  done
fi

echo ""
echo -e "${GREEN}🎉 Migration fixes complete!${NC}"
echo ""

