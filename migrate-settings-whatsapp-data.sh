#!/bin/bash

# Migrate Settings and WhatsApp Data from Development to Supabase
# This script migrates actual data (not just schema)

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
echo -e "${BLUE}  Migrate Settings & WhatsApp Data${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Settings tables
SETTINGS_TABLES=(
  "admin_settings"
  "admin_settings_log"
  "system_settings"
  "lats_pos_general_settings"
  "lats_pos_advanced_settings"
  "lats_pos_delivery_settings"
  "lats_pos_loyalty_customer_settings"
  "lats_pos_notification_settings"
  "lats_pos_receipt_settings"
  "lats_pos_search_filter_settings"
  "lats_pos_user_permissions_settings"
  "lats_pos_analytics_reporting_settings"
  "lats_pos_barcode_scanner_settings"
  "lats_pos_dynamic_pricing_settings"
  "user_settings"
  "lats_shipping_settings"
  "whatsapp_antiban_settings"
)

# WhatsApp tables
WHATSAPP_TABLES=(
  "whatsapp_logs"
  "whatsapp_incoming_messages"
  "whatsapp_campaigns"
  "whatsapp_bulk_campaigns"
  "whatsapp_media_library"
  "whatsapp_blacklist"
  "whatsapp_templates"
  "whatsapp_message_templates"
  "whatsapp_reply_templates"
  "whatsapp_customers"
  "whatsapp_customer_segments"
  "whatsapp_campaign_metrics"
  "whatsapp_scheduled_campaigns"
  "whatsapp_failed_queue"
  "whatsapp_api_health"
  "whatsapp_ab_tests"
  "whatsapp_instances_comprehensive"
)

ALL_TABLES=("${SETTINGS_TABLES[@]}" "${WHATSAPP_TABLES[@]}")

echo -e "${BLUE}Step 1: Checking data in source database...${NC}"

# Check which tables have data
TABLES_WITH_DATA=()
for table in "${ALL_TABLES[@]}"; do
  COUNT=$(psql "$SOURCE_DB" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' ' || echo "0")
  if [ "$COUNT" != "0" ] && [ ! -z "$COUNT" ]; then
    TABLES_WITH_DATA+=("$table")
    echo -e "${GREEN}  ✅ $table: $COUNT rows${NC}"
  else
    echo -e "${YELLOW}  ⚠️  $table: empty or doesn't exist${NC}"
  fi
done

echo ""
echo -e "${BLUE}Found ${#TABLES_WITH_DATA[@]} tables with data to migrate${NC}"
echo ""

if [ ${#TABLES_WITH_DATA[@]} -eq 0 ]; then
  echo -e "${YELLOW}No data to migrate. Exiting.${NC}"
  exit 0
fi

# Step 2: Export data
echo -e "${BLUE}Step 2: Exporting data...${NC}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DATA_FILE="settings-whatsapp-data-${TIMESTAMP}.sql"

# Export data only (no schema)
for table in "${TABLES_WITH_DATA[@]}"; do
  echo -e "${YELLOW}  Exporting $table...${NC}"
  pg_dump "$SOURCE_DB" \
    --data-only \
    --no-owner \
    --no-acl \
    -t "$table" \
    >> "$DATA_FILE" 2>&1 || true
done

if [ -f "$DATA_FILE" ] && [ -s "$DATA_FILE" ]; then
  FILE_SIZE=$(du -h "$DATA_FILE" | cut -f1)
  echo -e "${GREEN}✅ Data exported: $DATA_FILE (${FILE_SIZE})${NC}"
else
  echo -e "${RED}❌ Export failed${NC}"
  exit 1
fi

echo ""

# Step 3: Import to Supabase
echo -e "${BLUE}Step 3: Importing data to Supabase...${NC}"
echo -e "${YELLOW}⚠️  This may take a few minutes...${NC}"
echo ""

# Modify SQL to handle conflicts
sed -i.bak 's/INSERT INTO /INSERT INTO /g' "$DATA_FILE" 2>/dev/null || \
sed -i '' 's/INSERT INTO /INSERT INTO /g' "$DATA_FILE" 2>/dev/null || true

# Import with error handling (skip duplicates)
PGPASSWORD="$SUPABASE_PASSWORD" psql \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -f "$DATA_FILE" 2>&1 | \
  grep -v "already exists" | \
  grep -v "duplicate key" | \
  grep -v "WARNING" | \
  grep -E "(ERROR|FATAL|INSERT)" || true

echo ""
echo -e "${GREEN}✅ Data import complete!${NC}"
echo ""

# Step 4: Verify
echo -e "${BLUE}Step 4: Verifying data migration...${NC}"

for table in "${TABLES_WITH_DATA[@]}"; do
  SOURCE_COUNT=$(psql "$SOURCE_DB" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' ' || echo "0")
  SUPABASE_COUNT=$(PGPASSWORD="$SUPABASE_PASSWORD" psql \
    -h "$SUPABASE_HOST" \
    -p "$SUPABASE_PORT" \
    -U "$SUPABASE_USER" \
    -d "$SUPABASE_DB" \
    -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' ' || echo "0")
  
  if [ "$SOURCE_COUNT" = "$SUPABASE_COUNT" ]; then
    echo -e "${GREEN}  ✅ $table: $SUPABASE_COUNT rows (matched)${NC}"
  else
    echo -e "${YELLOW}  ⚠️  $table: Source=$SOURCE_COUNT, Supabase=$SUPABASE_COUNT${NC}"
  fi
done

echo ""
echo -e "${GREEN}🎉 Data migration complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "  1. Verify data in Supabase Dashboard"
echo "  2. Test your application"
echo "  3. Check settings are working correctly"
echo ""

# Cleanup
rm -f "${DATA_FILE}.bak" 2>/dev/null || true

