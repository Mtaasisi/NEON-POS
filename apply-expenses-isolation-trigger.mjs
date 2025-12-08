#!/usr/bin/env node

/**
 * Apply database triggers to ensure all new expenses are always isolated
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL or SUPABASE_DB_URL not found in environment variables');
  console.error('Please set DATABASE_URL in your .env.production file');
  process.exit(1);
}

async function applyTriggers() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the SQL file
    const sqlFile = join(__dirname, 'ENSURE_EXPENSES_ALWAYS_ISOLATED.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    console.log('📝 Applying triggers to ensure expenses are always isolated...\n');
    
    // Execute the SQL
    await client.query(sql);

    // Verify triggers were created
    const verifyResult = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table
      FROM information_schema.triggers
      WHERE trigger_name IN ('ensure_expense_isolation', 'ensure_finance_expense_isolation', 'ensure_expense_transaction_isolation')
      ORDER BY trigger_name
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Triggers created successfully!');
      console.log('📋 Trigger details:');
      verifyResult.rows.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.event_manipulation})`);
      });
      console.log('');
    } else {
      console.warn('⚠️  Trigger creation completed but verification query returned no results');
    }

    console.log('✅ Done! All new expenses will now be automatically isolated with branch_id assigned.');
    console.log('\n📝 What this does:');
    console.log('   - Triggers on expenses table: Ensures branch_id is set');
    console.log('   - Triggers on finance_expenses table: Ensures branch_id is set');
    console.log('   - Triggers on account_transactions (expense type): Ensures branch_id is set');
    console.log('   - Uses account branch_id if available, otherwise uses default branch');
    
  } catch (error) {
    console.error('❌ Error applying triggers:', error.message);
    if (error.code === '42710') {
      console.log('ℹ️  Some triggers already exist (this is OK)');
    } else {
      console.error('Full error:', error);
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
applyTriggers().catch(console.error);
