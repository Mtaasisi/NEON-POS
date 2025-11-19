#!/usr/bin/env node

/**
 * Fix Product Images Table
 * Creates the product_images table with all required columns and settings
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Database configuration
const getDatabaseUrl = () => {
  // Check multiple possible environment variable names
  const possibleVars = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'VITE_DATABASE_URL',
    'VITE_POSTGRES_URL',
    'SUPABASE_DB_URL',
    'VITE_SUPABASE_DB_URL'
  ];

  for (const varName of possibleVars) {
    if (process.env[varName]) {
      log(`✓ Found database URL in ${varName}`, 'green');
      return process.env[varName];
    }
  }

  // If no environment variable is found, try to read from .env file
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    for (const varName of possibleVars) {
      const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
      if (match && match[1]) {
        log(`✓ Found database URL in .env file (${varName})`, 'green');
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    // .env file doesn't exist or can't be read
  }

  throw new Error('No database URL found. Please set DATABASE_URL environment variable.');
};

async function fixProductImagesTable() {
  let client;

  try {
    log('\n🔧 Starting Product Images Table Fix...', 'cyan');
    log('═'.repeat(50), 'cyan');

    // Get database URL
    const databaseUrl = getDatabaseUrl();
    
    // Create database client
    client = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Connect to database
    log('\n📡 Connecting to database...', 'blue');
    await client.connect();
    log('✓ Connected successfully', 'green');

    // Read the migration file
    log('\n📄 Reading migration file...', 'blue');
    const migrationPath = join(__dirname, 'migrations', 'create_product_images_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    log('✓ Migration file loaded', 'green');

    // Execute the migration
    log('\n🔄 Running migration...', 'blue');
    await client.query(migrationSQL);
    log('✓ Migration executed successfully', 'green');

    // Verify the table exists
    log('\n🔍 Verifying table creation...', 'blue');
    const verifyResult = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'product_images'
      ORDER BY ordinal_position;
    `);

    if (verifyResult.rows.length === 0) {
      throw new Error('Table verification failed: product_images table not found');
    }

    log('✓ Table verified successfully', 'green');
    log('\n📋 Table Structure:', 'cyan');
    console.table(verifyResult.rows);

    // Check indexes
    const indexResult = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'product_images';
    `);

    log('\n📑 Indexes:', 'cyan');
    console.table(indexResult.rows);

    // Check triggers
    const triggerResult = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'product_images';
    `);

    log('\n⚡ Triggers:', 'cyan');
    console.table(triggerResult.rows);

    // Check RLS policies
    const policyResult = await client.query(`
      SELECT 
        policyname,
        permissive,
        cmd
      FROM pg_policies
      WHERE tablename = 'product_images';
    `);

    log('\n🔒 RLS Policies:', 'cyan');
    console.table(policyResult.rows);

    log('\n═'.repeat(50), 'green');
    log('✅ Product Images Table Fix Complete!', 'green');
    log('═'.repeat(50), 'green');

    log('\n📊 Summary:', 'cyan');
    log(`   - Columns: ${verifyResult.rows.length}`, 'white');
    log(`   - Indexes: ${indexResult.rows.length}`, 'white');
    log(`   - Triggers: ${triggerResult.rows.length}`, 'white');
    log(`   - RLS Policies: ${policyResult.rows.length}`, 'white');

  } catch (error) {
    log('\n❌ Error occurred:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('\nStack trace:', 'yellow');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      log('\n🔌 Database connection closed', 'blue');
    }
  }
}

// Run the fix
fixProductImagesTable();

