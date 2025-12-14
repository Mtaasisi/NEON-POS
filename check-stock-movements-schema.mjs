#!/usr/bin/env node
/**
 * Check lats_stock_movements table schema
 */

import { Pool } from 'pg';

const dbUrl = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  let client;
  try {
    client = await pool.connect();
    
    console.log('\n🔍 Checking lats_stock_movements table schema...\n');
    
    // Get column information
    const { rows } = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'lats_stock_movements'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in lats_stock_movements:');
    rows.forEach(col => {
      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL';
      console.log(`  - ${col.column_name}: ${col.data_type} (${nullable})`);
    });
    
    // Check for triggers
    console.log('\n🔍 Checking triggers on lats_stock_movements...\n');
    const { rows: triggers } = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'lats_stock_movements'
    `);
    
    if (triggers.length > 0) {
      triggers.forEach(trg => {
        console.log(`  - ${trg.trigger_name}: ${trg.event_manipulation}`);
        console.log(`    Function: ${trg.action_statement}`);
      });
    } else {
      console.log('  No triggers found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

checkSchema().catch(console.error);

