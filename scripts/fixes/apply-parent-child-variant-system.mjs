#!/usr/bin/env node

/**
 * Apply Parent-Child Variant System Migration
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATA')));
  process.exit(1);
}

async function applyMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = join(__dirname, 'migrations', 'create_parent_child_variant_system.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Applying parent-child variant system migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📊 Parent-Child Variant System is now active:');
    console.log('   • Parent variants can have multiple IMEI children');
    console.log('   • Stock automatically calculated from children');
    console.log('   • PO creation shows parent variants only');
    console.log('   • POS shows IMEI selection from parent');
    console.log('');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const result = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE variant_type = 'parent') as parent_count,
        COUNT(*) FILTER (WHERE variant_type = 'imei_child') as child_count,
        COUNT(*) FILTER (WHERE variant_type = 'standard') as standard_count
      FROM lats_product_variants
    `);
    
    const stats = result.rows[0];
    console.log('📈 Variant Statistics:');
    console.log(`   • Parent Variants: ${stats.parent_count}`);
    console.log(`   • IMEI Child Variants: ${stats.child_count}`);
    console.log(`   • Standard Variants: ${stats.standard_count}`);
    console.log('');
    console.log('✨ System is ready to use!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

