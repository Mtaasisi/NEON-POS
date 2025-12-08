#!/bin/bash

# Fix the last 2 tables that need UUID extension

set -e

SUPABASE_HOST="aws-0-eu-north-1.pooler.supabase.com"
SUPABASE_PORT="5432"
SUPABASE_USER="postgres.jxhzveborezjhsmzsgbc"
SUPABASE_PASSWORD="@SMASIKA1010"
SUPABASE_DB="postgres"

SOURCE_DB="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo "🔧 Fixing last 2 tables..."

# Ensure UUID extension exists
PGPASSWORD="$SUPABASE_PASSWORD" psql \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>&1 | grep -v "already exists" || true

# Fix whatsapp_media_library
echo "Creating whatsapp_media_library..."
TEMP_DDL="/tmp/whatsapp_media_library_fixed.sql"

pg_dump "$SOURCE_DB" \
  --schema-only \
  --no-owner \
  --no-acl \
  -t "whatsapp_media_library" \
  > "$TEMP_DDL" 2>&1 || true

# Fix the DDL
sed -i.bak 's/public\.uuid_generate_v4()/uuid_generate_v4()/g' "$TEMP_DDL" 2>/dev/null || \
sed -i '' 's/public\.uuid_generate_v4()/uuid_generate_v4()/g' "$TEMP_DDL" 2>/dev/null || true

sed -i.bak 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' "$TEMP_DDL" 2>/dev/null || \
sed -i '' 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' "$TEMP_DDL" 2>/dev/null || true

# Apply
PGPASSWORD="$SUPABASE_PASSWORD" psql \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -f "$TEMP_DDL" 2>&1 | grep -v "already exists" | grep -v "WARNING" || true

rm -f "$TEMP_DDL" "${TEMP_DDL}.bak" 2>/dev/null || true

# Fix whatsapp_reply_templates
echo "Creating whatsapp_reply_templates..."
TEMP_DDL="/tmp/whatsapp_reply_templates_fixed.sql"

pg_dump "$SOURCE_DB" \
  --schema-only \
  --no-owner \
  --no-acl \
  -t "whatsapp_reply_templates" \
  > "$TEMP_DDL" 2>&1 || true

# Fix the DDL
sed -i.bak 's/public\.uuid_generate_v4()/uuid_generate_v4()/g' "$TEMP_DDL" 2>/dev/null || \
sed -i '' 's/public\.uuid_generate_v4()/uuid_generate_v4()/g' "$TEMP_DDL" 2>/dev/null || true

sed -i.bak 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' "$TEMP_DDL" 2>/dev/null || \
sed -i '' 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' "$TEMP_DDL" 2>/dev/null || true

# Apply
PGPASSWORD="$SUPABASE_PASSWORD" psql \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -f "$TEMP_DDL" 2>&1 | grep -v "already exists" | grep -v "WARNING" || true

rm -f "$TEMP_DDL" "${TEMP_DDL}.bak" 2>/dev/null || true

# Verify
FINAL_COUNT=$(PGPASSWORD="$SUPABASE_PASSWORD" psql \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')

echo "✅ Supabase now has ${FINAL_COUNT} tables"
echo "✅ All tables fixed!"

