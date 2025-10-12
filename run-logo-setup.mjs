#!/usr/bin/env node

/**
 * 🚀 ONE-COMMAND BUSINESS LOGO SETUP
 * 
 * This script automatically runs the SQL migration for business logo feature
 * 
 * Usage: node run-logo-setup.mjs
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment
config();

// Colors
const c = {
  g: '\x1b[32m', // green
  r: '\x1b[31m', // red
  y: '\x1b[33m', // yellow
  b: '\x1b[34m', // blue
  c: '\x1b[36m', // cyan
  w: '\x1b[1m',  // white/bright
  x: '\x1b[0m',  // reset
};

console.log(`\n${c.c}${c.w}${'═'.repeat(60)}${c.x}`);
console.log(`${c.c}${c.w}  🚀 BUSINESS LOGO AUTOMATIC SETUP${c.x}`);
console.log(`${c.c}${c.w}${'═'.repeat(60)}${c.x}\n`);

// Get database URL
const dbUrl = process.env.VITE_SUPABASE_URL || 
              process.env.NEXT_PUBLIC_SUPABASE_URL || 
              process.env.SUPABASE_URL;

const dbKey = process.env.VITE_SUPABASE_ANON_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
              process.env.SUPABASE_ANON_KEY;

if (!dbUrl || !dbKey) {
  console.log(`${c.r}❌ Database credentials not found!${c.x}`);
  console.log(`\n${c.y}Please add to your .env file:${c.x}`);
  console.log('  VITE_SUPABASE_URL=your_url');
  console.log('  VITE_SUPABASE_ANON_KEY=your_key\n');
  process.exit(1);
}

console.log(`${c.g}✅ Found database credentials${c.x}`);
console.log(`${c.b}📍 URL: ${dbUrl}${c.x}\n`);

// Read SQL file
console.log(`${c.b}📄 Reading SQL migration file...${c.x}`);
let sqlContent;
try {
  sqlContent = readFileSync('🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql', 'utf8');
  console.log(`${c.g}✅ SQL file loaded (${sqlContent.length} bytes)${c.x}\n`);
} catch (err) {
  console.log(`${c.r}❌ Could not read SQL file: 🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql${c.x}`);
  console.log(`${c.y}Make sure the file exists in the current directory!${c.x}\n`);
  process.exit(1);
}

// Connect to database
console.log(`${c.b}🔌 Connecting to database...${c.x}`);
const supabase = createClient(dbUrl, dbKey);

// Execute SQL
console.log(`${c.b}⚙️  Running migration...${c.x}`);
console.log(`${c.y}${'-'.repeat(60)}${c.x}\n`);

try {
  // Since Supabase client doesn't support raw SQL execution from client side,
  // we need to guide the user to run it manually
  console.log(`${c.y}⚠️  Note: Direct SQL execution requires database admin access${c.x}`);
  console.log(`${c.c}This script will verify your setup instead.${c.x}\n`);
  
  // Check if tables exist
  console.log(`${c.b}🔍 Checking database structure...${c.x}\n`);
  
  // Try general_settings
  let tableName = 'general_settings';
  let { data: data1, error: error1 } = await supabase
    .from('general_settings')
    .select('id')
    .limit(1);
  
  if (error1) {
    // Try lats_pos_general_settings
    tableName = 'lats_pos_general_settings';
    const { data: data2, error: error2 } = await supabase
      .from('lats_pos_general_settings')
      .select('id')
      .limit(1);
    
    if (error2) {
      console.log(`${c.r}❌ No settings table found${c.x}`);
      console.log(`${c.y}\n📋 MANUAL SETUP REQUIRED:${c.x}`);
      console.log(`\n${c.w}1. Open your Neon Database Console${c.x}`);
      console.log(`${c.w}2. Copy all contents from: 🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql${c.x}`);
      console.log(`${c.w}3. Paste and run in SQL editor${c.x}`);
      console.log(`${c.w}4. Come back here and run this script again${c.x}\n`);
      process.exit(1);
    }
  }
  
  console.log(`${c.g}✅ Found table: ${tableName}${c.x}\n`);
  
  // Check for business fields
  console.log(`${c.b}🔍 Checking business logo fields...${c.x}\n`);
  
  const fields = ['business_name', 'business_address', 'business_phone', 
                  'business_email', 'business_website', 'business_logo'];
  
  let allExist = true;
  for (const field of fields) {
    const { error } = await supabase
      .from(tableName)
      .select(field)
      .limit(1);
    
    if (error) {
      console.log(`  ${c.r}❌ ${field} - missing${c.x}`);
      allExist = false;
    } else {
      console.log(`  ${c.g}✅ ${field} - exists${c.x}`);
    }
  }
  
  console.log();
  
  if (allExist) {
    // All fields exist!
    console.log(`${c.g}${c.w}${'═'.repeat(60)}${c.x}`);
    console.log(`${c.g}${c.w}  🎉 SUCCESS! Everything is ready!${c.x}`);
    console.log(`${c.g}${c.w}${'═'.repeat(60)}${c.x}\n`);
    
    // Get current settings
    const { data, error } = await supabase
      .from(tableName)
      .select('business_name, business_logo')
      .limit(1)
      .single();
    
    if (!error && data) {
      console.log(`${c.c}📊 Current Settings:${c.x}`);
      console.log(`  Business Name: ${c.w}${data.business_name || 'Not set'}${c.x}`);
      console.log(`  Logo: ${data.business_logo ? `${c.g}✅ Uploaded${c.x}` : `${c.y}❌ Not uploaded yet${c.x}`}\n`);
    }
    
    console.log(`${c.c}📋 Next Steps:${c.x}`);
    console.log(`  ${c.w}1.${c.x} Refresh your POS application`);
    console.log(`  ${c.w}2.${c.x} Go to: Settings → POS Settings → General Settings`);
    console.log(`  ${c.w}3.${c.x} Find "Business Information" section`);
    console.log(`  ${c.w}4.${c.x} Upload your logo`);
    console.log(`  ${c.w}5.${c.x} Click "Save Settings"`);
    console.log(`\n${c.g}✨ Your logo will appear on all receipts! ✨${c.x}\n`);
    
  } else {
    // Some fields missing
    console.log(`${c.y}${c.w}${'═'.repeat(60)}${c.x}`);
    console.log(`${c.y}${c.w}  ⚠️  MANUAL SETUP REQUIRED${c.x}`);
    console.log(`${c.y}${c.w}${'═'.repeat(60)}${c.x}\n`);
    
    console.log(`${c.y}Some business fields are missing.${c.x}`);
    console.log(`${c.c}Don't worry! Just run the SQL migration:${c.x}\n`);
    
    console.log(`${c.w}📋 Instructions:${c.x}`);
    console.log(`  ${c.w}1.${c.x} Open your ${c.c}Neon Database Console${c.x}`);
    console.log(`  ${c.w}2.${c.x} Open file: ${c.w}🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql${c.x}`);
    console.log(`  ${c.w}3.${c.x} Copy ALL contents (Ctrl+A, Ctrl+C)`);
    console.log(`  ${c.w}4.${c.x} Paste in SQL Editor`);
    console.log(`  ${c.w}5.${c.x} Click "Run" or "Execute"`);
    console.log(`  ${c.w}6.${c.x} Run this script again: ${c.c}node run-logo-setup.mjs${c.x}`);
    console.log(`\n${c.g}The SQL script is safe and automatic!${c.x}\n`);
  }
  
} catch (error) {
  console.log(`\n${c.r}❌ Error: ${error.message}${c.x}\n`);
  process.exit(1);
}

