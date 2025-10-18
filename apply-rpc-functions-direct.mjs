#!/usr/bin/env node

/**
 * Apply missing RPC functions to fix 400 errors - Direct execution
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function applyMissingRpcFunctions() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🔧 Applying missing RPC functions to fix 400 errors...\n');
  
  try {
    // Read the SQL fix file
    const sqlContent = readFileSync(join(__dirname, 'FIX-ALL-MISSING-RPC-FUNCTIONS.sql'), 'utf-8');
    
    console.log('📋 Executing SQL file...\n');
    
    // Execute the entire SQL file
    await pool.query(sqlContent);
    
    console.log('✅ SQL file executed successfully!\n');
    
    // Verify functions were created
    const result = await pool.query(`
      SELECT p.proname as function_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'process_purchase_order_payment',
          'get_purchase_order_payment_summary',
          'get_purchase_order_payment_history',
          'get_purchase_order_items_with_products'
        )
      ORDER BY p.proname;
    `);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION');
    console.log('='.repeat(60));
    console.log(`✅ Found ${result.rows.length} RPC functions:\n`);
    result.rows.forEach(row => {
      console.log(`   - ${row.function_name}`);
    });
    console.log('='.repeat(60));
    
    if (result.rows.length >= 4) {
      console.log('\n🎉 All RPC functions created successfully!');
      console.log('💡 You can now refresh your app - the 400 errors should be fixed.\n');
    } else {
      console.log('\n⚠️  Some functions may not have been created.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.position) {
      console.error('   Position:', error.position);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMissingRpcFunctions();

