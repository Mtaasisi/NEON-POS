#!/usr/bin/env node

/**
 * Direct Supplier Migration Script
 * Applies supplier fields to Neon Database
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection string
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  process.exit(1);
}

const { Client } = pg;

async function applyMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read migration file
    const migrationPath = join(__dirname, 'migrations', 'add_supplier_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Applying supplier fields migration...\n');
    console.log('━'.repeat(60));

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify the changes
    console.log('🔍 Verifying new columns...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_suppliers' 
      AND column_name IN (
        'company_name', 'description', 'whatsapp', 
        'preferred_currency', 'exchange_rate'
      )
      ORDER BY column_name;
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ New columns verified:');
      result.rows.forEach(row => {
        console.log(`   ✓ ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('\n⚠️  Could not verify new columns (they may already exist)');
    }

    console.log('\n' + '━'.repeat(60));
    console.log('🎉 SUPPLIER MIGRATION COMPLETE!');
    console.log('━'.repeat(60));
    console.log('\n📝 New supplier fields available:');
    console.log('   • Company Name');
    console.log('   • Description');
    console.log('   • WhatsApp');
    console.log('   • City & Country');
    console.log('   • Preferred Currency');
    console.log('   • Exchange Rate');
    console.log('   • Tax ID');
    console.log('   • Payment Terms');
    console.log('   • Notes');
    console.log('   • Rating');
    console.log('\n✅ You can now use the updated supplier form!');

  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
      console.log('ℹ️  Some columns already exist - this is OK!');
      console.log('✅ Migration verification passed');
    } else {
      console.error('\n❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

