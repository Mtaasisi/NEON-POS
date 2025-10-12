#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { neon } from '@neondatabase/serverless';

console.log('\n=====================================');
console.log('🔧 ADDING MISSING COLUMNS TO lats_categories');
console.log('=====================================\n');

// Get database URL
let DATABASE_URL;
if (existsSync('database-config.json')) {
  const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
  DATABASE_URL = config.connectionString || config.url;
  console.log('✅ Found database-config.json');
} else {
  DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  console.log('✅ Using hardcoded database URL');
}

const sql = neon(DATABASE_URL);

async function addMissingColumns() {
  try {
    // Check existing columns
    console.log('🔍 Checking current table structure...');
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_categories';
    `;
    
    const existingColumns = new Set(columns.map(c => c.column_name));
    console.log(`   Found ${existingColumns.size} columns\n`);

    // Add parent_id if missing
    if (!existingColumns.has('parent_id')) {
      console.log('➕ Adding parent_id column...');
      await sql`
        ALTER TABLE lats_categories 
        ADD COLUMN parent_id UUID REFERENCES lats_categories(id) ON DELETE SET NULL;
      `;
      console.log('✅ Added parent_id column\n');
    } else {
      console.log('✓ parent_id column already exists\n');
    }

    // Add sort_order if missing
    if (!existingColumns.has('sort_order')) {
      console.log('➕ Adding sort_order column...');
      await sql`
        ALTER TABLE lats_categories 
        ADD COLUMN sort_order INTEGER DEFAULT 0;
      `;
      console.log('✅ Added sort_order column\n');
    } else {
      console.log('✓ sort_order column already exists\n');
    }

    // Add metadata if missing
    if (!existingColumns.has('metadata')) {
      console.log('➕ Adding metadata column...');
      await sql`
        ALTER TABLE lats_categories 
        ADD COLUMN metadata JSONB;
      `;
      console.log('✅ Added metadata column\n');
    } else {
      console.log('✓ metadata column already exists\n');
    }

    // Verify final structure
    console.log('🔍 Final table structure:');
    const finalColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_categories'
      ORDER BY ordinal_position;
    `;
    
    finalColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n✅ All missing columns have been added!\n');

  } catch (error) {
    console.error('❌ Failed to add columns:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addMissingColumns();

