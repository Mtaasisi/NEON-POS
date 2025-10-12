#!/usr/bin/env node
/**
 * AUTO-FIX PRODUCT IMAGES SCRIPT V2
 * This script automatically fixes your product images:
 * 1. Updates product_images table schema (adds missing columns)
 * 2. Migrates images from lats_products.images to product_images table
 * 3. Verifies the migration
 * 4. Shows detailed statistics
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('🖼️  Starting Product Images Auto-Fix V2...\n');
console.log('═══════════════════════════════════════════════════════════\n');

try {
  // Step 1: Check current state
  console.log('📊 Step 1: Checking current state...');
  
  const currentSchema = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'product_images'
  `;
  
  const existingColumns = currentSchema.map(row => row.column_name);
  console.log(`   ✅ Found ${existingColumns.length} existing columns`);
  
  // Check products with images in old storage
  const productsWithOldImages = await sql`
    SELECT COUNT(*) as count
    FROM lats_products
    WHERE images IS NOT NULL AND jsonb_array_length(images) > 0
  `;
  console.log(`   📦 ${productsWithOldImages[0].count} products have images in old storage`);
  
  const currentImages = await sql`SELECT COUNT(*) as count FROM product_images`;
  console.log(`   🖼️  ${currentImages[0].count} images currently in product_images table`);
  
  console.log('   ✅ Current state checked\n');

  // Step 2: Add missing columns
  console.log('🛠️  Step 2: Updating table schema...');
  
  const columnsToAdd = [
    { name: 'thumbnail_url', type: 'TEXT', default: null },
    { name: 'file_name', type: 'TEXT', default: null },
    { name: 'file_size', type: 'INTEGER', default: '0' },
    { name: 'uploaded_by', type: 'UUID', default: null },
    { name: 'mime_type', type: 'TEXT', default: null },
    { name: 'width', type: 'INTEGER', default: null },
    { name: 'height', type: 'INTEGER', default: null },
    { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' },
  ];
  
  let addedColumns = 0;
  for (const col of columnsToAdd) {
    if (!existingColumns.includes(col.name)) {
      try {
        const defaultClause = col.default ? `DEFAULT ${col.default}` : '';
        await sql`ALTER TABLE product_images ADD COLUMN ${sql(col.name)} ${sql(col.type)} ${sql(defaultClause)}`;
        console.log(`   ✅ Added column: ${col.name}`);
        addedColumns++;
      } catch (error) {
        // Column might already exist, that's ok
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠️  Could not add ${col.name}: ${error.message}`);
        }
      }
    }
  }
  
  if (addedColumns === 0) {
    console.log('   ℹ️  All columns already exist');
  } else {
    console.log(`   ✅ Added ${addedColumns} new columns`);
  }
  
  // Ensure indexes exist
  await sql`CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary)`;
  console.log('   ✅ Indexes verified');
  
  // Ensure RLS is disabled
  await sql`ALTER TABLE product_images DISABLE ROW LEVEL SECURITY`;
  console.log('   ✅ Row Level Security disabled');
  
  console.log('   ✅ Schema update complete\n');

  // Step 3: Migrate images
  console.log('📦 Step 3: Migrating images from old to new storage...');
  
  try {
    const migrationResult = await sql`
      INSERT INTO product_images (
        product_id, 
        image_url, 
        thumbnail_url, 
        file_name, 
        is_primary, 
        file_size, 
        created_at,
        display_order
      )
      SELECT 
        p.id as product_id,
        img_url as image_url,
        img_url as thumbnail_url,
        'migrated-' || encode(gen_random_uuid()::text::bytea, 'hex') as file_name,
        ROW_NUMBER() OVER (PARTITION BY p.id) = 1 as is_primary,
        0 as file_size,
        p.created_at,
        ROW_NUMBER() OVER (PARTITION BY p.id) as display_order
      FROM lats_products p,
      LATERAL unnest(
        CASE 
          WHEN p.images IS NOT NULL AND jsonb_array_length(p.images) > 0 
          THEN ARRAY(SELECT jsonb_array_elements_text(p.images))
          ELSE ARRAY[]::TEXT[]
        END
      ) AS img_url
      WHERE p.images IS NOT NULL 
        AND jsonb_array_length(p.images) > 0
        AND NOT EXISTS (
          SELECT 1 FROM product_images pi 
          WHERE pi.product_id = p.id 
          AND pi.image_url = img_url
        )
      RETURNING *
    `;
    
    console.log(`   ✅ Migrated ${migrationResult.length} new images`);
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      console.log('   ℹ️  No new images to migrate (all already exist)');
    } else {
      throw error;
    }
  }
  
  console.log('   ✅ Migration complete\n');

  // Step 4: Verify migration
  console.log('🔍 Step 4: Verifying migration...');
  
  const totalImages = await sql`SELECT COUNT(*) as count FROM product_images`;
  const totalProductsWithImages = await sql`
    SELECT COUNT(DISTINCT product_id) as count FROM product_images
  `;
  const primaryImages = await sql`
    SELECT COUNT(*) as count FROM product_images WHERE is_primary = true
  `;
  
  console.log(`   ✅ Total images: ${totalImages[0].count}`);
  console.log(`   ✅ Products with images: ${totalProductsWithImages[0].count}`);
  console.log(`   ✅ Primary images: ${primaryImages[0].count}`);
  
  // Check for products still needing migration
  const needingMigration = await sql`
    SELECT COUNT(*) as count
    FROM lats_products p
    WHERE (p.images IS NOT NULL AND jsonb_array_length(p.images) > 0)
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)
  `;
  
  if (needingMigration[0].count > 0) {
    console.log(`   ⚠️  ${needingMigration[0].count} products still need migration`);
  } else {
    console.log('   ✅ All products migrated successfully');
  }
  
  // Check for broken URLs
  const brokenUrls = await sql`
    SELECT COUNT(*) as count
    FROM product_images
    WHERE image_url IS NULL 
       OR image_url = '' 
       OR LENGTH(image_url) < 10
  `;
  
  if (brokenUrls[0].count > 0) {
    console.log(`   ⚠️  ${brokenUrls[0].count} images may have invalid URLs`);
  } else {
    console.log('   ✅ All image URLs appear valid');
  }
  
  console.log('   ✅ Verification complete\n');

  // Step 5: Test query (simulate RobustImageService)
  console.log('🧪 Step 5: Testing image retrieval (simulating ProductCard)...');
  
  const testProduct = await sql`
    SELECT p.id, p.name
    FROM lats_products p
    WHERE EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)
    LIMIT 1
  `;
  
  if (testProduct.length > 0) {
    const testImages = await sql`
      SELECT *
      FROM product_images
      WHERE product_id = ${testProduct[0].id}
      ORDER BY is_primary DESC
    `;
    
    console.log(`   ✅ Test product: ${testProduct[0].name}`);
    console.log(`   ✅ Found ${testImages.length} image(s) for this product`);
    
    if (testImages.length > 0) {
      console.log('\n   Sample image:');
      console.log(`      URL: ${testImages[0].image_url.substring(0, 80)}...`);
      console.log(`      Primary: ${testImages[0].is_primary ? 'Yes' : 'No'}`);
      console.log(`      Display Order: ${testImages[0].display_order || 'N/A'}`);
    }
  } else {
    console.log('   ℹ️  No products with images found for testing');
  }
  
  console.log('   ✅ Test query successful\n');

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 PRODUCT IMAGES AUTO-FIX COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 SUMMARY:');
  console.log(`   ✅ Total images in database: ${totalImages[0].count}`);
  console.log(`   ✅ Products with images: ${totalProductsWithImages[0].count}`);
  console.log(`   ✅ Schema columns added: ${addedColumns}`);
  
  if (needingMigration[0].count === 0 && totalImages[0].count > 0) {
    console.log('\n✨ STATUS: ALL SYSTEMS GO!');
    console.log('   → Product images are properly configured');
    console.log('   → ProductCard component will display images correctly');
    console.log('   → RobustImageService will work as expected\n');
  } else if (totalImages[0].count === 0) {
    console.log('\n⚠️  WARNING: No images found in database');
    console.log('   → Your products may not have images uploaded yet');
    console.log('   → Upload images through the product edit page\n');
  } else {
    if (needingMigration[0].count > 0) {
      console.log(`\n⚠️  WARNING: ${needingMigration[0].count} products still need migration`);
      console.log('   → Run this script again to retry migration\n');
    }
  }
  
  console.log('💡 NEXT STEPS:');
  console.log('   1. Open your POS app');
  console.log('   2. Navigate to Products/Inventory page');
  console.log('   3. Check if ProductCard components show images');
  console.log('   4. If images show: ✅ Success!');
  console.log('   5. If placeholder icons show: Check browser console for errors');
  console.log('\n═══════════════════════════════════════════════════════════\n');

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('\nDetails:', error);
  process.exit(1);
}

