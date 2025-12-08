#!/usr/bin/env node

/**
 * Apply database trigger to ensure all new accounts are always isolated
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

async function applyTrigger() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the SQL file
    const sqlFile = join(__dirname, 'ENSURE_ACCOUNTS_ALWAYS_ISOLATED.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    console.log('📝 Applying trigger to ensure accounts are always isolated...\n');
    
    // Execute the SQL
    await client.query(sql);

    // Verify trigger was created
    const verifyResult = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'ensure_account_isolation'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Trigger created successfully!');
      console.log('📋 Trigger details:');
      console.log(`   Name: ${verifyResult.rows[0].trigger_name}`);
      console.log(`   Event: ${verifyResult.rows[0].event_manipulation}`);
      console.log(`   Table: ${verifyResult.rows[0].event_object_table}\n`);
    } else {
      console.warn('⚠️  Trigger creation completed but verification query returned no results');
    }

    console.log('✅ Done! All new accounts will now be automatically isolated with branch_id assigned.');
    console.log('\n📝 What this does:');
    console.log('   - Forces is_shared = false for all new accounts');
    console.log('   - Automatically assigns branch_id if not provided');
    console.log('   - Uses first active branch as default if no branch is specified');
    
  } catch (error) {
    console.error('❌ Error applying trigger:', error.message);
    if (error.code === '42710') {
      console.log('ℹ️  Trigger already exists (this is OK)');
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
applyTrigger().catch(console.error);
