#!/usr/bin/env node
/**
 * Quick Script to Apply RLS Fix
 * 
 * Usage:
 *   node apply_rls_fix.js
 * 
 * Make sure to set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * or update them directly in this script
 */

const fs = require('fs');
const path = require('path');

// Configuration - UPDATE THESE!
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('   Or update them directly in this script');
  console.error('');
  console.error('   Example:');
  console.error('   export SUPABASE_URL="https://xxxxx.supabase.co"');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."');
  console.error('   node apply_rls_fix.js');
  process.exit(1);
}

async function applyMigration() {
  console.log('🔧 Starting RLS policy fix migration...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix_rls_policies_for_session_closure_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log(`📏 SQL length: ${sql.length} characters\n`);
    
    // Split SQL into individual statements (simple split, may need adjustment for complex SQL)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ query: statement + ';' })
        });
        
        if (!response.ok) {
          const error = await response.text();
          // Some errors are expected (like "policy does not exist" when dropping)
          if (error.includes('does not exist')) {
            console.log(`⚠️  Statement ${i + 1}: ${error.substring(0, 80)}... (expected, continuing)`);
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.substring(0, 200));
            errorCount++;
          }
        } else {
          successCount++;
          if (statement.includes('CREATE POLICY') || statement.includes('ALTER TABLE')) {
            console.log(`✅ Statement ${i + 1}: ${statement.substring(0, 60)}...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log('='.repeat(60) + '\n');
    
    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!');
      console.log('🔄 Please refresh your POS application');
      console.log('✅ The RLS error should now be resolved');
    } else {
      console.log('⚠️  Migration completed with some errors');
      console.log('💡 Try running the SQL manually in Supabase Dashboard > SQL Editor');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('\n💡 Alternative: Copy the SQL from fix_rls_policies_for_session_closure_tables.sql');
    console.error('   and run it directly in Supabase Dashboard > SQL Editor');
    process.exit(1);
  }
}

// Run the migration
console.log('🚀 RLS Policy Fix Migration Tool');
console.log('📍 Connected to:', SUPABASE_URL);
console.log('');

applyMigration().catch(err => {
  console.error('💥 Unhandled error:', err);
  process.exit(1);
});

