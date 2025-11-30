#!/usr/bin/env node

/**
 * Apply Parent-Child Variant System Functions to Neon Database
 * This creates the missing add_imei_to_parent_variant function
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🔧 Applying Parent-Child Variant System Functions...\n');

const sql = neon(DATABASE_URL);

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...');
    
    // Read the full migration file
    const migrationPath = join(__dirname, 'migrations', 'create_parent_child_variant_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('✅ Migration file loaded\n');
    console.log('🚀 Executing migration...\n');
    
    // Execute the entire migration
    await sql(migrationSQL);
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify the function exists
    console.log('🔍 Verifying function installation...\n');
    
    const functionCheck = await sql`
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'add_imei_to_parent_variant'
    `;
    
    if (functionCheck.length > 0) {
      console.log('✅ Function verified:');
      console.log(`   Name: ${functionCheck[0].function_name}`);
      console.log(`   Arguments: ${functionCheck[0].arguments}`);
      console.log(`   Returns: ${functionCheck[0].return_type}`);
      console.log('\n📦 Parent-Child Variant System is now ready!\n');
      
      // Additional verification
      const additionalFunctions = await sql`
        SELECT proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname IN (
            'get_child_imeis',
            'calculate_parent_variant_stock',
            'update_parent_variant_stock',
            'get_parent_variants',
            'get_available_imeis_for_pos',
            'mark_imei_as_sold'
          )
        ORDER BY p.proname
      `;
      
      console.log('📋 Other functions installed:');
      additionalFunctions.forEach(fn => {
        console.log(`   ✓ ${fn.function_name}`);
      });
      
      console.log('\n🎉 All functions are ready to use!\n');
      console.log('💡 You can now:');
      console.log('   - Receive Purchase Orders with IMEI tracking');
      console.log('   - Create parent variants with child IMEI variants');
      console.log('   - Track individual device inventory');
      console.log('   - Sell devices by selecting specific IMEIs\n');
      
      return true;
    } else {
      console.log('⚠️  Function not found after installation');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.error('\nError details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    return false;
  }
}

// Run the migration
applyMigration()
  .then(success => {
    if (success) {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Migration failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

