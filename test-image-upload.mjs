#!/usr/bin/env node

/**
 * Test Image Upload Functionality
 * Verifies the product_images table can accept uploads
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

async function testImageUpload() {
  let client;

  try {
    log('\n🧪 Testing Image Upload Functionality', 'cyan');
    log('═'.repeat(50), 'cyan');

    const databaseUrl = getDatabaseUrl();
    client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    log('✓ Connected to database', 'green');

    // Test 1: Verify table exists
    log('\n[1/4] Checking product_images table...', 'blue');
    const tableCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'product_images'
      ORDER BY ordinal_position;
    `);
    log(`✓ Table has ${tableCheck.rows.length} columns`, 'green');
    
    // Test 2: Check if we have products to test with
    log('\n[2/4] Checking for test product...', 'blue');
    const productCheck = await client.query('SELECT id, name FROM lats_products LIMIT 1;');
    
    if (productCheck.rows.length === 0) {
      log('⚠️  No products found. Please create a product first.', 'yellow');
      return;
    }
    
    const testProduct = productCheck.rows[0];
    log(`✓ Found test product: ${testProduct.name}`, 'green');

    // Test 3: Try to insert a test image record
    log('\n[3/4] Testing image insert...', 'blue');
    
    const testImageData = {
      product_id: testProduct.id,
      image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      thumbnail_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      file_name: 'test-image.png',
      file_size: 1024,
      is_primary: false,
      uploaded_by: '00000000-0000-0000-0000-000000000000',
      mime_type: 'image/png'
    };

    const { data: insertedImage, error: insertError } = await client.query(`
      INSERT INTO product_images (
        product_id, image_url, thumbnail_url, file_name, 
        file_size, is_primary, uploaded_by, mime_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      testImageData.product_id,
      testImageData.image_url,
      testImageData.thumbnail_url,
      testImageData.file_name,
      testImageData.file_size,
      testImageData.is_primary,
      testImageData.uploaded_by,
      testImageData.mime_type
    ]);

    if (insertError) {
      throw insertError;
    }

    log('✓ Successfully inserted test image', 'green');

    // Test 4: Clean up test data
    log('\n[4/4] Cleaning up test data...', 'blue');
    await client.query('DELETE FROM product_images WHERE file_name = $1;', ['test-image.png']);
    log('✓ Test data cleaned up', 'green');

    log('\n═'.repeat(50), 'green');
    log('✅ All Tests Passed!', 'green');
    log('═'.repeat(50), 'green');
    
    log('\n✨ Image upload functionality is ready!', 'cyan');
    log('   You can now upload images through the UI.', 'white');

  } catch (error) {
    log('\n❌ Test Failed:', 'red');
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

testImageUpload();

