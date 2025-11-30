#!/usr/bin/env node
// Run the migration to remove order_number column
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

config();
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🚀 Running migration: Remove duplicate order_number column\n');
    
    // Read the migration file
    const migrationSQL = readFileSync('./migrations/remove_duplicate_order_number_column.sql', 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the result
    console.log('🔍 Verifying migration...\n');
    
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'lats_purchase_orders'
      AND column_name LIKE '%number%'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns with "number" in the name:');
    result.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name} (${col.data_type}, ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'})`);
    });
    
    if (result.rows.length === 1 && result.rows[0].column_name === 'po_number') {
      console.log('\n✅ SUCCESS: Only po_number column remains!');
      console.log('   The redundant order_number column has been removed.');
    } else {
      console.log('\n⚠️  WARNING: Unexpected column structure');
    }
    
    console.log('\n🎉 All purchase orders will now consistently use po_number!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
