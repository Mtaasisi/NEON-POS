#!/usr/bin/env node

/**
 * Update Product Specifications from Data
 * 
 * This script updates products with specifications from a data structure.
 * 
 * Usage:
 *   node update-product-specs-from-data.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 
  'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Product specifications extracted from web search
const PRODUCT_SPECS = {
  'Macbook Pro A1708': {
    screen_size: '13.3 inches',
    resolution: '2560 x 1600 pixels',
    processor: '2.3 GHz dual-core Intel Core i5 (7360U)',
    ram: '8GB (configurable to 16GB)',
    storage: '128GB / 256GB / 512GB / 1TB PCIe SSD',
    graphics: 'Intel Iris Plus Graphics 640',
    battery: 'Up to 10 hours',
    os: 'macOS Sierra',
    weight: '3.02 pounds (1.37 kg)',
    dimensions: '11.97 x 8.36 x 0.59 inches',
    ports: 'Two Thunderbolt 3 (USB-C) ports',
    wireless: '802.11ac Wi-Fi, Bluetooth 4.2',
    camera: '720p FaceTime HD camera'
  },
  'Macbook Pro 2018 A1990': {
    screen_size: '15.4 inches',
    resolution: '2880 x 1800 pixels',
    processor: '2.2GHz / 2.6GHz 6-core Intel Core i7',
    ram: '16GB (configurable to 32GB)',
    storage: '256GB / 512GB SSD (configurable to 4TB)',
    graphics: 'Radeon Pro 555X / 560X',
    battery: 'Up to 10 hours',
    os: 'macOS Mojave',
    weight: '4.02 pounds (1.83 kg)',
    dimensions: '13.75 x 9.48 x 0.61 inches',
    ports: 'Four Thunderbolt 3 (USB-C) ports',
    wireless: '802.11ac Wi-Fi, Bluetooth 5.0',
    camera: '720p FaceTime HD camera',
    touch_bar: 'Yes',
    touch_id: 'Yes'
  },
  'Macbook Pro Air A1465': {
    screen_size: '13.3 inches',
    resolution: '1440 x 900 pixels',
    processor: 'Intel Core i5 / i7',
    ram: '4GB / 8GB',
    storage: '128GB / 256GB / 512GB SSD',
    graphics: 'Intel HD Graphics 5000',
    battery: 'Up to 12 hours',
    os: 'macOS',
    weight: '2.96 pounds (1.35 kg)',
    dimensions: '12.8 x 8.94 x 0.68 inches',
    ports: 'Two USB 3.0, Thunderbolt 2, SDXC card slot',
    wireless: '802.11ac Wi-Fi, Bluetooth 4.0',
    camera: '720p FaceTime HD camera'
  },
  'Macbook Air 2020 A2337': {
    screen_size: '13.3 inches',
    resolution: '2560 x 1600 pixels',
    processor: 'Apple M1 chip (8-core CPU)',
    ram: '8GB (configurable to 16GB)',
    storage: '256GB SSD (configurable to 2TB)',
    graphics: '7-core or 8-core GPU',
    battery: 'Up to 15 hours wireless web',
    os: 'macOS Big Sur',
    weight: '2.8 pounds (1.29 kg)',
    dimensions: '11.97 x 8.36 x 0.16-0.63 inches',
    ports: 'Two Thunderbolt / USB 4 ports',
    wireless: 'Wi-Fi 6 (802.11ax), Bluetooth 5.0',
    camera: '720p FaceTime HD camera',
    touch_id: 'Yes'
  },
  'Dell C2422HE': {
    screen_size: '23.8 inches',
    resolution: '1920 x 1080 pixels',
    panel_type: 'IPS',
    brightness: '250 cd/m²',
    contrast_ratio: '1000:1',
    response_time: '8 ms (normal), 5 ms (fast)',
    viewing_angles: '178° horizontal and vertical',
    color_gamut: '99% sRGB',
    speakers: 'Dual 5W integrated speakers',
    camera: '5 MP IR pop-up camera',
    microphone: 'Built-in',
    ports: 'HDMI, DisplayPort 1.2, USB-C (90W), USB 3.2',
    network: 'RJ-45 Ethernet port',
    weight: '9.6 lbs (4.4 kg)',
    dimensions: '21.2 x 7.3 x 15.9 inches (with stand)',
    tilt: '-5° to +21°',
    swivel: '-30° to +30°'
  },
  'Anker s6 Magnetic Battery': {
    battery_capacity: '5,000mAh',
    dimensions: '4.13 x 2.62 x 0.50 inches',
    weight: '127g',
    input: 'USB-C: 5V 2.4A',
    output: '12W Max (USB-C: 5V 2.4A, Wireless: 7.5W)',
    ports: '1 x USB-C',
    wireless_charging: 'Yes (up to 7.5W)',
    compatibility: 'iPhone 15 / 14 / 13 / 12 series with MagSafe',
    features: 'Built-in foldable kickstand, MultiProtect safety system'
  },
  'Samsung HW-B63C': {
    channels: '3.1',
    total_power: '400W',
    audio_formats: 'Dolby Digital 5.1, DTS Virtual:X',
    sound_modes: 'Bass Boost, Surround Sound, Game Mode, Adaptive Sound Lite',
    speakers: '7 speakers with center channel',
    subwoofer: 'Wireless',
    connectivity: 'Bluetooth, HDMI (1 in, 1 out with ARC), Optical, USB',
    dimensions_soundbar: '40.6" x 2.3" x 4.1"',
    dimensions_subwoofer: '7.2" x 13.6" x 11.6"',
    weight: '18.1 lbs',
    features: 'Wall mountable, Game Mode, Voice Enhancement, Night Mode'
  },
  'JBL Soundbar 2.1 Deep Bass MK2': {
    channels: '2.1',
    total_power: '300W (2 x 50W soundbar + 200W subwoofer)',
    frequency_response: '40Hz–20kHz',
    soundbar_drivers: '4 x racetrack drivers + 2 x 1" tweeters',
    subwoofer_driver: '6.5"',
    inputs: 'Optical, Bluetooth, USB, HDMI',
    outputs: 'HDMI (with ARC)',
    bluetooth: 'Version 4.2',
    dimensions_soundbar: '38" x 2.2" x 3.4"',
    dimensions_subwoofer: '8.9" x 8.9" x 14.6"',
    weight_soundbar: '2.14 kg',
    weight_subwoofer: '5.61 kg',
    supported_formats: 'MP3, WAV'
  }
};

/**
 * Find product by name (fuzzy matching)
 */
