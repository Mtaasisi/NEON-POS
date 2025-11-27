#!/bin/bash

# Script to download full database schema
# This exports the complete schema (tables, functions, triggers, etc.) without data

set -e

# Get database URL from environment
if [ -f .env ]; then
    export $(grep -E "DATABASE_URL|VITE_DATABASE_URL" .env | head -1 | xargs)
fi

# Use DATABASE_URL or VITE_DATABASE_URL
DB_URL="${DATABASE_URL:-${VITE_DATABASE_URL}}"

if [ -z "$DB_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

# Generate timestamp for filename
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
SCHEMA_FILE="database-schema-${TIMESTAMP}.sql"

echo "📥 Downloading full database schema..."
echo "📡 Database: $(echo $DB_URL | sed 's/:[^:]*@/@***:***@/')"
echo "📄 Output file: $SCHEMA_FILE"
echo ""

# For Neon, pg_dump can use the connection string directly
# But we need to convert pooler endpoint to direct endpoint for better compatibility
# Neon pooler format: ep-xxx-pooler.c-2.us-east-1.aws.neon.tech
# Direct format: ep-xxx.c-2.us-east-1.aws.neon.tech (remove -pooler)

# Extract the host part
HOST_PART=$(echo $DB_URL | sed -n 's/.*@\([^/]*\).*/\1/p')

# Convert pooler to direct connection (remove -pooler from hostname)
if [[ "$HOST_PART" == *"-pooler"* ]]; then
    DIRECT_HOST=$(echo $HOST_PART | sed 's/-pooler//')
    # Replace pooler host with direct host in connection string
    DB_URL_DIRECT=$(echo $DB_URL | sed "s/@${HOST_PART}/@${DIRECT_HOST}/")
else
    DIRECT_HOST="$HOST_PART"
    DB_URL_DIRECT="$DB_URL"
fi

# Export password for pg_dump (extract from URL)
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
export PGPASSWORD="$DB_PASS"

# Dump schema only (no data)
# --schema-only: Only dump schema, no data
# --no-owner: Don't output commands to set ownership
# --no-privileges: Don't output commands to set privileges
# --clean: Include DROP statements
# --if-exists: Use IF EXISTS for DROP statements
# --verbose: Verbose output
echo "🔄 Running pg_dump..."
echo "🔗 Using direct connection: ${DIRECT_HOST}"
pg_dump "${DB_URL_DIRECT}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --verbose \
    --file="${SCHEMA_FILE}"

# Unset password
unset PGPASSWORD

# Check if file was created and has content
if [ -f "$SCHEMA_FILE" ] && [ -s "$SCHEMA_FILE" ]; then
    FILE_SIZE=$(du -h "$SCHEMA_FILE" | cut -f1)
    LINE_COUNT=$(wc -l < "$SCHEMA_FILE")
    echo ""
    echo "✅ Schema downloaded successfully!"
    echo "📄 File: $SCHEMA_FILE"
    echo "📊 Size: $FILE_SIZE"
    echo "📝 Lines: $LINE_COUNT"
    echo ""
    echo "💡 To view the schema:"
    echo "   cat $SCHEMA_FILE | less"
    echo ""
    echo "💡 To apply the schema to another database:"
    echo "   psql -h <host> -U <user> -d <database> -f $SCHEMA_FILE"
else
    echo "❌ Error: Schema file was not created or is empty"
    exit 1
fi

