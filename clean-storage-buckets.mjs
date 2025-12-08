import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

// Allow override from environment
const SUPABASE_URL_FINAL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_URL;
const SUPABASE_KEY_FINAL = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL_FINAL || !SUPABASE_KEY_FINAL) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY are required');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL_FINAL, SUPABASE_KEY_FINAL);

async function listAllFilesInBucket(bucketName, path = '', allFiles = []) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error(`   ❌ Error listing ${bucketName}${path ? '/' + path : ''}:`, error.message);
      return allFiles;
    }

    if (!data || data.length === 0) {
      return allFiles;
    }

    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      
      if (item.id === null) {
        // It's a folder, recurse
        await listAllFilesInBucket(bucketName, fullPath, allFiles);
      } else {
        // It's a file
        allFiles.push(fullPath);
      }
    }

    return allFiles;
  } catch (error) {
    console.error(`   ❌ Error in listAllFilesInBucket for ${bucketName}:`, error.message);
    return allFiles;
  }
}

async function deleteFilesFromBucket(bucketName, files) {
  if (files.length === 0) {
    return { deleted: 0, errors: 0 };
  }

  let deleted = 0;
  let errors = 0;

  // Delete in batches of 100 (Supabase limit)
  const batchSize = 100;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove(batch);

      if (error) {
        console.error(`   ❌ Error deleting batch from ${bucketName}:`, error.message);
        errors += batch.length;
      } else {
        deleted += batch.length;
        process.stdout.write(`   Progress: ${deleted}/${files.length} files deleted...\r`);
      }
    } catch (error) {
      console.error(`   ❌ Exception deleting batch from ${bucketName}:`, error.message);
      errors += batch.length;
    }
  }

  return { deleted, errors };
}

async function cleanStorageBuckets() {
  console.log('🧹 Starting Storage Buckets Cleanup\n');
  console.log('⚠️  WARNING: This will DELETE ALL FILES from ALL buckets!\n');
  console.log('📊 Connecting to Supabase Storage...\n');
  console.log(`   URL: ${SUPABASE_URL}\n`);

  try {
    // Step 1: List all buckets
    console.log('📋 Step 1: Listing all storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      console.error('\n💡 Tip: You may need SUPABASE_SERVICE_ROLE_KEY for admin operations.');
      console.error('   Set it as environment variable: export SUPABASE_SERVICE_ROLE_KEY=your_key');
      process.exit(1);
    }

    if (!buckets || buckets.length === 0) {
      console.log('⚠️  No buckets found with current permissions.');
      console.log('\n💡 This could mean:');
      console.log('   1. Storage is already clean (no buckets exist)');
      console.log('   2. Anon key lacks permission to list buckets');
      console.log('\n📋 Trying known bucket names directly...');
      
      // Try known bucket names from the codebase
      const knownBuckets = ['product-images', 'whatsapp-media', 'images', 'media', 'uploads'];
      let foundAnyFiles = false;
      
      for (const bucketName of knownBuckets) {
        console.log(`\n   Checking bucket: ${bucketName}...`);
        const files = await listAllFilesInBucket(bucketName);
        if (files.length > 0) {
          foundAnyFiles = true;
          console.log(`   ✅ Found ${files.length} file(s) in "${bucketName}"`);
          console.log(`   🗑️  Deleting files...`);
          const result = await deleteFilesFromBucket(bucketName, files);
          console.log(`   ✅ Deleted ${result.deleted} file(s) from "${bucketName}"`);
          if (result.errors > 0) {
            console.log(`   ⚠️  ${result.errors} file(s) had errors`);
          }
        } else {
          console.log(`   ✅ "${bucketName}" is empty or doesn't exist`);
        }
      }
      
      if (!foundAnyFiles) {
        console.log('\n✅ All known buckets are clean or don\'t exist!');
        console.log('\n💡 To fully clean storage, you may need SUPABASE_SERVICE_ROLE_KEY.');
        console.log('   Get it from: https://supabase.com/dashboard/project/jxhzveborezjhsmzsgbc/settings/api');
        console.log('   Then run: export SUPABASE_SERVICE_ROLE_KEY=your_key && node clean-storage-buckets.mjs');
      }
      return;
    }

    console.log(`   Found ${buckets.length} bucket(s):`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    console.log('');

    let totalFilesDeleted = 0;
    let totalErrors = 0;

    // Step 2: For each bucket, list and delete all files
    for (const bucket of buckets) {
      console.log(`\n📦 Processing bucket: ${bucket.name}`);
      console.log('─'.repeat(60));

      // List all files in bucket (recursively)
      console.log(`   📋 Listing all files...`);
      const allFiles = await listAllFilesInBucket(bucket.name);
      
      if (allFiles.length === 0) {
        console.log(`   ✅ Bucket "${bucket.name}" is already empty`);
        continue;
      }

      console.log(`   📊 Found ${allFiles.length} file(s) in "${bucket.name}"`);
      
      // Delete all files
      console.log(`   🗑️  Deleting all files...`);
      const result = await deleteFilesFromBucket(bucket.name, allFiles);
      
      totalFilesDeleted += result.deleted;
      totalErrors += result.errors;

      if (result.deleted > 0) {
        console.log(`\n   ✅ Deleted ${result.deleted} file(s) from "${bucket.name}"`);
      }
      if (result.errors > 0) {
        console.log(`   ⚠️  ${result.errors} file(s) had errors during deletion`);
      }
    }

    // Step 3: Verify all buckets are empty
    console.log('\n\n✅ Step 3: Verifying all buckets are clean...');
    const { data: verifyBuckets } = await supabase.storage.listBuckets();
    
    let allEmpty = true;
    for (const bucket of verifyBuckets) {
      const files = await listAllFilesInBucket(bucket.name);
      if (files.length > 0) {
        console.log(`   ⚠️  Bucket "${bucket.name}" still has ${files.length} file(s)`);
        allEmpty = false;
      } else {
        console.log(`   ✅ Bucket "${bucket.name}" is clean`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Buckets processed: ${buckets.length}`);
    console.log(`✅ Files deleted: ${totalFilesDeleted}`);
    if (totalErrors > 0) {
      console.log(`⚠️  Errors: ${totalErrors}`);
    }
    
    if (allEmpty) {
      console.log('\n✨ All storage buckets are now clean!');
    } else {
      console.log('\n⚠️  Some buckets may still have files. Check above for details.');
    }
    console.log('='.repeat(60));

    console.log('\n✅ Storage cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

cleanStorageBuckets().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
