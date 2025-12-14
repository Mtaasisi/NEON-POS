#!/usr/bin/env node
// Fix NULL branch_id in products and variants
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
    console.log('🚀 Running migration: Fix NULL branch_id in variants\n');
    
    // Read the migration file
    const migrationSQL = readFileSync('./migrations/fix_null_branch_id_variants.sql', 'utf8');
    
    // Execute the migration
    const result = await pool.query(migrationSQL);
    
    // Print all notices from the migration
    if (result.notices) {
      result.notices.forEach(notice => console.log(notice.message));
    }
    
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify no NULL branch_id remains
    console.log('🔍 Final verification...\n');
    
    const checkProducts = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE branch_id IS NULL
    `);
    
    const checkVariants = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE branch_id IS NULL
    `);
    
    console.log('📊 Results:');
    console.log(`   - Products with NULL branch_id: ${checkProducts.rows[0].count}`);
    console.log(`   - Variants with NULL branch_id: ${checkVariants.rows[0].count}`);
    
    if (checkProducts.rows[0].count === '0' && checkVariants.rows[0].count === '0') {
      console.log('\n✅ SUCCESS: All products and variants have valid branch_id values!');
    } else {
      console.log('\n⚠️  WARNING: Some records still have NULL branch_id');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

