#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkSchema() {
  try {
    console.log('🔍 Checking lats_products table schema...\n');
    
    // Get table structure
    const columns = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'lats_products'
      ORDER BY ordinal_position
    `;

    console.log('✅ lats_products table columns:\n');
    columns.forEach(col => {
      console.log(`  • ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}, Default: ${col.column_default || 'None'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🔍 Checking related tables...\n');
    
    // Check if brands table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('lats_brands', 'lats_categories', 'lats_suppliers', 'lats_branches')
      ORDER BY table_name
    `;

    console.log('✅ Related tables found:');
    tables.forEach(t => console.log(`  • ${t.table_name}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();

