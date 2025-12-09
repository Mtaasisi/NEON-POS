#!/usr/bin/env node

/**
 * Add Specifications and Categories to Products
 * 
 * This script:
 * 1. Assigns categories to products missing categories based on product name patterns
 * 2. Adds product specifications in JSON format based on product type
 * 3. Uses a knowledge base of common product specifications
 * 
 * Usage:
 *   node add-specifications-and-categories.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 
  'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 
  'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const USE_DIRECT_POSTGRES = !!(DATABASE_URL && (DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('postgresql://')));

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');

let supabase;
let pool;

// Initialize database connection
if (USE_SUPABASE) {
  console.log('🔗 Using Supabase REST API');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (USE_DIRECT_POSTGRES) {
  console.log('🔗 Using direct PostgreSQL connection');
  pool = new Pool({ connectionString: DATABASE_URL });
} else {
  console.error('❌ No database connection configured');
  process.exit(1);
}

/**
 * Category mapping based on product name patterns
 */
const CATEGORY_MAPPING = {
  // Phones
  'iPhone': 'Smartphones',
  'Samsung': 'Smartphones',
  'Google Pixel': 'Smartphones',
  'Xiaomi': 'Smartphones',
  'Huawei': 'Smartphones',
  'OnePlus': 'Smartphones',
  'Oppo': 'Smartphones',
  'Vivo': 'Smartphones',
  'Realme': 'Smartphones',
  'Motorola': 'Smartphones',
  'Nokia': 'Smartphones',
  
  // Tablets
  'iPad': 'Tablets',
  'Samsung Galaxy Tab': 'Tablets',
  'Surface': 'Tablets',
  
  // Laptops
  'MacBook': 'Laptop',
  'Dell': 'Laptop',
  'HP': 'Laptop',
  'Lenovo': 'Laptop',
  'Asus': 'Laptop',
  'Acer': 'Laptop',
  'MSI': 'Laptop',
  'Razer': 'Laptop',
  
  // Monitors
  'Monitor': 'Monitors',
  'Dell U': 'Monitors',
  'Dell C': 'Monitors',
  'Portable Monitor': 'Monitors',
  
  // Accessories (keyboards, mice, etc.)
  'Dell Wired Keyboard': 'Accessories',
  'Keyboard': 'Accessories',
  'Mouse': 'Accessories',
  
  // Accessories
  'Air Pods': 'Accessories',
  'AirPods': 'Accessories',
  'Adapter': 'Accessories',
  'Screen Protector': 'Accessories',
  'Case': 'Accessories',
  'Charger': 'Accessories',
  'Cable': 'Accessories',
  'Extension': 'Accessories',
  'Battery': 'Accessories',
  'Microphone': 'Accessories',
  'Speaker': 'Accessories',
  'Headphones': 'Accessories',
  'Earbuds': 'Accessories',
  'Pence': 'Accessories',
  'Pencil': 'Accessories',
  'Dock': 'Accessories',
  'Station': 'Accessories',
  'Controller': 'Accessories',
  'Portable Monitor': 'Monitors',
  'CPU': 'Computers',
  'Mini CPU': 'Computers',
};

/**
 * Specification knowledge base
 */
