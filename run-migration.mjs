#!/usr/bin/env node

/**
 * Run Data Protection Migration
 * Installs all data protection and validation systems
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Running Data Protection Migration\n');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Read the migration SQL file
    const sql = readFileSync('migrations/prevent_future_data_issues.sql', 'utf8');
    
    console.log('📄 Executing migration SQL...\n');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify installation
    console.log('🔍 Verifying installation...\n');
    
    // Check if audit table exists
    const { rows: auditTable } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_data_audit_log'
      ) as exists
    `);
    
    console.log(`  Audit Log Table: ${auditTable[0].exists ? '✅' : '❌'}`);
    
    // Check if view exists
    const { rows: qualityView } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'data_quality_issues'
      ) as exists
    `);
    
    console.log(`  Data Quality View: ${qualityView[0].exists ? '✅' : '❌'}`);
    
    // Check triggers
    const { rows: triggers } = await pool.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name IN (
        'trigger_auto_convert_po_currency',
        'trigger_validate_variant_prices',
        'trigger_track_variant_source'
      )
      ORDER BY trigger_name
    `);
    
    console.log('\n  Installed Triggers:');
    triggers.forEach(t => {
      console.log(`    ✅ ${t.trigger_name}`);
    });
    
    if (triggers.length < 3) {
      console.log(`    ⚠️  Expected 3 triggers, found ${triggers.length}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Data Protection System is now ACTIVE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Next Steps:');
    console.log('  1. Run: node check-data-quality.mjs');
    console.log('  2. Fix any existing issues found');
    console.log('  3. Read: DATA_INTEGRITY_GUIDE.md');
    console.log('  4. Train staff on new procedures\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);
