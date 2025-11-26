#!/bin/bash

# Database shortcuts for NEON POS
# Usage: ./db.sh [command] [environment]

set -e

# Database URLs
PROD_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DEV_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to get database URL
get_url() {
    local env=$1
    case $env in
        "prod"|"production")
            echo $PROD_URL
            ;;
        "dev"|"development")
            echo $DEV_URL
            ;;
        *)
            echo -e "${RED}Error: Invalid environment. Use 'prod' or 'dev'${NC}" >&2
            exit 1
            ;;
    esac
}

# Function to show usage
usage() {
    echo -e "${BLUE}Database Shortcuts for NEON POS${NC}"
    echo ""
    echo "Usage: $0 <command> [environment] [file]"
    echo ""
    echo "Commands:"
    echo "  connect     - Connect to database (interactive)"
    echo "  schema      - Show all tables"
    echo "  fix         - Run the production function fix"
    echo "  backup      - Create database backup"
    echo "  run <file>  - Execute SQL file"
    echo "  query <sql> - Execute SQL query"
    echo "  sync        - Check differences and generate sync SQL"
    echo "  sync:auto   - Automatically sync prod with dev"
    echo ""
    echo "Environments:"
    echo "  prod        - Production database"
    echo "  dev         - Development database"
    echo ""
    echo "Examples:"
    echo "  $0 connect prod"
    echo "  $0 schema dev"
    echo "  $0 fix prod"
    echo "  $0 backup prod"
    echo "  $0 run prod migrations/001_fix_function.sql"
    echo "  $0 query dev \"SELECT COUNT(*) FROM users;\""
    echo "  $0 sync"
    echo "  $0 sync:auto"
}

# Main logic
case $1 in
    "connect")
        if [ -z "$2" ]; then
            usage
            exit 1
        fi
        url=$(get_url $2)
        echo -e "${GREEN}Connecting to $2 database...${NC}"
        psql "$url"
        ;;

    "schema")
        if [ -z "$2" ]; then
            usage
            exit 1
        fi
        url=$(get_url $2)
        echo -e "${GREEN}Showing schema for $2 database...${NC}"
        psql "$url" -c "\dt"
        ;;

    "fix")
        if [ -z "$2" ]; then
            usage
            exit 1
        fi
        url=$(get_url $2)
        echo -e "${YELLOW}Applying production function fix to $2 database...${NC}"
        psql "$url" -f fix_production_function.sql
        echo -e "${GREEN}Fix applied successfully!${NC}"
        ;;

    "backup")
        if [ -z "$2" ]; then
            usage
            exit 1
        fi
        url=$(get_url $2)
        timestamp=$(date +%Y%m%d_%H%M%S)
        filename="${2}_backup_${timestamp}.sql"
        echo -e "${YELLOW}Creating backup of $2 database...${NC}"
        pg_dump "$url" > "$filename"
        echo -e "${GREEN}Backup saved to: $filename${NC}"
        ;;

    "run")
        if [ -z "$2" ] || [ -z "$3" ]; then
            usage
            exit 1
        fi
        url=$(get_url $2)
        file=$3
        if [ ! -f "$file" ]; then
            echo -e "${RED}Error: File '$file' not found${NC}" >&2
            exit 1
        fi
        echo -e "${YELLOW}Executing $file on $2 database...${NC}"
        psql "$url" -f "$file"
        echo -e "${GREEN}File executed successfully!${NC}"
        ;;

    "query")
        if [ -z "$2" ] || [ -z "$3" ]; then
            usage
            exit 1
        fi
        url=$(get_url $2)
        query=$3
        echo -e "${YELLOW}Executing query on $2 database...${NC}"
        psql "$url" -c "$query"
        ;;

    "sync")
        echo -e "${YELLOW}Checking database differences and generating sync SQL...${NC}"
        node db-sync.mjs sync
        ;;

    "sync:auto")
        echo -e "${YELLOW}Automatically syncing production with development...${NC}"
        node db-sync.mjs auto
        ;;

    "help"|"-h"|"--help")
        usage
        ;;

    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}" >&2
        echo ""
        usage
        exit 1
        ;;
esac
