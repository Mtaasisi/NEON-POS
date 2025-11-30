#!/usr/bin/env node

/**
 * Cleanup Empty Image URLs
 * 
 * This script removes product_images records with empty or null URLs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupEmptyImages() {
  console.log('🧹 Cleaning up empty image URLs...\n');
  console.log('=' .repeat(60));

  // Step 1: Find records with empty URLs
  console.log('\n📋 Step 1: Finding records with empty URLs...');
  
  const { data: emptyImages, error: findError } = await supabase
    .from('product_images')
    .select('id, product_id, file_name, image_url, thumbnail_url, created_at')
    .or('image_url.is.null,image_url.eq.,thumbnail_url.is.null,thumbnail_url.eq.');

  if (findError) {
    console.error('❌ Error finding empty images:', findError);
    process.exit(1);
  }

  if (!emptyImages || emptyImages.length === 0) {
    console.log('✅ No records with empty URLs found. Database is clean!');
    return;
  }

  console.log(`\n⚠️  Found ${emptyImages.length} record(s) with empty URLs:`);
  emptyImages.forEach((img, index) => {
    console.log(`\n  ${index + 1}. ID: ${img.id}`);
    console.log(`     Product: ${img.product_id}`);
    console.log(`     File: ${img.file_name}`);
    console.log(`     URL Length: ${img.image_url?.length || 0}`);
    console.log(`     Thumbnail Length: ${img.thumbnail_url?.length || 0}`);
    console.log(`     Created: ${new Date(img.created_at).toLocaleString()}`);
  });

  // Step 2: Delete the records
  console.log('\n\n📋 Step 2: Deleting records with empty URLs...');
  
  const { error: deleteError, count } = await supabase
    .from('product_images')
    .delete()
    .or('image_url.is.null,image_url.eq.,thumbnail_url.is.null,thumbnail_url.eq.')
    .select('id', { count: 'exact', head: true });

  if (deleteError) {
    console.error('❌ Error deleting records:', deleteError);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${emptyImages.length} record(s) with empty URLs`);

  // Step 3: Verify cleanup
  console.log('\n📋 Step 3: Verifying cleanup...');
  
  const { data: remainingEmpty, error: verifyError } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .or('image_url.is.null,image_url.eq.,thumbnail_url.is.null,thumbnail_url.eq.');

  if (verifyError) {
    console.error('⚠️  Could not verify cleanup:', verifyError);
  } else {
    const remaining = remainingEmpty?.length || 0;
    if (remaining === 0) {
      console.log('✅ Cleanup verified! No empty URLs remain.');
    } else {
      console.log(`⚠️  Warning: ${remaining} records with empty URLs still exist.`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Cleanup complete!\n');
  console.log('📝 Summary:');
  console.log(`   - Found: ${emptyImages.length} record(s)`);
  console.log(`   - Deleted: ${emptyImages.length} record(s)`);
  console.log('\n💡 You can now upload new images and they should display correctly!\n');
}

// Run the cleanup
cleanupEmptyImages().catch(err => {
  console.error('❌ Cleanup failed with error:', err);
  process.exit(1);
});

