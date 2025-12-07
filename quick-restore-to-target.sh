#!/bin/bash

# Quick restore schema to target database
# This script creates a backup and restores to target in one go

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     RESTORE SCHEMA TO TARGET DATABASE (BACKUP + RESTORE)       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Target database URL
TARGET_DB_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo -e "${CYAN}🎯 Target Database:${NC}"
echo -e "   ${TARGET_DB_URL//:npg_[^@]*@/:****@}"
echo ""

# Check if backup file exists
BACKUP_FILE=$(ls -t schema-backup-*.sql 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}⚠️  No backup file found. Creating backup first...${NC}"
    echo ""
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ] && [ -z "$VITE_DATABASE_URL" ]; then
        echo -e "${RED}❌ Error: DATABASE_URL not set${NC}"
        echo ""
        echo "Please set DATABASE_URL to your SOURCE database:"
        echo "  export DATABASE_URL='postgresql://...'"
        echo ""
        echo "Or set VITE_DATABASE_URL in .env file"
        exit 1
    fi
    
    echo -e "${CYAN}📦 Creating schema backup from source database...${NC}"
    node backup-schema-only.mjs
    
    BACKUP_FILE=$(ls -t schema-backup-*.sql 2>/dev/null | head -1)
    
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Error: Backup file not created${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ Backup created: ${BACKUP_FILE}${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Found existing backup: ${BACKUP_FILE}${NC}"
    echo ""
fi

echo -e "${YELLOW}⚠️  WARNING: This will DROP all tables in the target database!${NC}"
echo -e "${YELLOW}⚠️  All data in the target database will be lost!${NC}"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}🔄 Restoring schema to target database...${NC}"
echo ""

# Restore to target
node restore-schema-to-database.mjs "$BACKUP_FILE" "$TARGET_DB_URL"

echo ""
echo -e "${GREEN}✅ Done! Schema has been restored to target database.${NC}"
echo ""










