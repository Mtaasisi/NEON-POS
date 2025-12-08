#!/bin/bash
# Quick WhatsApp Migration Script
# Migrates all WhatsApp tables from Development to Production

# Source (Development)
SOURCE_CONN="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Target (Production)
TARGET_CONN="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "🚀 Starting WhatsApp Tables Migration"
echo "📥 Source: Development"
echo "📤 Target: Production"
echo ""

# Run the migration script with connection strings
SOURCE_CONN="$SOURCE_CONN" TARGET_CONN="$TARGET_CONN" node migrate-whatsapp-tables.mjs

