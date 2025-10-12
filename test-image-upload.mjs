#!/usr/bin/env node

/**
 * Test Image Upload Configuration
 * Run this to check if your Supabase setup is correct for image uploads
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
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

async function testImageUpload() {
  try {
    log('\n🔍 Testing Image Upload Configuration...\n', 'blue');

    // Step 1: Load environment variables
    log('Step 1: Loading environment variables...', 'cyan');
    
    // Try to find .env file
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      log('❌ No .env file found. Please create one with your Supabase credentials.', 'red');
      log('\nCreate a .env file with:', 'yellow');
      log('VITE_SUPABASE_URL=your-project-url', 'yellow');
      log('VITE_SUPABASE_ANON_KEY=your-anon-key\n', 'yellow');
      process.exit(1);
    }

    // Read .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        env[key.trim()] = value;
      }
    });

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      log('❌ Missing Supabase credentials in .env file', 'red');
      log('\nRequired variables:', 'yellow');
      log('VITE_SUPABASE_URL=your-project-url', 'yellow');
      log('VITE_SUPABASE_ANON_KEY=your-anon-key\n', 'yellow');
      process.exit(1);
    }

    log(`✅ Supabase URL: ${supabaseUrl}`, 'green');
    log('✅ Supabase Key: [FOUND]', 'green');

    // Step 2: Initialize Supabase client
    log('\nStep 2: Initializing Supabase client...', 'cyan');
    const supabase = createClient(supabaseUrl, supabaseKey);
    log('✅ Supabase client initialized', 'green');

    // Step 3: Check authentication (optional - most storage buckets don't require auth for listing)
    log('\nStep 3: Checking storage buckets...', 'cyan');
    
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        log(`❌ Failed to list buckets: ${listError.message}`, 'red');
        log('   This might be normal if you don\'t have service role access', 'yellow');
      } else {
        log(`✅ Found ${buckets.length} storage bucket(s):`, 'green');
        buckets.forEach(bucket => {
          log(`   - ${bucket.id} (${bucket.public ? 'Public' : 'Private'})`, 'cyan');
        });

        // Check if product-images bucket exists
        const productImagesBucket = buckets.find(b => b.id === 'product-images' || b.name === 'product-images');
        if (productImagesBucket) {
          log('\n✅ "product-images" bucket EXISTS!', 'green');
          log(`   - Public: ${productImagesBucket.public ? 'Yes' : 'No'}`, 'cyan');
          log(`   - Created: ${productImagesBucket.created_at}`, 'cyan');
        } else {
          log('\n❌ "product-images" bucket NOT FOUND', 'red');
          log('   You need to create it in Supabase Dashboard → Storage', 'yellow');
        }
      }
    } catch (err) {
      log(`⚠️  Could not check buckets: ${err.message}`, 'yellow');
      log('   This is OK if using anon key', 'yellow');
    }

    // Step 4: Check product_images table
    log('\nStep 4: Checking product_images table...', 'cyan');
    
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id')
        .limit(1);

      if (error) {
        log(`❌ product_images table issue: ${error.message}`, 'red');
        log('   Run CREATE-PRODUCT-IMAGES-BUCKET.sql to create the table', 'yellow');
      } else {
        log('✅ product_images table exists', 'green');
        
        // Count images
        const { count, error: countError } = await supabase
          .from('product_images')
          .select('*', { count: 'exact', head: true });
        
        if (!countError) {
          log(`   Found ${count || 0} image(s) in database`, 'cyan');
        }
      }
    } catch (err) {
      log(`❌ Failed to check product_images table: ${err.message}`, 'red');
    }

    // Step 5: Check lats_products table
    log('\nStep 5: Checking lats_products table...', 'cyan');
    
    try {
      const { count, error } = await supabase
        .from('lats_products')
        .select('*', { count: 'exact', head: true });

      if (error) {
        log(`❌ lats_products table issue: ${error.message}`, 'red');
      } else {
        log(`✅ lats_products table exists with ${count || 0} product(s)`, 'green');
      }
    } catch (err) {
      log(`❌ Failed to check lats_products table: ${err.message}`, 'red');
    }

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 DIAGNOSTIC SUMMARY', 'blue');
    log('='.repeat(60), 'cyan');
    
    log('\nTo fix image upload issues:', 'yellow');
    log('1. Create "product-images" bucket in Supabase Dashboard', 'cyan');
    log('2. Set bucket to Public', 'cyan');
    log('3. Run CREATE-PRODUCT-IMAGES-BUCKET.sql in Neon', 'cyan');
    log('4. Refresh your app and try uploading', 'cyan');
    
    log('\n✅ Diagnostic complete!\n', 'green');

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testImageUpload();

