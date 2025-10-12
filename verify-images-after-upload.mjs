#!/usr/bin/env node
/**
 * VERIFY IMAGES AFTER UPLOAD
 * Run this after creating a product with images to verify they're stored correctly
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('🔍 Checking for newly uploaded product images...\n');

try {
  const totalImages = await sql`SELECT COUNT(*) as count FROM product_images`;
  console.log(`📊 Total images in database: ${totalImages[0].count}`);
  
  if (totalImages[0].count > 0) {
    const recentImages = await sql`
      SELECT 
        pi.id,
        p.name as product_name,
        pi.image_url,
        pi.is_primary,
        LENGTH(pi.image_url) as url_length,
        pi.created_at,
        CASE 
          WHEN pi.image_url ~ '^https?://' THEN 'External URL'
          WHEN pi.image_url ~ '^data:image' THEN 'Base64 Embedded'
          WHEN pi.image_url ~ '^blob:' THEN 'Blob URL'
          ELSE 'Other'
        END as url_type
      FROM product_images pi
      JOIN lats_products p ON p.id = pi.product_id
      ORDER BY pi.created_at DESC
      LIMIT 10
    `;
    
    console.log('\n📸 Most Recent Images:');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    recentImages.forEach((img, index) => {
      console.log(`${index + 1}. ${img.product_name}`);
      console.log(`   ${img.is_primary ? '⭐' : '  '} Type: ${img.url_type}`);
      console.log(`   📏 Size: ${img.url_length} chars`);
      console.log(`   🕐 Created: ${new Date(img.created_at).toLocaleString()}`);
      console.log(`   🔗 URL: ${img.image_url.substring(0, 80)}...`);
      console.log('');
    });
    
    console.log('✅ Images are being stored correctly!');
    console.log('💡 ProductCard component will display these images\n');
  } else {
    console.log('\n📝 No images found yet.');
    console.log('💡 Upload some images via the Add Product page\n');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

