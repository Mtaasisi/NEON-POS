#!/usr/bin/env node

/**
 * 🚀 AUTOMATIC BUSINESS LOGO DATABASE SETUP
 * 
 * This script automatically adds all business logo fields to your database
 * Run with: node auto-setup-business-logo.mjs
 * 
 * Features:
 * - Automatically detects your database connection
 * - Adds all missing fields
 * - Works with both table naming conventions
 * - Safe to run multiple times
 * - Provides clear feedback
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions for colored output
const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.blue}${colors.bright}🔧 ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.bright}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`),
};

// Get database credentials
function getDatabaseCredentials() {
  // Try multiple environment variable names
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.SUPABASE_URL ||
                      process.env.DATABASE_URL;
                      
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                      process.env.SUPABASE_ANON_KEY ||
                      process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log.error('Database credentials not found!');
    log.info('Please set these environment variables in your .env file:');
    console.log('  VITE_SUPABASE_URL=your_database_url');
    console.log('  VITE_SUPABASE_ANON_KEY=your_anon_key');
    console.log('\nOr use any of these alternative names:');
    console.log('  - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('  - SUPABASE_URL / SUPABASE_ANON_KEY');
    process.exit(1);
  }

  return { supabaseUrl, supabaseKey };
}

// Check if a table exists
async function tableExists(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    // If no error or error is about no rows, table exists
    return !error || error.code === 'PGRST116';
  } catch (err) {
    return false;
  }
}

// Check if a column exists
async function columnExists(supabase, tableName, columnName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1);
    
    return !error;
  } catch (err) {
    return false;
  }
}

// Add a column if it doesn't exist
async function addColumnIfNeeded(supabase, tableName, columnName, columnType, defaultValue = null) {
  const exists = await columnExists(supabase, tableName, columnName);
  
  if (exists) {
    log.info(`  ✓ ${columnName} already exists`);
    return { success: true, added: false };
  }

  try {
    // Use RPC to add column (requires admin access)
    const defaultClause = defaultValue ? `DEFAULT ${defaultValue}` : '';
    const sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType} ${defaultClause}`;
    
    log.info(`  Adding ${columnName}...`);
    
    // Try to execute via RPC if available
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      log.warning(`  Could not add ${columnName} via RPC (this is normal)`);
      log.info(`  You'll need to run the SQL migration manually`);
      return { success: false, added: false };
    }

    log.success(`  ✅ Added ${columnName}`);
    return { success: true, added: true };
  } catch (err) {
    log.warning(`  Could not add ${columnName}: ${err.message}`);
    return { success: false, added: false };
  }
}

// Main setup function
async function setupBusinessLogo() {
  log.title('🚀 AUTOMATIC BUSINESS LOGO SETUP');

  // Step 1: Get credentials
  log.step('Step 1: Getting database credentials...');
  const { supabaseUrl, supabaseKey } = getDatabaseCredentials();
  log.success('Database credentials found');
  log.info(`  URL: ${supabaseUrl}`);

  // Step 2: Connect to database
  log.step('Step 2: Connecting to database...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  log.success('Connected to database');

  // Step 3: Detect table structure
  log.step('Step 3: Detecting table structure...');
  
  const hasGeneralSettings = await tableExists(supabase, 'general_settings');
  const hasLatsGeneralSettings = await tableExists(supabase, 'lats_pos_general_settings');
  
  let targetTable = null;
  
  if (hasGeneralSettings) {
    targetTable = 'general_settings';
    log.success(`Found table: ${targetTable}`);
  } else if (hasLatsGeneralSettings) {
    targetTable = 'lats_pos_general_settings';
    log.success(`Found table: ${targetTable}`);
  } else {
    log.error('No settings table found!');
    log.warning('You need to create the settings table first.');
    log.info('Run the SQL script: 🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql');
    process.exit(1);
  }

  // Step 4: Check current fields
  log.step('Step 4: Checking existing fields...');
  
  const requiredFields = [
    { name: 'business_name', type: 'TEXT', default: "'My Store'" },
    { name: 'business_address', type: 'TEXT', default: "''" },
    { name: 'business_phone', type: 'TEXT', default: "''" },
    { name: 'business_email', type: 'TEXT', default: "''" },
    { name: 'business_website', type: 'TEXT', default: "''" },
    { name: 'business_logo', type: 'TEXT', default: null },
  ];

  let allFieldsExist = true;
  let needsManualFix = false;

  for (const field of requiredFields) {
    const exists = await columnExists(supabase, targetTable, field.name);
    if (exists) {
      log.info(`  ✓ ${field.name} exists`);
    } else {
      log.warning(`  ✗ ${field.name} missing`);
      allFieldsExist = false;
    }
  }

  if (allFieldsExist) {
    log.success('All business fields already exist! ✨');
    log.info('You can now upload your logo in Settings → POS Settings → General Settings');
    
    // Show verification
    log.step('Step 5: Verification');
    const { data, error } = await supabase
      .from(targetTable)
      .select('business_name, business_logo')
      .limit(1)
      .single();
    
    if (!error && data) {
      log.success('Current settings:');
      console.log(`  Business Name: ${data.business_name || 'Not set'}`);
      console.log(`  Logo: ${data.business_logo ? '✅ Uploaded' : '❌ Not uploaded'}`);
    }
    
    return;
  }

  // Step 5: Try to add missing fields
  log.step('Step 5: Adding missing fields...');
  log.warning('Note: This requires database admin access');
  log.info('If this fails, you\'ll need to run the SQL migration manually');
  
  for (const field of requiredFields) {
    const exists = await columnExists(supabase, targetTable, field.name);
    if (!exists) {
      const result = await addColumnIfNeeded(
        supabase, 
        targetTable, 
        field.name, 
        field.type, 
        field.default
      );
      
      if (!result.success) {
        needsManualFix = true;
      }
    }
  }

  // Step 6: Final verification
  log.step('Step 6: Final verification...');
  
  let finalCheck = true;
  for (const field of requiredFields) {
    const exists = await columnExists(supabase, targetTable, field.name);
    if (!exists) {
      log.error(`  ${field.name} still missing`);
      finalCheck = false;
    }
  }

  if (finalCheck) {
    log.title('🎉 SUCCESS! All business fields are ready!');
    log.success('You can now upload your logo!');
    log.info('Next steps:');
    console.log('  1. Refresh your POS application');
    console.log('  2. Go to: Settings → POS Settings → General Settings');
    console.log('  3. Look for "Business Information" section');
    console.log('  4. Upload your logo and fill in details');
    console.log('  5. Click "Save Settings"');
    console.log('\n✨ Your logo will appear on all receipts and invoices!');
  } else if (needsManualFix) {
    log.title('⚠️  MANUAL SETUP REQUIRED');
    log.warning('Some fields could not be added automatically');
    log.info('Please run this SQL script in your database console:');
    console.log(`\n  ${colors.bright}🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql${colors.reset}\n`);
    log.info('Instructions:');
    console.log('  1. Open your Neon Database Console');
    console.log('  2. Copy the contents of: 🚀-AUTO-FIX-BUSINESS-LOGO-COMPLETE.sql');
    console.log('  3. Paste and run in SQL editor');
    console.log('  4. You\'ll see success messages with ✅ checkmarks');
    console.log('\nThis is normal - database permissions require admin access!');
  }
}

// Run the setup
setupBusinessLogo().catch((error) => {
  log.error('Setup failed:');
  console.error(error);
  process.exit(1);
});

