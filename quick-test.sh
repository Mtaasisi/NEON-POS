#!/bin/bash

echo "🔄 Step 1: Re-creating database functions..."
echo ""

# Re-create the functions in the database using psql-like connection
DATABASE_URL='postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'

echo "📦 Please run this SQL file in your Neon SQL Editor first:"
echo "   COMPLETE-PURCHASE-ORDER-WORKFLOW.sql"
echo ""
echo "Then press Enter to continue with the test..."
read

echo ""
echo "🧪 Step 2: Running automated test..."
echo ""

DATABASE_URL="$DATABASE_URL" node test-workflow.mjs

