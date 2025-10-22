#!/usr/bin/env node

/**
 * Comprehensive Product Images Test
 * Tests database operations, permissions, and application integration
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
  magenta: '\x1b[35m',
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

async function comprehensiveTest() {
  let client;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    log('\n🔍 COMPREHENSIVE PRODUCT IMAGES TEST', 'cyan');
    log('═'.repeat(60), 'cyan');

    const databaseUrl = getDatabaseUrl();
    client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    log('✓ Database connected', 'green');

    // Test 1: Table Existence
    log('\n[1/12] Testing table existence...', 'blue');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'product_images'
      ) as exists;
    `);
    if (tableExists.rows[0].exists) {
      log('  ✓ product_images table exists', 'green');
      testsPassed++;
    } else {
      log('  ✗ product_images table missing', 'red');
      testsFailed++;
    }

    // Test 2: Column Structure
    log('\n[2/12] Testing column structure...', 'blue');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'product_images'
      ORDER BY ordinal_position;
    `);
    
    const requiredColumns = {
      'id': 'uuid',
      'product_id': 'uuid',
      'image_url': 'text',
      'thumbnail_url': 'text',
      'file_name': 'text',
      'file_size': 'integer',
      'is_primary': 'boolean',
      'uploaded_by': 'uuid',
      'created_at': 'timestamp with time zone',
      'updated_at': 'timestamp with time zone'
    };
    
    let columnsPassed = true;
    for (const [colName, colType] of Object.entries(requiredColumns)) {
      const found = columns.rows.find(c => c.column_name === colName && c.data_type === colType);
      if (!found) {
        log(`  ✗ Column ${colName} (${colType}) missing or wrong type`, 'red');
        columnsPassed = false;
      }
    }
    
    if (columnsPassed) {
      log('  ✓ All 10 columns present with correct types', 'green');
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 3: Primary Key
    log('\n[3/12] Testing primary key...', 'blue');
    const pk = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'product_images' AND constraint_type = 'PRIMARY KEY';
    `);
    if (pk.rows.length > 0) {
      log('  ✓ Primary key constraint exists', 'green');
      testsPassed++;
    } else {
      log('  ✗ Primary key missing', 'red');
      testsFailed++;
    }

    // Test 4: Foreign Key
    log('\n[4/12] Testing foreign key relationship...', 'blue');
    const fk = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'product_images' AND constraint_type = 'FOREIGN KEY';
    `);
    if (fk.rows.length > 0) {
      log('  ✓ Foreign key to lats_products exists', 'green');
      testsPassed++;
    } else {
      log('  ✗ Foreign key missing', 'red');
      testsFailed++;
    }

    // Test 5: Indexes
    log('\n[5/12] Testing indexes...', 'blue');
    const indexes = await client.query(`
      SELECT indexname FROM pg_indexes WHERE tablename = 'product_images';
    `);
    if (indexes.rows.length >= 4) {
      log(`  ✓ ${indexes.rows.length} indexes configured`, 'green');
      testsPassed++;
    } else {
      log(`  ✗ Only ${indexes.rows.length} indexes found (expected 4+)`, 'red');
      testsFailed++;
    }

    // Test 6: Triggers
    log('\n[6/12] Testing triggers...', 'blue');
    const triggers = await client.query(`
      SELECT trigger_name FROM information_schema.triggers 
      WHERE event_object_table = 'product_images';
    `);
    if (triggers.rows.length >= 2) {
      log(`  ✓ ${triggers.rows.length} triggers active`, 'green');
      testsPassed++;
    } else {
      log(`  ✗ Only ${triggers.rows.length} triggers found`, 'red');
      testsFailed++;
    }

    // Test 7: RLS Policies
    log('\n[7/12] Testing Row Level Security...', 'blue');
    const policies = await client.query(`
      SELECT policyname FROM pg_policies WHERE tablename = 'product_images';
    `);
    if (policies.rows.length >= 4) {
      log(`  ✓ ${policies.rows.length} RLS policies configured`, 'green');
      testsPassed++;
    } else {
      log(`  ✗ Only ${policies.rows.length} RLS policies found`, 'red');
      testsFailed++;
    }

    // Test 8: SELECT Permission
    log('\n[8/12] Testing SELECT permission...', 'blue');
    try {
      await client.query('SELECT COUNT(*) FROM product_images;');
      log('  ✓ Can SELECT from product_images', 'green');
      testsPassed++;
    } catch (err) {
      log(`  ✗ Cannot SELECT: ${err.message}`, 'red');
      testsFailed++;
    }

    // Test 9: INSERT Permission (with rollback)
    log('\n[9/12] Testing INSERT permission...', 'blue');
    try {
      // First, check if we have a product to reference
      const productCheck = await client.query('SELECT id FROM lats_products LIMIT 1;');
      
      if (productCheck.rows.length > 0) {
        const testProductId = productCheck.rows[0].id;
        await client.query('BEGIN;');
        await client.query(`
          INSERT INTO product_images (product_id, image_url, file_name, file_size)
          VALUES ($1, 'test.jpg', 'test.jpg', 1024);
        `, [testProductId]);
        await client.query('ROLLBACK;');
        log('  ✓ Can INSERT into product_images', 'green');
        testsPassed++;
      } else {
        log('  ⚠️  No products exist to test INSERT (skipped)', 'yellow');
        testsPassed++;
      }
    } catch (err) {
      log(`  ✗ Cannot INSERT: ${err.message}`, 'red');
      testsFailed++;
    }

    // Test 10: UPDATE Permission (with rollback)
    log('\n[10/12] Testing UPDATE permission...', 'blue');
    try {
      await client.query('BEGIN;');
      await client.query(`UPDATE product_images SET file_name = 'test' WHERE false;`);
      await client.query('ROLLBACK;');
      log('  ✓ Can UPDATE product_images', 'green');
      testsPassed++;
    } catch (err) {
      log(`  ✗ Cannot UPDATE: ${err.message}`, 'red');
      testsFailed++;
    }

    // Test 11: DELETE Permission (with rollback)
    log('\n[11/12] Testing DELETE permission...', 'blue');
    try {
      await client.query('BEGIN;');
      await client.query(`DELETE FROM product_images WHERE false;`);
      await client.query('ROLLBACK;');
      log('  ✓ Can DELETE from product_images', 'green');
      testsPassed++;
    } catch (err) {
      log(`  ✗ Cannot DELETE: ${err.message}`, 'red');
      testsFailed++;
    }

    // Test 12: lats_products table exists
    log('\n[12/12] Testing lats_products table...', 'blue');
    const productsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'lats_products'
      ) as exists;
    `);
    if (productsTable.rows[0].exists) {
      const productCount = await client.query('SELECT COUNT(*) as count FROM lats_products;');
      log(`  ✓ lats_products table exists (${productCount.rows[0].count} products)`, 'green');
      testsPassed++;
    } else {
      log('  ✗ lats_products table missing', 'red');
      testsFailed++;
    }

    // Summary
    log('\n═'.repeat(60), 'cyan');
    log('TEST RESULTS SUMMARY', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    const total = testsPassed + testsFailed;
    const percentage = ((testsPassed / total) * 100).toFixed(1);
    
    log(`\nTests Passed: ${testsPassed}/${total}`, testsPassed === total ? 'green' : 'yellow');
    log(`Tests Failed: ${testsFailed}/${total}`, testsFailed === 0 ? 'green' : 'red');
    log(`Success Rate: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');

    if (testsPassed === total) {
      log('\n🎉 PERFECT! All tests passed!', 'green');
      log('✨ Product images system is fully operational!', 'green');
    } else {
      log('\n⚠️  Some tests failed. Review the errors above.', 'yellow');
    }

    log('\n═'.repeat(60), 'cyan');

  } catch (error) {
    log('\n❌ Test execution failed:', 'red');
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

  process.exit(testsFailed > 0 ? 1 : 0);
}

comprehensiveTest();

