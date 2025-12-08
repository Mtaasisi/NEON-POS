#!/usr/bin/env node
/**
 * Create WhatsApp Storage Buckets in Supabase
 * 
 * This script creates the required storage buckets for WhatsApp media uploads:
 * - whatsapp-media
 * - receipts
 * - public-files
 * 
 * Usage:
 *   node create-whatsapp-buckets.mjs
 * 
 * Make sure to set SUPABASE_SERVICE_ROLE_KEY environment variable or update it below
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

// Buckets to create
const BUCKETS = [
  {
    name: 'whatsapp-media',
    public: true,
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: null // Allow all types
  },
  {
    name: 'receipts',
    public: true,
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: null // Allow all types
  },
  {
    name: 'public-files',
    public: true,
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: null // Allow all types
  }
];

async function createBucket(supabase, bucketConfig) {
  try {
    console.log(`\n📦 Creating bucket "${bucketConfig.name}"...`);
    
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (!listError && existingBuckets) {
      const exists = existingBuckets.some(b => b.name === bucketConfig.name);
      if (exists) {
        console.log(`✅ Bucket "${bucketConfig.name}" already exists`);
        return { success: true, exists: true };
      }
    }
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket(bucketConfig.name, {
      public: bucketConfig.public,
      fileSizeLimit: bucketConfig.fileSizeLimit,
      allowedMimeTypes: bucketConfig.allowedMimeTypes
    });
    
    if (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log(`✅ Bucket "${bucketConfig.name}" already exists`);
        return { success: true, exists: true };
      }
      console.error(`❌ Error creating "${bucketConfig.name}":`, error.message);
      return { success: false, error: error.message };
    }
    
    console.log(`✅ Successfully created bucket "${bucketConfig.name}"`);
    console.log(`   - Public: ${bucketConfig.public ? 'Yes' : 'No'}`);
    console.log(`   - Size limit: ${(bucketConfig.fileSizeLimit / 1024 / 1024).toFixed(0)} MB`);
    
    return { success: true, exists: false };
    
  } catch (err) {
    console.error(`❌ Exception creating "${bucketConfig.name}":`, err.message);
    return { success: false, error: err.message };
  }
}

async function createStoragePolicies(supabase) {
  console.log('\n🔒 Setting up storage policies...');
  
  const policies = [
    {
      name: 'Allow authenticated uploads',
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'whatsapp-media' OR 
          bucket_id = 'receipts' OR 
          bucket_id = 'public-files'
        );
      `
    },
    {
      name: 'Allow authenticated reads',
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow authenticated reads"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
          bucket_id = 'whatsapp-media' OR 
          bucket_id = 'receipts' OR 
          bucket_id = 'public-files'
        );
      `
    },
    {
      name: 'Allow public reads',
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow public reads"
        ON storage.objects FOR SELECT
        TO public
        USING (
          bucket_id = 'whatsapp-media' OR 
          bucket_id = 'receipts' OR 
          bucket_id = 'public-files'
        );
      `
    }
  ];
  
  // Note: Policy creation requires direct SQL execution
  // This would need to be run in Supabase SQL Editor
  console.log('⚠️  Storage policies need to be created manually in Supabase SQL Editor.');
  console.log('   See FIX_WHATSAPP_STORAGE_BUCKETS.md for policy SQL.');
}

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  CREATE WHATSAPP STORAGE BUCKETS              ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  
  if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not set!');
    console.log('\nPlease either:');
    console.log('1. Set environment variable: export SUPABASE_SERVICE_ROLE_KEY=your_key');
    console.log('2. Or update the SUPABASE_SERVICE_ROLE_KEY in this script');
    console.log('\nGet your service role key from:');
    console.log('   Supabase Dashboard → Settings → API → service_role key');
    process.exit(1);
  }
  
  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log(`📡 Connecting to Supabase: ${SUPABASE_URL}\n`);
  
  // Create all buckets
  const results = [];
  for (const bucketConfig of BUCKETS) {
    const result = await createBucket(supabase, bucketConfig);
    results.push({ name: bucketConfig.name, ...result });
  }
  
  // Print summary
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                      ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const existing = results.filter(r => r.exists).length;
  
  console.log(`✅ Successful: ${successful}/${BUCKETS.length}`);
  console.log(`⚠️  Already existed: ${existing}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed buckets:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  }
  
  // Setup policies info
  await createStoragePolicies(supabase);
  
  console.log('\n✅ Done!');
  console.log('\nNext steps:');
  console.log('1. Verify buckets in Supabase Dashboard → Storage');
  console.log('2. Set up storage policies (see FIX_WHATSAPP_STORAGE_BUCKETS.md)');
  console.log('3. Test WhatsApp receipt upload');
}

// Run the script
main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
