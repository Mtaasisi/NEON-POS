#!/usr/bin/env node

/**
 * Create mark_imei_as_sold function in the database
 * This fixes the error: "function mark_imei_as_sold(uuid, uuid) does not exist"
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

async function createFunction() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the SQL file
    const sqlFile = join(__dirname, 'CREATE_MARK_IMEI_AS_SOLD_FUNCTION.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    console.log('📝 Executing SQL to create mark_imei_as_sold function...\n');
    
    // Execute the SQL
    const result = await client.query(sql);

    // Check if function was created
    const verifyResult = await client.query(`
      SELECT 
        proname as function_name,
        pg_get_function_arguments(oid) as arguments,
        pg_get_function_result(oid) as return_type
      FROM pg_proc
      WHERE proname = 'mark_imei_as_sold'
      ORDER BY oid DESC
      LIMIT 1;
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Function created successfully!');
      console.log('📋 Function details:');
      console.log(`   Name: ${verifyResult.rows[0].function_name}`);
      console.log(`   Arguments: ${verifyResult.rows[0].arguments}`);
      console.log(`   Return Type: ${verifyResult.rows[0].return_type}\n`);
    } else {
      console.warn('⚠️  Function creation completed but verification query returned no results');
    }

    console.log('✅ Done! The mark_imei_as_sold function is now available in your database.');
    
  } catch (error) {
    console.error('❌ Error creating function:', error.message);
    if (error.code === '42710') {
      console.log('ℹ️  Function already exists (this is OK)');
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
createFunction().catch(console.error);
