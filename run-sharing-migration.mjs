#!/usr/bin/env node
/**
 * Run Data Sharing Migration
 * Adds is_shared columns and triggers to enable data sharing between branches
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('✅ Database URL found');
console.log('🔗 Connecting to database...\n');

const sql = neon(DATABASE_URL);

async function runMigration() {
  try {
    console.log('📖 Reading migration file...');
    const migrationSQL = readFileSync(
      join(__dirname, '🔧-FIX-DATA-SHARING-MIGRATION.sql'),
      'utf-8'
    );

    console.log('✅ Migration file loaded');
    console.log('📊 Running migration...\n');

    // Run the migration
    const result = await sql(migrationSQL);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verification Results:\n');

    // Run verification queries
    console.log('Checking products sharing status...');
    const productsCheck = await sql`
      SELECT 
        s.name as branch_name,
        s.share_products,
        COUNT(p.id)::int as total_products,
        COUNT(p.id) FILTER (WHERE p.is_shared = true)::int as shared_products
      FROM store_locations s
      LEFT JOIN lats_products p ON p.branch_id = s.id
      GROUP BY s.id, s.name, s.share_products
      ORDER BY s.name
    `;
    console.table(productsCheck);

    console.log('\nChecking customers sharing status...');
    const customersCheck = await sql`
      SELECT 
        s.name as branch_name,
        s.share_customers,
        COUNT(c.id)::int as total_customers,
        COUNT(c.id) FILTER (WHERE c.is_shared = true)::int as shared_customers
      FROM store_locations s
      LEFT JOIN customers c ON c.branch_id = s.id
      GROUP BY s.id, s.name, s.share_customers
      ORDER BY s.name
    `;
    console.table(customersCheck);

    console.log('\n🎉 Migration complete!');
    console.log('✅ All is_shared columns added');
    console.log('✅ All triggers created');
    console.log('✅ All existing data synced');
    console.log('\n🚀 Refresh your browser to see the changes!');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();

