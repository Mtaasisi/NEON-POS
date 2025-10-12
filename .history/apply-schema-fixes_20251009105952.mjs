#!/usr/bin/env node

/**
 * Apply comprehensive schema fixes for all 400 errors found during testing
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function applySchemaFixes() {
  console.log('🔧 Starting comprehensive schema fixes...\n');
  
  try {
    // Read the SQL file
    const sqlContent = readFileSync('./fix-all-schema-errors-comprehensive.sql', 'utf8');
    
    // Split into individual statements (basic splitting)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 10);
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip SELECT statements (they're for verification)
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`⏭️  Skipping verification query ${i + 1}`);
        continue;
      }
      
      console.log(`🔨 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          // Try direct execution if RPC fails
          console.log(`   Trying direct execution...`);
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ sql_query: statement })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        }
        
        console.log(`   ✅ Success\n`);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}\n`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📋 Total: ${statements.length}`);
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n🎉 All schema fixes applied successfully!');
    } else {
      console.log('\n⚠️  Some fixes failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the fixes
applySchemaFixes().catch(console.error);

