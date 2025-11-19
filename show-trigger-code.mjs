#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('🔍 Checking trigger function code...\n');

async function showTriggerFunctions() {
  try {
    const functions = await sql`
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'validate_and_set_imei_status',
          'validate_new_imei',
          'set_imei_status'
        )
      ORDER BY p.proname
    `;
    
    for (const func of functions) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Function: ${func.function_name}`);
      console.log('='.repeat(70));
      console.log(func.definition);
      console.log();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

showTriggerFunctions();

