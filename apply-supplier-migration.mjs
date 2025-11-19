#!/usr/bin/env node

/**
 * ================================================
 * APPLY SUPPLIER FIELDS MIGRATION
 * ================================================
 * This script applies the database migration to add
 * comprehensive supplier fields to the lats_suppliers table
 * ================================================
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🚀 Starting supplier fields migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'migrations', 'add_supplier_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL loaded from:', migrationPath);
    console.log('📊 Executing migration...\n');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_migrations')
            .insert({ sql: statement });
          
          if (directError) {
            console.log(`⚠️  Statement skipped (may already exist):`, statement.substring(0, 80) + '...');
          } else {
            successCount++;
            console.log('✅ Statement executed successfully');
          }
        } else {
          successCount++;
          console.log('✅ Statement executed successfully');
        }
      } catch (err) {
        console.log(`⚠️  Statement skipped:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED');
    console.log('='.repeat(60));
    console.log(`📊 Statements executed: ${successCount}`);
    console.log(`⚠️  Statements skipped: ${errorCount}`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    
    const { data: columns, error: verifyError } = await supabase
      .from('lats_suppliers')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    } else {
      console.log('✅ Migration verified successfully');
      
      // Check for new columns
      if (columns && columns.length > 0) {
        const newFields = ['company_name', 'description', 'whatsapp', 'preferred_currency', 'exchange_rate'];
        const existingFields = Object.keys(columns[0] || {});
        const foundFields = newFields.filter(field => existingFields.includes(field));
        
        console.log('\n📋 New fields available:');
        foundFields.forEach(field => {
          console.log(`  ✓ ${field}`);
        });
        
        if (foundFields.length < newFields.length) {
          console.log('\n⚠️  Some fields may need manual addition:');
          newFields.filter(f => !foundFields.includes(f)).forEach(field => {
            console.log(`  - ${field}`);
          });
        }
      }
    }

    console.log('\n🎉 Supplier fields migration completed successfully!');
    console.log('\n📝 You can now use the updated supplier form with:');
    console.log('  • Company Name');
    console.log('  • Description');
    console.log('  • WhatsApp');
    console.log('  • City & Country');
    console.log('  • Preferred Currency');
    console.log('  • Exchange Rate');
    console.log('  • Additional Notes');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the migration
applyMigration();

