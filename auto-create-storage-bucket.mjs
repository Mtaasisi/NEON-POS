#!/usr/bin/env node

/**
 * AUTO-CREATE STORAGE BUCKET
 * This script automatically creates the product-images bucket in Supabase
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
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function autoCreateBucket() {
  try {
    log('\n' + '='.repeat(60), 'cyan');
    log('🚀 AUTOMATIC STORAGE BUCKET CREATION', 'bold');
    log('='.repeat(60) + '\n', 'cyan');

    // Step 1: Load environment variables
    log('Step 1: Loading Supabase credentials...', 'cyan');
    
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      log('❌ No .env file found', 'red');
      log('\nCreate a .env file with:', 'yellow');
      log('VITE_SUPABASE_URL=your-project-url', 'yellow');
      log('VITE_SUPABASE_ANON_KEY=your-anon-key', 'yellow');
      log('VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n', 'yellow');
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
    const supabaseServiceKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      log('❌ Missing VITE_SUPABASE_URL in .env file', 'red');
      process.exit(1);
    }

    // Use service role key if available, otherwise anon key
    const apiKey = supabaseServiceKey || supabaseAnonKey;
    
    if (!apiKey) {
      log('❌ Missing Supabase API key in .env file', 'red');
      log('Need either VITE_SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY', 'yellow');
      process.exit(1);
    }

    const usingServiceRole = !!supabaseServiceKey;
    
    log(`✅ Supabase URL: ${supabaseUrl}`, 'green');
    log(`✅ Using ${usingServiceRole ? 'SERVICE ROLE' : 'ANON'} key`, 'green');
    
    if (!usingServiceRole) {
      log('⚠️  Using anon key - may have limited permissions', 'yellow');
      log('   For full control, add VITE_SUPABASE_SERVICE_ROLE_KEY to .env', 'yellow');
    }

    // Step 2: Initialize Supabase client
    log('\nStep 2: Connecting to Supabase...', 'cyan');
    const supabase = createClient(supabaseUrl, apiKey);
    log('✅ Connected successfully', 'green');

    // Step 3: Check if bucket already exists
    log('\nStep 3: Checking existing buckets...', 'cyan');
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      log(`❌ Failed to list buckets: ${listError.message}`, 'red');
      
      if (!usingServiceRole) {
        log('\n💡 Tip: Anon key may not have permission to list buckets', 'yellow');
        log('   Get your SERVICE ROLE key from:', 'yellow');
        log('   Supabase Dashboard → Settings → API → service_role key', 'yellow');
        log('   Add it to .env as: VITE_SUPABASE_SERVICE_ROLE_KEY=your-key\n', 'yellow');
      }
      
      process.exit(1);
    }

    log(`✅ Found ${buckets.length} existing bucket(s)`, 'green');
    
    // Check if product-images bucket exists
    const existingBucket = buckets.find(b => b.id === 'product-images' || b.name === 'product-images');
    
    if (existingBucket) {
      log('\n✅ "product-images" bucket ALREADY EXISTS!', 'green');
      log(`   • Public: ${existingBucket.public ? 'Yes' : 'No'}`, 'cyan');
      log(`   • Created: ${existingBucket.created_at}`, 'cyan');
      log('\n🎉 Nothing to do - bucket is ready!', 'green');
      process.exit(0);
    }

    log('⚠️  "product-images" bucket NOT FOUND', 'yellow');

    // Step 4: Create the bucket
    log('\nStep 4: Creating "product-images" bucket...', 'cyan');
    
    const { data, error } = await supabase.storage.createBucket('product-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    });

    if (error) {
      log(`❌ Failed to create bucket: ${error.message}`, 'red');
      
      if (error.message.includes('permission') || error.message.includes('not authorized')) {
        log('\n💡 Permission denied - you need SERVICE ROLE key', 'yellow');
        log('   1. Go to: https://supabase.com/dashboard', 'yellow');
        log('   2. Select your project', 'yellow');
        log('   3. Go to: Settings → API', 'yellow');
        log('   4. Copy the "service_role" key (NOT the anon key)', 'yellow');
        log('   5. Add to .env: VITE_SUPABASE_SERVICE_ROLE_KEY=your-key', 'yellow');
        log('   6. Run this script again\n', 'yellow');
      } else {
        log('\n💡 Alternative: Create bucket manually', 'yellow');
        log('   1. Go to: https://supabase.com/dashboard', 'yellow');
        log('   2. Select your project', 'yellow');
        log('   3. Go to: Storage section', 'yellow');
        log('   4. Click "Create bucket"', 'yellow');
        log('   5. Name: product-images', 'yellow');
        log('   6. Make it PUBLIC ✓', 'yellow');
        log('   7. Click Create\n', 'yellow');
      }
      
      process.exit(1);
    }

    log('✅ Bucket created successfully!', 'green');

    // Step 5: Verify creation
    log('\nStep 5: Verifying bucket...', 'cyan');
    
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      log('⚠️  Could not verify bucket creation', 'yellow');
    } else {
      const createdBucket = verifyBuckets.find(b => b.id === 'product-images');
      if (createdBucket) {
        log('✅ Bucket verified successfully!', 'green');
        log(`   • Name: ${createdBucket.id}`, 'cyan');
        log(`   • Public: ${createdBucket.public ? 'Yes' : 'No'}`, 'cyan');
        log(`   • Created: ${createdBucket.created_at}`, 'cyan');
      }
    }

    // Final summary
    log('\n' + '='.repeat(60), 'cyan');
    log('✅ BUCKET CREATION COMPLETE!', 'green');
    log('='.repeat(60), 'cyan');
    
    log('\n📋 Next Steps:', 'cyan');
    log('1. ✅ Database table is ready (from AUTO-FIX-IMAGE-UPLOAD.sql)', 'green');
    log('2. ✅ Storage bucket is ready', 'green');
    log('3. 🎯 Test image upload in your app!', 'yellow');
    
    log('\n🎉 Everything is set up! Try uploading an image now.\n', 'green');

  } catch (error) {
    log(`\n❌ Script failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
autoCreateBucket();

