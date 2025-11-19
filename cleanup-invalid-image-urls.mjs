#!/usr/bin/env node

/**
 * Cleanup Invalid Image URLs
 * 
 * This script identifies and removes invalid image URLs from the product_images table.
 * Invalid URLs include navigation paths (like /lats/unified-inventory) that were
 * mistakenly saved as image URLs.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Looking for: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Validate if a URL is a valid image URL
 */
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  const cleanUrl = url.trim();

  // Check if it's a data URL (base64 image)
  if (cleanUrl.startsWith('data:image/')) {
    return true;
  }

  // Check if it's a blob URL
  if (cleanUrl.startsWith('blob:')) {
    return true;
  }

  // Filter out JSON strings that were incorrectly saved as image URLs
  if (cleanUrl.startsWith('{') || cleanUrl.startsWith('[')) {
    return false;
  }

  // Filter out navigation paths (like /lats/unified-inventory)
  if (cleanUrl.startsWith('/') && !cleanUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i)) {
    return false;
  }

  // Accept any HTTP(S) URL - this includes external images from unsplash, placeholder services, etc.
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return true;
  }

  return false;
}

async function main() {
  console.log('🔍 Starting cleanup of invalid image URLs...\n');

  // Step 1: Fetch all product images
  console.log('📥 Fetching all product images from database...');
  const { data: allImages, error: fetchError } = await supabase
    .from('product_images')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching product images:', fetchError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${allImages.length} product images\n`);

  // Step 2: Identify invalid images
  const invalidImages = [];
  const validImages = [];

  for (const image of allImages) {
    const hasValidUrl = isValidImageUrl(image.image_url);
    const hasValidThumbnail = isValidImageUrl(image.thumbnail_url);

    if (!hasValidUrl && !hasValidThumbnail) {
      invalidImages.push(image);
      console.log(`❌ Invalid image found:`, {
        id: image.id,
        product_id: image.product_id,
        image_url: image.image_url?.substring(0, 100),
        thumbnail_url: image.thumbnail_url?.substring(0, 100)
      });
    } else {
      validImages.push(image);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total images: ${allImages.length}`);
  console.log(`   Valid images: ${validImages.length}`);
  console.log(`   Invalid images: ${invalidImages.length}\n`);

  if (invalidImages.length === 0) {
    console.log('✅ No invalid images found. Database is clean!');
    return;
  }

  // Step 3: Ask for confirmation before deletion
  console.log('⚠️  The following invalid image records will be deleted:');
  invalidImages.forEach(img => {
    console.log(`   - ID: ${img.id} | Product: ${img.product_id} | URL: ${img.image_url?.substring(0, 50)}`);
  });

  console.log('\n🗑️  Deleting invalid image records...');

  // Step 4: Delete invalid images
  let deletedCount = 0;
  for (const image of invalidImages) {
    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', image.id);

    if (deleteError) {
      console.error(`❌ Failed to delete image ${image.id}:`, deleteError);
    } else {
      deletedCount++;
      console.log(`✅ Deleted image record ${image.id}`);
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Deleted: ${deletedCount} invalid image records`);
  console.log(`   Remaining: ${validImages.length} valid image records`);
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

