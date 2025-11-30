#!/usr/bin/env node

/**
 * ================================================
 * COMPREHENSIVE IMEI SYSTEM MIGRATION SCRIPT
 * ================================================
 * This script applies the comprehensive IMEI system setup
 * to your Neon database
 * ================================================
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('   Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('');
console.log('═'.repeat(60));
console.log('  COMPREHENSIVE IMEI SYSTEM SETUP');
console.log('═'.repeat(60));
console.log('');

const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

async function applyMigration() {
  try {
    console.log('📄 Reading migration file...');
    
    const migrationPath = join(__dirname, 'migrations', 'comprehensive_imei_system_setup.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('✅ Migration file loaded');
    console.log(`   File: ${migrationPath}`);
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
    console.log('');
    
    console.log('🚀 Applying migration to database...');
    console.log('   (This may take a moment)');
    console.log('');
    
    // Execute the migration using unsafe for raw SQL
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    
    // Verify the installation
    console.log('🔍 Verifying installation...');
    console.log('');
    
    // Check functions
    const functions = await sql`
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'add_imei_to_parent_variant',
          'mark_imei_as_sold',
          'get_available_imeis_for_parent',
          'get_variant_by_imei',
          'imei_exists',
          'update_parent_quantity_trigger'
        )
      ORDER BY p.proname
    `;
    
    console.log('📦 Installed Functions:');
    functions.forEach(func => {
      console.log(`   ✓ ${func.function_name}(${func.arguments || ''})`);
    });
    console.log('');
    
    // Check views
    const views = await sql`
      SELECT viewname
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname = 'v_parent_variants_with_imei_count'
    `;
    
    console.log('📊 Installed Views:');
    views.forEach(view => {
      console.log(`   ✓ ${view.viewname}`);
    });
    console.log('');
    
    // Check indexes
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'lats_product_variants'
        AND indexname LIKE '%imei%'
    `;
    
    console.log('🔐 IMEI Indexes:');
    indexes.forEach(idx => {
      console.log(`   ✓ ${idx.indexname}`);
    });
    console.log('');
    
    // Check triggers
    const triggers = await sql`
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_table = 'lats_product_variants'
        AND trigger_name = 'trg_update_parent_quantity'
    `;
    
    console.log('⚡ Active Triggers:');
    triggers.forEach(trg => {
      console.log(`   ✓ ${trg.trigger_name} (${trg.event_manipulation})`);
    });
    console.log('');
    
    // Get variant statistics
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE variant_type = 'parent') as parent_count,
        COUNT(*) FILTER (WHERE variant_type = 'imei_child') as child_count,
        COUNT(*) FILTER (WHERE variant_type = 'standard') as standard_count,
        COUNT(*) FILTER (WHERE variant_attributes->>'imei' IS NOT NULL) as total_imei_count
      FROM lats_product_variants
    `;
    
    if (stats.length > 0) {
      const { parent_count, child_count, standard_count, total_imei_count } = stats[0];
      console.log('📈 Current Variant Statistics:');
      console.log(`   • Parent Variants: ${parent_count}`);
      console.log(`   • IMEI Child Variants: ${child_count}`);
      console.log(`   • Standard Variants: ${standard_count}`);
      console.log(`   • Total with IMEI: ${total_imei_count}`);
      console.log('');
    }
    
    console.log('═'.repeat(60));
    console.log('');
    console.log('🎉 SUCCESS! Your IMEI system is ready to use!');
    console.log('');
    console.log('📖 Quick Usage Examples:');
    console.log('');
    console.log('   1️⃣  Add IMEI to parent variant:');
    console.log('      SELECT add_imei_to_parent_variant(');
    console.log('        \'PARENT_UUID\',');
    console.log('        \'356789012345678\',  -- IMEI (15 digits)');
    console.log('        \'SN-ABC123\',        -- Serial number');
    console.log('        120000,              -- Cost price');
    console.log('        145000               -- Selling price');
    console.log('      );');
    console.log('');
    console.log('   2️⃣  Mark IMEI as sold:');
    console.log('      SELECT mark_imei_as_sold(');
    console.log('        \'CHILD_UUID\',');
    console.log('        \'SALE_UUID\'         -- Optional sale ID');
    console.log('      );');
    console.log('');
    console.log('   3️⃣  Get available IMEIs for parent:');
    console.log('      SELECT * FROM get_available_imeis_for_parent(\'PARENT_UUID\');');
    console.log('');
    console.log('   4️⃣  Look up by IMEI:');
    console.log('      SELECT * FROM get_variant_by_imei(\'356789012345678\');');
    console.log('');
    console.log('   5️⃣  Check if IMEI exists:');
    console.log('      SELECT imei_exists(\'356789012345678\');');
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed!');
    console.error('');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Code:', error.code);
    }
    
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check your DATABASE_URL is correct');
    console.error('   2. Ensure you have the required permissions');
    console.error('   3. Verify previous migrations have been applied');
    console.error('');
    
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the migration
applyMigration();

