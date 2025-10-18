#!/usr/bin/env node

/**
 * Apply missing RPC functions to fix 400 errors
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function applyMissingRpcFunctions() {
  console.log('🔧 Applying missing RPC functions to fix 400 errors...\n');
  
  try {
    // Read the SQL fix file
    const sqlContent = readFileSync(join(__dirname, 'FIX-ALL-MISSING-RPC-FUNCTIONS.sql'), 'utf-8');
    
    // Remove comments and split into function definitions properly
    // We'll split on the pattern "CREATE OR REPLACE FUNCTION" to get each function
    const functionMatches = [...sqlContent.matchAll(/CREATE OR REPLACE FUNCTION\s+(\w+)[^;]+\$\$;/gs)];
    
    console.log(`📋 Found ${functionMatches.length} function definitions to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const match of functionMatches) {
      const functionDef = match[0];
      const functionName = match[1];
      
      try {
        console.log(`✨ Creating function: ${functionName}...`);
        // Use template literal syntax for Neon
        const templateParts = Object.assign([functionDef], { raw: [functionDef] });
        await sql(templateParts);
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
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n🎉 All RPC functions created successfully!');
      console.log('💡 You can now refresh your app - the 400 errors should be fixed.\n');
    } else {
      console.log('\n⚠️  Some errors occurred. Please check the output above.\n');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

applyMissingRpcFunctions();

