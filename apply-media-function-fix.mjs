#!/usr/bin/env node

/**
 * Apply increment_media_usage Function Fix
 * Fixes: "function increment_media_usage(uuid) does not exist" error
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection string - try multiple sources
const DATABASE_URL = process.argv[2] || 
                     process.env.DATABASE_URL || 
                     process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: No database URL found!');
  console.error('\nPlease provide database URL in one of these ways:');
  console.error('  1. As argument: node apply-media-function-fix.mjs "postgresql://..."');
  console.error('  2. Set DATABASE_URL environment variable');
  console.error('  3. Set VITE_DATABASE_URL in .env file');
  console.error('\nOr copy the SQL from fix-media-library-upload.sql and run it manually in your database SQL editor.\n');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
console.log('📍 Host:', DATABASE_URL.match(/@([^/]+)/)?.[1] || 'unknown');

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function applyFix() {
  try {
    console.log('\n📋 Applying increment_media_usage function fix...\n');
    
    // Read and execute the migration SQL
    const sqlFile = join(__dirname, 'migrations', 'add_increment_media_usage_function.sql');
    const migrationSQL = readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    await sql.unsafe(migrationSQL);
    
    console.log('✅ SQL executed successfully!\n');
    
    // Verify the function was created
    console.log('🔍 Verifying function exists...');
    const result = await sql`
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname = 'increment_media_usage'
    `;
    
    if (result.length > 0) {
      console.log('✅ Function verified in database:');
      console.log('   Name:', result[0].function_name);
      console.log('   Arguments:', result[0].arguments);
      console.log('   Returns:', result[0].return_type);
    } else {
      console.log('⚠️  Warning: Function not found after creation');
    }
    
    // Check media library table
    console.log('\n📊 Checking media library...');
    const mediaCount = await sql`
      SELECT COUNT(*) as count FROM whatsapp_media_library
    `;
    console.log(`   Media items in library: ${mediaCount[0].count}`);
    
    console.log('\n🎉 Fix applied successfully!');
    console.log('\n✅ What was fixed:');
    console.log('   • Created increment_media_usage(UUID) function');
    console.log('   • Media usage tracking will now work properly');
    console.log('   • No more console errors when selecting media\n');
    
    console.log('📝 Next steps:');
    console.log('   1. Refresh your browser (Cmd/Ctrl + R)');
    console.log('   2. Go to WhatsApp → Bulk Messages');
    console.log('   3. Click Image → Media Library');
    console.log('   4. Select media from library');
    console.log('   5. Usage count should increment!\n');
    
  } catch (error) {
    console.error('\n❌ Error applying fix:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    
    console.error('\n💡 Manual fix:');
    console.error('   Copy the contents of fix-media-library-upload.sql');
    console.error('   and run it in your database SQL editor.\n');
    
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyFix().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});

