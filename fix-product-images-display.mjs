#!/usr/bin/env node

/**
 * Fix Product Images Display Issue
 * 
 * This script:
 * 1. Checks if images are stored as base64 data URLs
 * 2. Verifies images are being loaded correctly
 * 3. Provides recommendations for fixing the display issue
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAndFixImages() {
  console.log('\n🔍 Checking Product Images Display Issue...\n');

  try {
    // 1. Get all product images
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('id, product_id, image_url, thumbnail_url, file_name, is_primary')
      .order('created_at', { ascending: false })
      .limit(50);

    if (imagesError) {
      console.error('❌ Error querying product_images:', imagesError);
      return;
    }

    if (!images || images.length === 0) {
      console.log('⚠️  No product images found in database');
      return;
    }

    console.log(`✅ Found ${images.length} product images\n`);

    // 2. Analyze image URL formats
    const analysis = {
      base64: 0,
      relative: 0,
      absolute: 0,
      empty: 0,
      total: images.length
    };

    const base64Images = [];
    const relativeImages = [];
    const absoluteImages = [];

    images.forEach(img => {
      const url = img.image_url;
      if (!url || url.trim() === '') {
        analysis.empty++;
      } else if (url.startsWith('data:')) {
        analysis.base64++;
        base64Images.push(img);
      } else if (url.startsWith('/')) {
        analysis.relative++;
        relativeImages.push(img);
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        analysis.absolute++;
        absoluteImages.push(img);
      }
    });

    console.log('📊 Image URL Format Analysis:');
    console.log(`   - Base64 Data URLs: ${analysis.base64} (${((analysis.base64 / analysis.total) * 100).toFixed(1)}%)`);
    console.log(`   - Relative Paths (/images/...): ${analysis.relative} (${((analysis.relative / analysis.total) * 100).toFixed(1)}%)`);
    console.log(`   - Absolute URLs (http/https): ${analysis.absolute} (${((analysis.absolute / analysis.total) * 100).toFixed(1)}%)`);
    console.log(`   - Empty/NULL: ${analysis.empty} (${((analysis.empty / analysis.total) * 100).toFixed(1)}%)\n`);

    // 3. Check if products have images attached
    const productIds = [...new Set(images.map(img => img.product_id))];
    console.log(`📦 Checking ${productIds.length} products with images...\n`);

    // 4. Sample check - verify a few products
    const sampleProductIds = productIds.slice(0, 5);
    for (const productId of sampleProductIds) {
      const productImages = images.filter(img => img.product_id === productId);
      console.log(`   Product ${productId.substring(0, 8)}...:`);
      console.log(`     - Total images: ${productImages.length}`);
      console.log(`     - Primary images: ${productImages.filter(img => img.is_primary).length}`);
      
      const primaryImage = productImages.find(img => img.is_primary) || productImages[0];
      if (primaryImage) {
        const urlType = primaryImage.image_url?.startsWith('data:') ? 'Base64' : 
                       primaryImage.image_url?.startsWith('/') ? 'Relative' :
                       primaryImage.image_url?.startsWith('http') ? 'Absolute' : 'Unknown';
        console.log(`     - Primary image type: ${urlType}`);
        console.log(`     - Primary image URL: ${primaryImage.image_url?.substring(0, 60)}...`);
        console.log(`     - Thumbnail URL: ${primaryImage.thumbnail_url ? primaryImage.thumbnail_url.substring(0, 60) + '...' : 'NULL'}`);
      }
      console.log('');
    }

    // 5. Recommendations
    console.log('\n💡 Recommendations:\n');
    
    if (analysis.base64 > 0) {
      console.log('⚠️  ISSUE FOUND: Images are stored as base64 data URLs');
      console.log('   This can cause:');
      console.log('   - Slow page loading (large data URLs)');
      console.log('   - Database bloat');
      console.log('   - Display issues in thumbnails');
      console.log('\n   SOLUTION:');
      console.log('   1. Re-upload images to save them as file paths');
      console.log('   2. Or migrate existing base64 images to file system');
      console.log('   3. Ensure API server is running (npm run api)');
      console.log('   4. Verify /api/upload-image endpoint is working\n');
    }

    if (analysis.relative > 0) {
      console.log('✅ Good: Some images use relative paths (/images/...)');
      console.log('   These should display correctly if:');
      console.log('   - Files exist in public/images/products/ directory');
      console.log('   - Server is serving static files from /images route\n');
    }

    // 6. Check if files exist for relative paths
    if (relativeImages.length > 0) {
      console.log('🔍 Checking relative path images...');
      const sampleRelative = relativeImages[0];
      console.log(`   Sample: ${sampleRelative.image_url}`);
      console.log('   Note: File existence check requires server-side access\n');
    }

    // 7. Summary
    console.log('\n📋 Summary:');
    console.log(`   Total images: ${analysis.total}`);
    console.log(`   Products with images: ${productIds.length}`);
    console.log(`   Base64 images (needs attention): ${analysis.base64}`);
    console.log(`   Relative path images (should work): ${analysis.relative}`);
    console.log(`   Absolute URL images (external): ${analysis.absolute}\n`);

    if (analysis.base64 > 0) {
      console.log('⚠️  ACTION REQUIRED:');
      console.log('   Base64 images may not display properly in thumbnails.');
      console.log('   Consider re-uploading these images to use file paths instead.\n');
    } else {
      console.log('✅ All images use proper file paths or URLs\n');
    }

  } catch (error) {
    console.error('❌ Error checking product images:', error);
    process.exit(1);
  }
}

checkAndFixImages();