async function findProductByName(productName) {
  const { data: products, error } = await supabase
    .from('lats_products')
    .select('id, name')
    .ilike('name', `%${productName}%`)
    .limit(5);
  
  if (error) {
    console.error(`Error searching for "${productName}":`, error);
    return null;
  }
  
  // Try exact match first
  const exactMatch = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
  if (exactMatch) return exactMatch;
  
  // Return first match
  return products.length > 0 ? products[0] : null;
}

/**
 * Update product specification
 */
async function updateProductSpecification(productId, specification) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would update product ${productId}`);
    console.log(`     Specification: ${JSON.stringify(specification).substring(0, 150)}...`);
    return true;
  }
  
  const { error } = await supabase
    .from('lats_products')
    .update({ 
      specification: JSON.stringify(specification),
      updated_at: new Date().toISOString()
    })
    .eq('id', productId);
  
  if (error) {
    console.error(`Error updating product ${productId}:`, error);
    return false;
  }
  
  return true;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting product specifications update from web search data...\n');
    
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }
    
    let updated = 0;
    let notFound = 0;
    const errors = [];
    
    console.log('🔧 Processing products...\n');
    
    for (const [productName, specification] of Object.entries(PRODUCT_SPECS)) {
      try {
        const product = await findProductByName(productName);
        
        if (!product) {
          console.log(`   ⚠️  Product not found: "${productName}"`);
          notFound++;
          continue;
        }
        
        console.log(`   ✅ Found: "${product.name}" (matching "${productName}")`);
        
        const success = await updateProductSpecification(product.id, specification);
        
        if (success) {
          updated++;
          console.log(`      ✅ Specifications updated`);
        } else {
          errors.push({ product: productName, error: 'Update failed' });
        }
      } catch (error) {
        errors.push({ product: productName, error: error.message });
        console.log(`   ❌ Error processing "${productName}": ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Specifications updated: ${updated}`);
    console.log(`⚠️  Products not found: ${notFound}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`📋 Total products processed: ${Object.keys(PRODUCT_SPECS).length}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
      console.log('   Run without --dry-run to apply changes');
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.product}: ${err.error}`);
      });
    }
    
    console.log('\n✨ Process completed!\n');
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
