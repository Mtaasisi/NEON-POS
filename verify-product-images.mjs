#!/usr/bin/env node

/**
 * Verify Product Images Table
 * Tests that the product_images table is accessible and working
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const getDatabaseUrl = () => {
  const possibleVars = ['DATABASE_URL', 'POSTGRES_URL', 'VITE_DATABASE_URL', 'VITE_POSTGRES_URL'];
  
  for (const varName of possibleVars) {
    if (process.env[varName]) return process.env[varName];
  }
  
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    for (const varName of possibleVars) {
      const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
      if (match && match[1]) return match[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch (err) {}
  
  throw new Error('No database URL found');
};

async function verifyProductImages() {
  let client;

  try {
    log('\n✅ Verifying Product Images Table...', 'cyan');
    log('═'.repeat(50), 'cyan');

    const databaseUrl = getDatabaseUrl();
    client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    log('✓ Connected to database', 'green');

    // Test 1: Check table exists
    log('\n📋 Test 1: Check table exists...', 'blue');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_images'
      ) as exists;
    `);
    
    if (tableCheck.rows[0].exists) {
      log('✓ Table exists', 'green');
    } else {
      throw new Error('Table does not exist');
    }

    // Test 2: Check permissions
    log('\n🔐 Test 2: Check permissions...', 'blue');
    try {
      await client.query('SELECT COUNT(*) FROM product_images;');
      log('✓ Can SELECT from table', 'green');
    } catch (err) {
      throw new Error(`Cannot SELECT from table: ${err.message}`);
    }

    // Test 3: Check columns
    log('\n📊 Test 3: Check columns...', 'blue');
    const columnsCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'product_images'
      ORDER BY ordinal_position;
    `);
    
    const requiredColumns = [
      'id', 'product_id', 'image_url', 'thumbnail_url', 
      'file_name', 'file_size', 'is_primary', 'uploaded_by', 
      'created_at', 'updated_at'
    ];
    
    const existingColumns = columnsCheck.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c));
    
    if (missingColumns.length === 0) {
      log(`✓ All ${requiredColumns.length} required columns exist`, 'green');
    } else {
      throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
    }

    // Test 4: Check indexes
    log('\n📑 Test 4: Check indexes...', 'blue');
    const indexCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE tablename = 'product_images';
    `);
    log(`✓ Found ${indexCheck.rows[0].count} indexes`, 'green');

    // Test 5: Check triggers
    log('\n⚡ Test 5: Check triggers...', 'blue');
    const triggerCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.triggers
      WHERE event_object_table = 'product_images';
    `);
    log(`✓ Found ${triggerCheck.rows[0].count} triggers`, 'green');

    // Test 6: Check RLS policies
    log('\n🔒 Test 6: Check RLS policies...', 'blue');
    const policyCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_policies
      WHERE tablename = 'product_images';
    `);
    log(`✓ Found ${policyCheck.rows[0].count} RLS policies`, 'green');

    // Test 7: Check current data
    log('\n📦 Test 7: Check current data...', 'blue');
    const dataCheck = await client.query('SELECT COUNT(*) as count FROM product_images;');
    log(`✓ Table contains ${dataCheck.rows[0].count} records`, 'green');

    log('\n═'.repeat(50), 'green');
    log('✅ All Tests Passed!', 'green');
    log('═'.repeat(50), 'green');
    
    log('\n📊 Summary:', 'cyan');
    log('   ✓ Table exists and is accessible', 'white');
    log('   ✓ All required columns present', 'white');
    log(`   ✓ ${indexCheck.rows[0].count} performance indexes`, 'white');
    log(`   ✓ ${triggerCheck.rows[0].count} data integrity triggers`, 'white');
    log(`   ✓ ${policyCheck.rows[0].count} security policies`, 'white');
    log(`   ✓ ${dataCheck.rows[0].count} image records`, 'white');
    
    log('\n✨ Product images table is ready to use!', 'green');

  } catch (error) {
    log('\n❌ Verification Failed:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('\nStack trace:', 'yellow');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

verifyProductImages();

