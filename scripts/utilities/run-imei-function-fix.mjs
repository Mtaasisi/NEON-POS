#!/usr/bin/env node
// Run the migration to fix add_imei_to_parent_variant function
import postgres from 'postgres';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('   Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

async function runMigration() {
  
  try {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  🔧 Running IMEI Function Fix Migration          ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', 'fix_add_imei_to_parent_variant_function.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded successfully');
    console.log(`   Size: ${migrationSQL.length} bytes`);
    console.log('');
    
    console.log('⏳ Executing migration...');
    console.log('   This may take a few moments...');
    console.log('');
    
    // Execute the migration using unsafe for raw SQL
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    
    // Verify the function exists
    console.log('🔍 Verifying function creation...');
    console.log('');
    
    const result = await sql`
      SELECT 
        routine_name,
        routine_type,
        data_type as return_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'add_imei_to_parent_variant'
      ORDER BY routine_name
    `;
    
    if (result.length > 0) {
      console.log('✅ Function(s) found:');
      result.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.routine_name} (${row.routine_type})`);
      });
      console.log('');
      console.log('🎉 Function is ready to use!');
    } else {
      console.log('⚠️  WARNING: Function not found after migration');
      console.log('   Please check the migration output above for errors');
    }
    
    // Check for the internal helper function too
    const internalResult = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'add_imei_to_parent_variant_internal'
    `;
    
    if (internalResult.length > 0) {
      console.log('✅ Internal helper function also created');
    }
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRATION COMPLETE                            ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Refresh your application');
    console.log('   2. Test receiving a purchase order with IMEI numbers');
    console.log('   3. Serial numbers and IMEIs are now unified (same value)');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed!');
    console.error('');
    console.error('Error message:', error.message);
    console.error('');
    if (error.message.includes('already exists')) {
      console.error('ℹ️  This might be okay - the function may already exist.');
      console.error('   The migration will update it to the new version.');
    } else {
      console.error('Full error details:');
      console.error(error);
    }
    console.error('');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

