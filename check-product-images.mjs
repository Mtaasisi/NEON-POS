#!/usr/bin/env node

/**
 * Check Product Images in Database
 * Verifies that product images are stored correctly and can be retrieved
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

async function checkProductImages() {
  console.log('\n🔍 Checking Product Images in Database...\n');

  try {
    // 1. Check if product_images table exists and get sample data
    console.log('📋 Checking product_images table...');
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('id, product_id, image_url, thumbnail_url, file_name, is_primary, created_at')
      .limit(10)
      .order('created_at', { ascending: false });

    if (imagesError) {
      console.error('❌ Error querying product_images:', imagesError);
      return;
    }

    console.log(`✅ Found ${images?.length || 0} product images in database\n`);

    if (images && images.length > 0) {
      console.log('📸 Sample Product Images:');
      images.forEach((img, index) => {
        console.log(`\n  ${index + 1}. Image ID: ${img.id}`);
        console.log(`     Product ID: ${img.product_id}`);
        console.log(`     Image URL: ${img.image_url?.substring(0, 80)}${img.image_url?.length > 80 ? '...' : ''}`);
        console.log(`     Thumbnail URL: ${img.thumbnail_url?.substring(0, 80) || 'NULL'}${img.thumbnail_url && img.thumbnail_url.length > 80 ? '...' : ''}`);
        console.log(`     File Name: ${img.file_name}`);
        console.log(`     Is Primary: ${img.is_primary}`);
        console.log(`     Created: ${img.created_at}`);
      });
    } else {
      console.log('⚠️  No product images found in database');
    }

    // 2. Check products with images
    console.log('\n\n📦 Checking products with images...');
    const { data: productsWithImages, error: productsError } = await supabase
      .from('product_images')
      .select('product_id')
      .limit(100);

    if (productsError) {
      console.error('❌ Error querying products with images:', productsError);
    } else {
      const uniqueProductIds = [...new Set(productsWithImages?.map(p => p.product_id) || [])];
      console.log(`✅ Found ${uniqueProductIds.length} products with images`);
    }

    // 3. Check a specific product's images
    if (images && images.length > 0) {
      const sampleProductId = images[0].product_id;
      console.log(`\n\n🔍 Checking all images for product: ${sampleProductId}`);
      
      const { data: productImages, error: productImagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', sampleProductId)
        .order('is_primary', { ascending: false });

      if (productImagesError) {
        console.error('❌ Error querying product images:', productImagesError);
      } else {
        console.log(`✅ Found ${productImages?.length || 0} images for this product:`);
        productImages?.forEach((img, index) => {
          console.log(`\n  Image ${index + 1}:`);
          console.log(`    URL: ${img.image_url}`);
          console.log(`    Thumbnail: ${img.thumbnail_url || 'NULL'}`);
          console.log(`    Primary: ${img.is_primary}`);
        });
      }

      // 4. Check if product exists in lats_products
      const { data: product, error: productError } = await supabase
        .from('lats_products')
        .select('id, name, image_url, thumbnail_url')
        .eq('id', sampleProductId)
        .single();

      if (productError) {
        console.error('❌ Error querying product:', productError);
      } else if (product) {
        console.log(`\n\n📦 Product Details:`);
        console.log(`   Name: ${product.name}`);
        console.log(`   Image URL (from lats_products): ${product.image_url || 'NULL'}`);
        console.log(`   Thumbnail URL (from lats_products): ${product.thumbnail_url || 'NULL'}`);
      }
    }

    // 5. Check URL format issues
    console.log('\n\n🔍 Checking URL formats...');
    const { data: allImages, error: allImagesError } = await supabase
      .from('product_images')
      .select('image_url, thumbnail_url')
      .limit(50);

    if (!allImagesError && allImages) {
      const urlFormats = {
        relative: 0,
        absolute: 0,
        data: 0,
        blob: 0,
        null: 0,
        other: 0
      };

      allImages.forEach(img => {
        const url = img.image_url;
        if (!url) {
          urlFormats.null++;
        } else if (url.startsWith('/')) {
          urlFormats.relative++;
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
          urlFormats.absolute++;
        } else if (url.startsWith('data:')) {
          urlFormats.data++;
        } else if (url.startsWith('blob:')) {
          urlFormats.blob++;
        } else {
          urlFormats.other++;
        }
      });

      console.log('   URL Format Distribution:');
      console.log(`   - Relative paths (/images/...): ${urlFormats.relative}`);
      console.log(`   - Absolute URLs (http/https): ${urlFormats.absolute}`);
      console.log(`   - Data URLs (base64): ${urlFormats.data}`);
      console.log(`   - Blob URLs: ${urlFormats.blob}`);
      console.log(`   - NULL: ${urlFormats.null}`);
      console.log(`   - Other: ${urlFormats.other}`);
    }

    console.log('\n✅ Database check completed!\n');

  } catch (error) {
    console.error('❌ Error checking product images:', error);
    process.exit(1);
  }
}

checkProductImages();