const SPECIFICATIONS_KB = {
  // iPhone specifications
  'iPhone 16': {
    screen_size: '6.1 inches',
    resolution: '2556 x 1179 pixels',
    processor: 'A18 Pro',
    ram: '8GB',
    storage: '128GB / 256GB / 512GB / 1TB',
    camera: '48MP Main, 12MP Ultra Wide',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 20 hours video playback',
    os: 'iOS 18',
    weight: '174g',
    dimensions: '147.6 x 71.6 x 7.8 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 16 Pro': {
    screen_size: '6.3 inches',
    resolution: '2796 x 1290 pixels',
    processor: 'A18 Pro',
    ram: '8GB',
    storage: '256GB / 512GB / 1TB',
    camera: '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 23 hours video playback',
    os: 'iOS 18',
    weight: '187g',
    dimensions: '149.6 x 71.6 x 8.25 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 16 Pro Max': {
    screen_size: '6.9 inches',
    resolution: '2992 x 1290 pixels',
    processor: 'A18 Pro',
    ram: '8GB',
    storage: '256GB / 512GB / 1TB',
    camera: '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 29 hours video playback',
    os: 'iOS 18',
    weight: '221g',
    dimensions: '163.0 x 77.6 x 8.25 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 15': {
    screen_size: '6.1 inches',
    resolution: '2556 x 1179 pixels',
    processor: 'A16 Bionic',
    ram: '6GB',
    storage: '128GB / 256GB / 512GB',
    camera: '48MP Main, 12MP Ultra Wide',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 20 hours video playback',
    os: 'iOS 17',
    weight: '171g',
    dimensions: '147.6 x 71.6 x 7.8 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 15 Pro': {
    screen_size: '6.1 inches',
    resolution: '2556 x 1179 pixels',
    processor: 'A17 Pro',
    ram: '8GB',
    storage: '128GB / 256GB / 512GB / 1TB',
    camera: '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 23 hours video playback',
    os: 'iOS 17',
    weight: '187g',
    dimensions: '146.6 x 70.6 x 8.25 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 15 Pro Max': {
    screen_size: '6.7 inches',
    resolution: '2796 x 1290 pixels',
    processor: 'A17 Pro',
    ram: '8GB',
    storage: '256GB / 512GB / 1TB',
    camera: '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 29 hours video playback',
    os: 'iOS 17',
    weight: '221g',
    dimensions: '159.9 x 76.7 x 8.25 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 14': {
    screen_size: '6.1 inches',
    resolution: '2532 x 1170 pixels',
    processor: 'A15 Bionic',
    ram: '6GB',
    storage: '128GB / 256GB / 512GB',
    camera: '12MP Main, 12MP Ultra Wide',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 20 hours video playback',
    os: 'iOS 16',
    weight: '172g',
    dimensions: '146.7 x 71.5 x 7.8 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 14 Pro': {
    screen_size: '6.1 inches',
    resolution: '2556 x 1179 pixels',
    processor: 'A16 Bionic',
    ram: '6GB',
    storage: '128GB / 256GB / 512GB / 1TB',
    camera: '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 23 hours video playback',
    os: 'iOS 16',
    weight: '206g',
    dimensions: '147.5 x 71.5 x 7.85 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 14 Pro Max': {
    screen_size: '6.7 inches',
    resolution: '2796 x 1290 pixels',
    processor: 'A16 Bionic',
    ram: '6GB',
    storage: '128GB / 256GB / 512GB / 1TB',
    camera: '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 29 hours video playback',
    os: 'iOS 16',
    weight: '240g',
    dimensions: '160.7 x 77.6 x 7.85 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 13': {
    screen_size: '6.1 inches',
    resolution: '2532 x 1170 pixels',
    processor: 'A15 Bionic',
    ram: '4GB',
    storage: '128GB / 256GB / 512GB',
    camera: '12MP Main, 12MP Ultra Wide',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 19 hours video playback',
    os: 'iOS 15',
    weight: '174g',
    dimensions: '146.7 x 71.5 x 7.65 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 13 Pro': {
    screen_size: '6.1 inches',
    resolution: '2532 x 1170 pixels',
    processor: 'A15 Bionic',
    ram: '6GB',
    storage: '128GB / 256GB / 512GB / 1TB',
    camera: '12MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 22 hours video playback',
    os: 'iOS 15',
    weight: '203g',
    dimensions: '146.7 x 71.5 x 7.65 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 13 Pro Max': {
    screen_size: '6.7 inches',
    resolution: '2778 x 1284 pixels',
    processor: 'A15 Bionic',
    ram: '6GB',
    storage: '128GB / 256GB / 512GB / 1TB',
    camera: '12MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 28 hours video playback',
    os: 'iOS 15',
    weight: '240g',
    dimensions: '160.8 x 78.1 x 7.65 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 12': {
    screen_size: '6.1 inches',
    resolution: '2532 x 1170 pixels',
    processor: 'A14 Bionic',
    ram: '4GB',
    storage: '64GB / 128GB / 256GB',
    camera: '12MP Main, 12MP Ultra Wide',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 17 hours video playback',
    os: 'iOS 14',
    weight: '164g',
    dimensions: '146.7 x 71.5 x 7.4 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 12 Pro': {
    screen_size: '6.1 inches',
    resolution: '2532 x 1170 pixels',
    processor: 'A14 Bionic',
    ram: '6GB',
    storage: '128GB / 256GB / 512GB',
    camera: '12MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 17 hours video playback',
    os: 'iOS 14',
    weight: '189g',
    dimensions: '146.7 x 71.5 x 7.4 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 12 Pro Max': {
    screen_size: '6.7 inches',
    resolution: '2778 x 1284 pixels',
    processor: 'A14 Bionic',
    ram: '6GB',
    storage: '128GB / 256GB / 512GB',
    camera: '12MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 20 hours video playback',
    os: 'iOS 14',
    weight: '228g',
    dimensions: '160.8 x 78.1 x 7.4 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'Yes'
  },
  'iPhone 11': {
    screen_size: '6.1 inches',
    resolution: '1792 x 828 pixels',
    processor: 'A13 Bionic',
    ram: '4GB',
    storage: '64GB / 128GB / 256GB',
    camera: '12MP Main, 12MP Ultra Wide',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 17 hours video playback',
    os: 'iOS 13',
    weight: '194g',
    dimensions: '150.9 x 75.7 x 8.3 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'No'
  },
  'iPhone 11 Pro': {
    screen_size: '5.8 inches',
    resolution: '2436 x 1125 pixels',
    processor: 'A13 Bionic',
    ram: '4GB',
    storage: '64GB / 256GB / 512GB',
    camera: '12MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 18 hours video playback',
    os: 'iOS 13',
    weight: '188g',
    dimensions: '144.0 x 71.4 x 8.1 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'No'
  },
  'iPhone 11 Pro Max': {
    screen_size: '6.5 inches',
    resolution: '2688 x 1242 pixels',
    processor: 'A13 Bionic',
    ram: '4GB',
    storage: '64GB / 256GB / 512GB',
    camera: '12MP Main, 12MP Ultra Wide, 12MP Telephoto',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 20 hours video playback',
    os: 'iOS 13',
    weight: '226g',
    dimensions: '158.0 x 77.8 x 8.1 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'No'
  },
  'iPhone X': {
    screen_size: '5.8 inches',
    resolution: '2436 x 1125 pixels',
    processor: 'A11 Bionic',
    ram: '3GB',
    storage: '64GB / 256GB',
    camera: '12MP Main, 12MP Telephoto',
    front_camera: '7MP TrueDepth',
    battery: 'Up to 13 hours video playback',
    os: 'iOS 11',
    weight: '174g',
    dimensions: '143.6 x 70.9 x 7.7 mm',
    water_resistant: 'IP67',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'No'
  },
  'iPhone XS': {
    screen_size: '5.8 inches',
    resolution: '2436 x 1125 pixels',
    processor: 'A12 Bionic',
    ram: '4GB',
    storage: '64GB / 256GB / 512GB',
    camera: '12MP Main, 12MP Telephoto',
    front_camera: '7MP TrueDepth',
    battery: 'Up to 13 hours video playback',
    os: 'iOS 12',
    weight: '177g',
    dimensions: '143.6 x 70.9 x 7.7 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'No'
  },
  'iPhone XS Max': {
    screen_size: '6.5 inches',
    resolution: '2688 x 1242 pixels',
    processor: 'A12 Bionic',
    ram: '4GB',
    storage: '64GB / 256GB / 512GB',
    camera: '12MP Main, 12MP Telephoto',
    front_camera: '7MP TrueDepth',
    battery: 'Up to 15 hours video playback',
    os: 'iOS 12',
    weight: '208g',
    dimensions: '157.5 x 77.4 x 7.7 mm',
    water_resistant: 'IP68',
    wireless_charging: 'Yes',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'Yes',
    '5g_support': 'No'
  },
  
  // iPad specifications
  'iPad 12': {
    screen_size: '10.9 inches',
    resolution: '2360 x 1640 pixels',
    processor: 'A14 Bionic',
    ram: '4GB',
    storage: '64GB / 256GB',
    camera: '12MP Rear, 12MP Front',
    battery: 'Up to 10 hours',
    os: 'iPadOS 18',
    weight: '462g',
    dimensions: '247.6 x 178.5 x 7.0 mm',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil (USB-C)',
    keyboard_support: 'Yes',
    wireless_charging: 'No',
    fast_charging: 'Yes',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'Optional'
  },
  'iPad 11': {
    screen_size: '10.9 inches',
    resolution: '2360 x 1640 pixels',
    processor: 'A13 Bionic',
    ram: '4GB',
    storage: '64GB / 256GB',
    camera: '12MP Rear, 12MP Front',
    battery: 'Up to 10 hours',
    os: 'iPadOS 17',
    weight: '462g',
    dimensions: '247.6 x 178.5 x 7.0 mm',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil (USB-C)',
    keyboard_support: 'Yes',
    wireless_charging: 'No',
    fast_charging: 'Yes',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'Optional'
  },
  'iPad 10': {
    screen_size: '10.9 inches',
    resolution: '2360 x 1640 pixels',
    processor: 'A14 Bionic',
    ram: '4GB',
    storage: '64GB / 256GB',
    camera: '12MP Rear, 12MP Front',
    battery: 'Up to 10 hours',
    os: 'iPadOS 16',
    weight: '477g',
    dimensions: '248.6 x 179.5 x 7.0 mm',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil (1st gen)',
    keyboard_support: 'Yes',
    wireless_charging: 'No',
    fast_charging: 'Yes',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'Optional'
  },
  'iPad 9': {
    screen_size: '10.2 inches',
    resolution: '2160 x 1620 pixels',
    processor: 'A13 Bionic',
    ram: '3GB',
    storage: '64GB / 256GB',
    camera: '8MP Rear, 12MP Front',
    battery: 'Up to 10 hours',
    os: 'iPadOS 15',
    weight: '487g',
    dimensions: '250.6 x 174.1 x 7.5 mm',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil (1st gen)',
    keyboard_support: 'Yes',
    wireless_charging: 'No',
    fast_charging: 'No',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'No'
  },
  'iPad 8': {
    screen_size: '10.2 inches',
    resolution: '2160 x 1620 pixels',
    processor: 'A12 Bionic',
    ram: '3GB',
    storage: '32GB / 128GB',
    camera: '8MP Rear, 1.2MP Front',
    battery: 'Up to 10 hours',
    os: 'iPadOS 14',
    weight: '490g',
    dimensions: '250.6 x 174.1 x 7.5 mm',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil (1st gen)',
    keyboard_support: 'Yes',
    wireless_charging: 'No',
    fast_charging: 'No',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'No'
  },
  'iPad 7': {
    screen_size: '10.2 inches',
    resolution: '2160 x 1620 pixels',
    processor: 'A10 Fusion',
    ram: '3GB',
    storage: '32GB / 128GB',
    camera: '8MP Rear, 1.2MP Front',
    battery: 'Up to 10 hours',
    os: 'iPadOS 13',
    weight: '483g',
    dimensions: '250.6 x 174.1 x 7.5 mm',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil (1st gen)',
    keyboard_support: 'Yes',
    wireless_charging: 'No',
    fast_charging: 'No',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'No'
  },
  'iPad 6': {
    screen_size: '9.7 inches',
    resolution: '2048 x 1536 pixels',
    processor: 'A10 Fusion',
    ram: '2GB',
    storage: '32GB / 128GB',
    camera: '8MP Rear, 1.2MP Front',
    battery: 'Up to 10 hours',
    os: 'iOS 12',
    weight: '469g',
    dimensions: '240 x 169.5 x 7.5 mm',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil (1st gen)',
    keyboard_support: 'Yes',
    wireless_charging: 'No',
    fast_charging: 'No',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'No'
  },
  'iPad 5': {
    screen_size: '9.7 inches',
    resolution: '2048 x 1536 pixels',
    processor: 'A9',
    ram: '2GB',
    storage: '32GB / 128GB',
    camera: '8MP Rear, 1.2MP Front',
    battery: 'Up to 10 hours',
    os: 'iOS 10',
    weight: '469g',
    dimensions: '240 x 169.5 x 7.5 mm',
    touchscreen: 'Yes',
    stylus_support: 'No',
    keyboard_support: 'Yes',
    wireless_charging: 'No',
    fast_charging: 'No',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'No'
  },
  
  // iPad Pro specifications (will be matched by pattern)
  'iPad Pro': {
    screen_size: '11 inches / 12.9 inches',
    resolution: '2388 x 1668 pixels / 2732 x 2048 pixels',
    processor: 'M4',
    ram: '8GB / 16GB',
    storage: '256GB / 512GB / 1TB / 2TB',
    camera: '12MP Wide, 10MP Ultra Wide, LiDAR Scanner',
    front_camera: '12MP TrueDepth',
    battery: 'Up to 10 hours',
    os: 'iPadOS 18',
    weight: '466g / 579g',
    dimensions: 'Varies by size',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil Pro',
    keyboard_support: 'Magic Keyboard',
    wireless_charging: 'No',
    fast_charging: 'Yes',
    face_id: 'Yes',
    nfc: 'No',
    '5g_support': 'Optional'
  },
  
  // iPad Air specifications
  'iPad Air': {
    screen_size: '10.9 inches',
    resolution: '2360 x 1640 pixels',
    processor: 'M2',
    ram: '8GB',
    storage: '128GB / 256GB / 512GB / 1TB',
    camera: '12MP Wide',
    front_camera: '12MP Ultra Wide',
    battery: 'Up to 10 hours',
    os: 'iPadOS 18',
    weight: '462g',
    dimensions: '247.6 x 178.5 x 6.1 mm',
    touchscreen: 'Yes',
    stylus_support: 'Apple Pencil (USB-C)',
    keyboard_support: 'Magic Keyboard',
    wireless_charging: 'No',
    fast_charging: 'Yes',
    face_id: 'No',
    nfc: 'No',
    '5g_support': 'Optional'
  }
};

/**
 * Get category ID by name
 */
async function getCategoryIdByName(categoryName) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('lats_categories')
      .select('id, name')
      .ilike('name', categoryName)
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return data.id;
  } else {
    const result = await pool.query(
      "SELECT id FROM lats_categories WHERE LOWER(name) = LOWER($1) LIMIT 1",
      [categoryName]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  }
}

/**
 * Determine category for a product based on name
 */
function determineCategory(productName) {
  const name = productName.toLowerCase();
  
  for (const [pattern, category] of Object.entries(CATEGORY_MAPPING)) {
    if (name.includes(pattern.toLowerCase())) {
      return category;
    }
  }
  
  return null;
}

/**
 * Get specifications for a product
 */
function getSpecifications(productName) {
  // Try exact match first
  if (SPECIFICATIONS_KB[productName]) {
    return SPECIFICATIONS_KB[productName];
  }
  
  // Try pattern matching
  for (const [key, specs] of Object.entries(SPECIFICATIONS_KB)) {
    if (productName.includes(key)) {
      return specs;
    }
  }
  
  // Return null if no match
  return null;
}

/**
 * Fetch all products
 */
async function fetchProducts() {
  console.log('📦 Fetching products from database...');
  
  if (USE_SUPABASE) {
    const { data: products, error } = await supabase
      .from('lats_products')
      .select('id, name, category_id, specification')
      .order('name');
    
    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
    
    return products || [];
  } else {
    const query = `
      SELECT id, name, category_id, specification
      FROM lats_products
      ORDER BY name
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

/**
 * Update product category and specification
 */
async function updateProduct(productId, categoryId, specification) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would update product ${productId}`);
    if (categoryId) console.log(`     Category: ${categoryId}`);
    if (specification) console.log(`     Specification: ${JSON.stringify(specification).substring(0, 100)}...`);
    return true;
  }
  
  const updateData = {
    updated_at: new Date().toISOString()
  };
  
  if (categoryId) {
    updateData.category_id = categoryId;
  }
  
  if (specification) {
    updateData.specification = JSON.stringify(specification);
  }
  
  if (USE_SUPABASE) {
    const { error } = await supabase
      .from('lats_products')
      .update(updateData)
      .eq('id', productId);
    
    return !error;
  } else {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    if (categoryId) {
      setClauses.push(`category_id = $${paramIndex++}`);
      values.push(categoryId);
    }
    
    if (specification) {
      setClauses.push(`specification = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(specification));
    }
    
    setClauses.push(`updated_at = NOW()`);
    
    values.push(productId);
    
    const query = `
      UPDATE lats_products 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
    `;
    
    const result = await pool.query(query, values);
    return result.rowCount > 0;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting product specifications and categories update...\n');
    
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }
    
    // Fetch products
    const products = await fetchProducts();
    console.log(`✅ Fetched ${products.length} products\n`);
    
    // Build category name to ID map
    console.log('📋 Building category map...');
    const categoryMap = new Map();
    const categoryNames = [...new Set(Object.values(CATEGORY_MAPPING))];
    
    for (const categoryName of categoryNames) {
      const categoryId = await getCategoryIdByName(categoryName);
      if (categoryId) {
        categoryMap.set(categoryName, categoryId);
        console.log(`   ✅ Found category: ${categoryName} (${categoryId})`);
      } else {
        console.log(`   ⚠️  Category not found: ${categoryName}`);
      }
    }
    console.log('');
    
    // Process products
    let updatedCategory = 0;
    let updatedSpec = 0;
    let skipped = 0;
    const errors = [];
    
    console.log('🔧 Processing products...\n');
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let needsCategory = !product.category_id;
      let needsSpec = !product.specification;
      
      let categoryId = product.category_id;
      let specification = null;
      
      // Determine category if missing
      if (needsCategory) {
        const categoryName = determineCategory(product.name);
        if (categoryName && categoryMap.has(categoryName)) {
          categoryId = categoryMap.get(categoryName);
        }
      }
      
      // Get specifications if missing
      if (needsSpec) {
        specification = getSpecifications(product.name);
      }
      
      // Update if needed
      if (categoryId !== product.category_id || specification) {
        try {
          const success = await updateProduct(product.id, categoryId, specification);
          
          if (success) {
            if (categoryId !== product.category_id) {
              updatedCategory++;
            }
            if (specification) {
              updatedSpec++;
            }
            
            if ((i + 1) % 50 === 0) {
              console.log(`   ✅ Processed ${i + 1}/${products.length} products...`);
            }
          } else {
            skipped++;
            errors.push({ product: product.name, error: 'Update failed' });
          }
        } catch (error) {
          skipped++;
          errors.push({ product: product.name, error: error.message });
          console.log(`   ❌ Error updating "${product.name}": ${error.message}`);
        }
      } else {
        skipped++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Categories updated: ${updatedCategory}`);
    console.log(`✅ Specifications added: ${updatedSpec}`);
    console.log(`⏭️  Products skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`📋 Total products processed: ${products.length}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
      console.log('   Run without --dry-run to apply changes');
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.product}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }
    
    console.log('\n✨ Process completed!\n');
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the script
main();
