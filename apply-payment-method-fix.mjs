#!/usr/bin/env node
/**
 * Apply payment_method trigger fix directly to database
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Database connection
const dbUrl = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyFix() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 APPLYING PAYMENT_METHOD TRIGGER FIX             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let client;
  try {
    // Read SQL file
    const sqlPath = join(process.cwd(), 'fix-payment-method-trigger.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('1️⃣ Connecting to database...');
    client = await pool.connect();
    console.log('   ✅ Connected\n');

    console.log('2️⃣ Applying trigger function fix...');
    await client.query(sql);
    console.log('   ✅ Trigger function updated successfully!\n');

    // Verify
    console.log('3️⃣ Verifying fix...');
    const { rows } = await client.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname = 'sync_sale_to_payment_transaction'
      LIMIT 1
    `);

    if (rows.length > 0) {
      console.log('   ✅ Function exists and has been updated');
      if (rows[0].prosrc.includes('::jsonb')) {
        console.log('   ✅ Function includes JSONB casting (fix applied)');
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ FIX APPLIED SUCCESSFULLY                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log('The payment_method trigger has been fixed.');
    console.log('Try processing a payment again - it should work now!\n');

  } catch (error) {
    console.error('\n❌ Error applying fix:', error.message);
    console.error('   Details:', error);
    console.log('\n📋 Alternative: Apply manually via Supabase SQL Editor');
    console.log('   https://supabase.com/dashboard/project/jxhzveborezjhsmzsgbc/sql\n');
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

applyFix().catch(console.error);

