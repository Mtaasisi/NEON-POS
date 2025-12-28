/**
 * Create required Supabase storage buckets using service role key
 * ⚠️ WARNING: This uses admin privileges - only run this once and delete the file after
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key (ADMIN ACCESS)
// ⚠️ WARNING: This gives full admin access to your database
// Only use this temporarily and delete this file after running
const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjcxMTUyNCwiZXhwIjoyMDY4Mjg3NTI0fQ.YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createBuckets() {
  const bucketsToCreate = [
    { name: 'receipts', public: true },
    { name: 'public-files', public: true },
    { name: 'whatsapp-media', public: true }
  ];

  console.log('🏗️ Creating Supabase storage buckets with admin access...');

  for (const bucket of bucketsToCreate) {
    try {
      console.log(`📦 Creating bucket: ${bucket.name} (${bucket.public ? 'public' : 'private'})`);

      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: ['*/*'], // Allow all file types
        fileSizeLimit: 10485760 // 10MB limit
      });

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ✅ Bucket '${bucket.name}' already exists`);
        } else {
          console.error(`  ❌ Failed to create bucket '${bucket.name}':`, error.message);
        }
      } else {
        console.log(`  ✅ Created bucket '${bucket.name}' successfully`);
      }

    } catch (error) {
      console.error(`  ❌ Exception creating bucket '${bucket.name}':`, error.message);
    }
  }

  console.log('\n🔍 Verifying buckets were created...');
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Error listing buckets:', error.message);
  } else {
    console.log(`📦 Total buckets: ${buckets?.length || 0}`);
    buckets?.forEach(bucket => {
      console.log(`  • ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
  }

  console.log('\n✅ Bucket creation complete!');
  console.log('🗑️ Please delete this file now - it contains admin credentials!');
}

// Check if service role key is provided
if (serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY_HERE')) {
  console.error('❌ Please replace YOUR_SERVICE_ROLE_KEY_HERE with the actual service role key');
  console.log('💡 Get it from: https://supabase.com/dashboard/project/jxhzveborezjhsmzsgbc/settings/api');
  process.exit(1);
}

// Run the bucket creation
createBuckets().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
