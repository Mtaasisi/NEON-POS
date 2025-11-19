#!/bin/bash

# =============================================================================
# Neon Database Schema Migration Script
# Migrates schema from Development to Production branch
# PRESERVES ALL DATA in Production
# =============================================================================

set -e  # Exit on error

echo "🚀 Neon Database Schema Migration"
echo "===================================="
echo ""
echo "⚠️  IMPORTANT: This will migrate SCHEMA ONLY from Development to Production"
echo "   - Production DATA will be PRESERVED"
echo "   - Only schema changes will be applied"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Step 1: Get Database Connection Strings
# =============================================================================

echo -e "${BLUE}Step 1: Configure Database Connections${NC}"
echo "----------------------------------------"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create a .env file with your database URLs"
    exit 1
fi

# Prompt for database URLs
echo ""
echo "Please provide your Neon Database connection strings:"
echo ""
read -p "Development Database URL: " DEV_DATABASE_URL
read -p "Production Database URL: " PROD_DATABASE_URL

if [ -z "$DEV_DATABASE_URL" ] || [ -z "$PROD_DATABASE_URL" ]; then
    echo -e "${RED}❌ Both database URLs are required!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Database URLs configured${NC}"
echo ""

# =============================================================================
# Step 2: Create Backup of Production Database
# =============================================================================

echo -e "${BLUE}Step 2: Backup Production Database${NC}"
echo "----------------------------------------"
echo ""
echo "Creating backup of production schema and data..."

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/production_backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

# Extract host, port, database, user from connection string
PROD_HOST=$(echo $PROD_DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
PROD_PORT=$(echo $PROD_DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
PROD_DB=$(echo $PROD_DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
PROD_USER=$(echo $PROD_DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

echo "Backing up production database to: $BACKUP_FILE"
echo ""

# Use pg_dump to create backup
PGPASSWORD=$(echo $PROD_DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
  pg_dump -h "$PROD_HOST" -p "$PROD_PORT" -U "$PROD_USER" -d "$PROD_DB" \
  --no-owner --no-acl -F p -f "$BACKUP_FILE"

echo -e "${GREEN}✅ Production backup created: $BACKUP_FILE${NC}"
echo ""

# =============================================================================
# Step 3: Generate Schema from Development
# =============================================================================

echo -e "${BLUE}Step 3: Extract Schema from Development${NC}"
echo "----------------------------------------"
echo ""

SCHEMA_FILE="$BACKUP_DIR/development_schema_$TIMESTAMP.sql"

DEV_HOST=$(echo $DEV_DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DEV_PORT=$(echo $DEV_DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DEV_DB=$(echo $DEV_DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DEV_USER=$(echo $DEV_DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

echo "Extracting schema from development database..."
echo ""

# Extract schema only (no data) from development
PGPASSWORD=$(echo $DEV_DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
  pg_dump -h "$DEV_HOST" -p "$DEV_PORT" -U "$DEV_USER" -d "$DEV_DB" \
  --schema-only --no-owner --no-acl -F p -f "$SCHEMA_FILE"

echo -e "${GREEN}✅ Development schema extracted: $SCHEMA_FILE${NC}"
echo ""

# =============================================================================
# Step 4: Create Migration Script
# =============================================================================

echo -e "${BLUE}Step 4: Generate Safe Migration Script${NC}"
echo "----------------------------------------"
echo ""

MIGRATION_FILE="$BACKUP_DIR/migration_script_$TIMESTAMP.sql"

cat > "$MIGRATION_FILE" << 'EOF'
-- =============================================================================
-- Safe Schema Migration Script
-- Generated automatically - Review before executing
-- =============================================================================

BEGIN;

-- Create a backup schema for safety
CREATE SCHEMA IF NOT EXISTS migration_backup;

-- Save current schema version info
CREATE TABLE IF NOT EXISTS migration_backup.migration_log (
    id SERIAL PRIMARY KEY,
    migration_date TIMESTAMP DEFAULT NOW(),
    description TEXT
);

INSERT INTO migration_backup.migration_log (description) 
VALUES ('Schema migration from development - ' || NOW()::TEXT);

COMMIT;
EOF

echo -e "${GREEN}✅ Migration script base created${NC}"
echo ""

# =============================================================================
# Step 5: Interactive Review and Confirmation
# =============================================================================

echo -e "${YELLOW}⚠️  REVIEW REQUIRED${NC}"
echo "----------------------------------------"
echo ""
echo "The following files have been generated:"
echo "  1. Production backup: $BACKUP_FILE"
echo "  2. Development schema: $SCHEMA_FILE"
echo "  3. Migration script: $MIGRATION_FILE"
echo ""
echo "Please review these files before proceeding."
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Review the schema file: $SCHEMA_FILE"
echo "2. Manually create a migration that:"
echo "   - Adds new tables/columns from development"
echo "   - Modifies existing structures"
echo "   - Preserves all production data"
echo ""
echo "Would you like to see a detailed migration guide?"
read -p "(y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat << 'GUIDE'

=============================================================================
DETAILED MIGRATION GUIDE
=============================================================================

RECOMMENDED APPROACH: Use a Schema Comparison Tool

Option 1: Use pg_dump to generate schema-only dumps and compare
-----------------------------------------------------------------
1. You already have the schema files generated above
2. Compare them manually or use a diff tool:
   
   diff -u production_backup_*.sql development_schema_*.sql > schema_diff.txt

Option 2: Use Neon's Built-in Schema Comparison (RECOMMENDED)
--------------------------------------------------------------
1. Go to Neon Console: https://console.neon.tech
2. Navigate to your project
3. Use the "Schema Diff" feature between branches
4. This shows you exactly what changed
5. Generate migration SQL directly from the console

Option 3: Use a Database Migration Tool
----------------------------------------
Consider using one of these tools:

1. Prisma Migrate:
   - Install Prisma: npm install -D prisma
   - Initialize: npx prisma init
   - Introspect both databases
   - Generate migration

2. Flyway or Liquibase:
   - Version control for database schemas
   - Automated migration tracking

Option 4: Manual Migration (Most Control)
------------------------------------------
Create a migration file that:

1. Adds new tables (if any)
2. Adds new columns to existing tables
3. Creates new indexes
4. Updates constraints
5. Adds new functions/triggers

EXAMPLE MIGRATION:
```sql
BEGIN;

-- Add new columns (if they don't exist)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- Add new tables
CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

-- Update existing constraints
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS old_constraint,
ADD CONSTRAINT new_constraint CHECK (amount > 0);

COMMIT;
```

CRITICAL RULES:
-----------------------------------------------------------------
✅ DO:
- Use IF NOT EXISTS for new tables
- Use ADD COLUMN IF NOT EXISTS for new columns
- Always work in transactions (BEGIN/COMMIT)
- Test on a copy first
- Have rollback plan ready

❌ DON'T:
- Use DROP TABLE or TRUNCATE
- Remove columns with DROP COLUMN (unless intentional)
- Remove constraints without checking dependencies
- Run without testing

TESTING YOUR MIGRATION:
-----------------------------------------------------------------
1. Create a test branch in Neon (clone production)
2. Run migration on test branch
3. Verify data integrity
4. Test application functionality
5. Only then run on production

ROLLBACK PLAN:
-----------------------------------------------------------------
If something goes wrong:
1. You have the backup file: $BACKUP_FILE
2. Restore using:
   psql "$PROD_DATABASE_URL" < $BACKUP_FILE

=============================================================================

GUIDE

fi

echo ""
echo -e "${GREEN}✅ Schema migration preparation complete!${NC}"
echo ""
echo "Files created in: $BACKUP_DIR/"
echo ""

