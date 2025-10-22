#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function checkImageThumbnails() {
  try {
    console.log('🔍 Checking product images and thumbnails...\n');
    console.log('='.repeat(80));

    // Check if product_images table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_images'
      )
    `;

    if (!tableCheck[0].exists) {
      console.log('❌ product_images table does not exist');
      console.log('\nℹ️  Images might be stored directly in lats_products.image_url column');
      
      // Check images in lats_products
      const productsWithImages = await sql`
        SELECT 
          id,
          name,
          image_url
        FROM lats_products
        WHERE image_url IS NOT NULL AND image_url != ''
      `;
      
      console.log(`\n✅ Found ${productsWithImages.length} products with image_url\n`);
      
      productsWithImages.forEach((p, i) => {
        console.log(`Product #${i + 1}:`);
        console.log(`  • Name: ${p.name}`);
        console.log(`  • Image URL: ${p.image_url}`);
        console.log(`  • Has Thumbnail: ❌ No (same URL used for display)`);
        console.log('');
      });
      
      return;
    }

    // Get all images from product_images table
    const images = await sql`
      SELECT 
        pi.*,
        p.name as product_name
      FROM product_images pi
      LEFT JOIN lats_products p ON pi.product_id = p.id
      ORDER BY pi.created_at DESC
    `;

    if (images.length === 0) {
      console.log('📭 No images found in product_images table');
      return;
    }

    console.log(`✅ Found ${images.length} product images\n`);
    console.log('='.repeat(80));

    let imagesWithThumbnails = 0;
    let imagesWithoutThumbnails = 0;

    images.forEach((img, index) => {
      console.log(`\nImage #${index + 1}:`);
      console.log(`  • Product:     ${img.product_name || 'Unknown'}`);
      console.log(`  • File Name:   ${img.file_name}`);
      console.log(`  • File Size:   ${(img.file_size / 1024).toFixed(2)} KB`);
      console.log(`  • Image URL:   ${img.image_url}`);
      console.log(`  • Thumbnail:   ${img.thumbnail_url || 'N/A'}`);
      console.log(`  • Primary:     ${img.is_primary ? '✅ Yes' : 'No'}`);
      
      // Check if thumbnail is different from main image
      if (img.thumbnail_url && img.thumbnail_url !== img.image_url) {
        console.log(`  • Status:      ✅ Has separate thumbnail`);
        imagesWithThumbnails++;
      } else if (img.thumbnail_url === img.image_url) {
        console.log(`  • Status:      ⚠️ Thumbnail same as main image (no compression)`);
        imagesWithoutThumbnails++;
      } else {
        console.log(`  • Status:      ❌ No thumbnail URL`);
        imagesWithoutThumbnails++;
      }
      
      console.log(`  • Uploaded:    ${new Date(img.created_at).toLocaleString()}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`  • Total Images:              ${images.length}`);
    console.log(`  • With Proper Thumbnails:    ${imagesWithThumbnails}`);
    console.log(`  • Without Thumbnails:        ${imagesWithoutThumbnails}`);
    
    if (imagesWithoutThumbnails > 0) {
      console.log('\n⚠️  ISSUE DETECTED:');
      console.log('  Most images are using the same URL for both image and thumbnail.');
      console.log('  This means thumbnails are not being generated/compressed.');
      console.log('\n💡 SOLUTION:');
      console.log('  1. Enable thumbnail generation in config');
      console.log('  2. Regenerate thumbnails for existing images');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkImageThumbnails();

