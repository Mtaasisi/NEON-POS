#!/usr/bin/env node

/**
 * Manual Product Thumbnail Updater
 * 
 * This script helps you manually update thumbnails for your product images
 * Usage: node update-product-thumbnails.mjs
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

console.log('📸 Product Thumbnail Manager\n');
console.log('='.repeat(80));

async function checkProductImages() {
  try {
    // Check if product_images table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_images'
      )
    `;

    if (!tableCheck[0].exists) {
      console.log('\n⚠️  product_images table does not exist yet');
      console.log('\nℹ️  This is normal if you haven\'t uploaded any product images.');
      console.log('\nTo set up the product_images table, you need to:');
      console.log('1. Upload an image through the product form in the app');
      console.log('2. Or manually create the table using the migration script');
      return;
    }

    // Get all product images
    const images = await sql`
      SELECT 
        pi.id,
        pi.product_id,
        pi.image_url,
        pi.thumbnail_url,
        pi.file_name,
        pi.file_size,
        pi.is_primary,
        p.name as product_name,
        p.sku
      FROM product_images pi
      LEFT JOIN lats_products p ON pi.product_id = p.id
      ORDER BY pi.created_at DESC
    `;

    if (images.length === 0) {
      console.log('\n📭 No product images found in database');
      console.log('\nℹ️  Upload some product images first, then you can add custom thumbnails.');
      return;
    }

    console.log(`\n✅ Found ${images.length} product images\n`);
    console.log('='.repeat(80));

    let needsThumbnails = 0;
    let hasThumbnails = 0;

    images.forEach((img, index) => {
      console.log(`\nImage #${index + 1}:`);
      console.log(`  • Image ID:      ${img.id}`);
      console.log(`  • Product:       ${img.product_name || 'Unknown'} (${img.sku || 'No SKU'})`);
      console.log(`  • File:          ${img.file_name}`);
      console.log(`  • Size:          ${(img.file_size / 1024).toFixed(2)} KB`);
      console.log(`  • Primary:       ${img.is_primary ? '✅ Yes' : 'No'}`);
      console.log(`  • Image URL:     ${img.image_url ? '✅ Set' : '❌ Missing'}`);
      
      // Check thumbnail status
      const hasDifferentThumbnail = img.thumbnail_url && img.thumbnail_url !== img.image_url;
      const hasSameThumbnail = img.thumbnail_url === img.image_url;
      const noThumbnail = !img.thumbnail_url;

      if (hasDifferentThumbnail) {
        console.log(`  • Thumbnail:     ✅ Custom thumbnail (different from main image)`);
        hasThumbnails++;
      } else if (hasSameThumbnail) {
        console.log(`  • Thumbnail:     ⚠️  Same as main image (no custom thumbnail)`);
        needsThumbnails++;
      } else {
        console.log(`  • Thumbnail:     ❌ Not set`);
        needsThumbnails++;
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`  • Total Images:           ${images.length}`);
    console.log(`  • With Custom Thumbnails: ${hasThumbnails}`);
    console.log(`  • Needs Thumbnails:       ${needsThumbnails}`);

    if (needsThumbnails > 0) {
      console.log('\n💡 HOW TO ADD CUSTOM THUMBNAILS:\n');
      console.log('Option 1: Use the ThumbnailUploader component in your app');
      console.log('  → Add <ThumbnailUploader imageId="..." userId="..." /> to your product form');
      console.log('');
      console.log('Option 2: Use the API directly');
      console.log('  → UnifiedImageService.uploadThumbnail(thumbnailFile, imageId, userId)');
      console.log('');
      console.log('Option 3: Update manually in database');
      console.log('  → Run SQL: UPDATE product_images SET thumbnail_url = \'your-url\' WHERE id = \'image-id\'');
      console.log('');
      console.log('📖 See MANUAL_THUMBNAIL_UPLOAD_GUIDE.md for detailed instructions');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('\n💡 TIP: The product_images table will be created when you upload your first image');
    }
  }
}

// Example: Update thumbnail URL manually (uncomment to use)
async function updateThumbnailManually(imageId, thumbnailUrl) {
  try {
    await sql`
      UPDATE product_images 
      SET thumbnail_url = ${thumbnailUrl}
      WHERE id = ${imageId}
    `;
    console.log('✅ Thumbnail updated successfully!');
  } catch (error) {
    console.error('❌ Failed to update thumbnail:', error.message);
  }
}

// Run the check
checkProductImages();

// Example usage (uncomment and modify to update a thumbnail):
// await updateThumbnailManually('your-image-id-here', 'https://your-thumbnail-url.com/thumb.jpg');

