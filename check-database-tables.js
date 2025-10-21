#!/usr/bin/env node

/**
 * Database Tables Checker
 * Lists all tables in the database
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Database URL from database-config.json
const configPath = path.join(process.cwd(), 'database-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DATABASE_URL = config.url;

console.log('🔍 Checking Database Tables...');
console.log('📊 Database URL:', DATABASE_URL.substring(0, 50) + '...');

// Create Neon client
const sql = neon(DATABASE_URL);

async function checkTables() {
  try {
    console.log('📋 Fetching all tables...');
    
    // Get all tables
    const tables = await sql`
      SELECT 
        table_name,
        table_type,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log(`📦 Found ${tables.length} tables:`);
    console.log('='.repeat(50));
    
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name} (${table.table_type})`);
    });
    
    // Check for specific tables we expect
    const expectedTables = ['products', 'product_variants', 'categories', 'suppliers', 'users', 'store_locations'];
    const foundTables = tables.map(t => t.table_name);
    
    console.log('\n🔍 Expected Tables Check:');
    console.log('='.repeat(50));
    
    expectedTables.forEach(tableName => {
      const exists = foundTables.includes(tableName);
      console.log(`${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    // If products table exists, check its structure
    if (foundTables.includes('products')) {
      console.log('\n📋 Products Table Structure:');
      console.log('='.repeat(50));
      
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      columns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error('Full error:', error);
  }
}

checkTables().then(() => {
  console.log('\n🎉 Table check completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Table check failed:', error);
  process.exit(1);
});
