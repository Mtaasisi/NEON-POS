/**
 * Create required Supabase storage buckets
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBuckets() {
  const bucketsToCreate = [
    { name: 'receipts', public: true },
    { name: 'public-files', public: true },
    { name: 'whatsapp-media', public: true },
    { name: 'images', public: true },
    { name: 'uploads', public: true }
  ];

  console.log('🏗️ Creating Supabase storage buckets...');

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
  console.log('💡 You can now test the receipt sharing functionality.');
}

// Run the bucket creation
createBuckets().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
