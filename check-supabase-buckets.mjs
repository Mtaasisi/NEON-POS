/**
 * Check available Supabase storage buckets
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuckets() {
  try {
    console.log('🔍 Checking Supabase storage buckets...');

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error fetching buckets:', error.message);
      return;
    }

    console.log('📦 Available buckets:', buckets?.length || 0);

    if (buckets && buckets.length > 0) {
      buckets.forEach(bucket => {
        console.log(`  • ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    } else {
      console.log('  No buckets found');
    }

    // Check for common bucket names
    const commonBuckets = ['receipts', 'public-files', 'whatsapp-media', 'images', 'uploads', 'documents'];
    const existingBuckets = buckets?.map(b => b.name) || [];

    console.log('\n🔍 Checking common bucket names:');
    commonBuckets.forEach(bucketName => {
      const exists = existingBuckets.includes(bucketName);
      console.log(`  • ${bucketName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });

    // Suggest creating missing buckets
    const missingBuckets = commonBuckets.filter(name => !existingBuckets.includes(name));
    if (missingBuckets.length > 0) {
      console.log('\n💡 To fix the issue, create these buckets in Supabase Dashboard:');
      console.log('   Go to: https://supabase.com/dashboard/project/jxhzveborezjhsmzsgbc/storage');
      console.log('   Create buckets with these names:');
      missingBuckets.forEach(name => {
        console.log(`   • ${name} (set as public)`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the check
checkBuckets();
