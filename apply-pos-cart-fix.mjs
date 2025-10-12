#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function applyFix() {
  let sql;
  
  try {
    log.title('🔧 Applying POS Cart Fixes');

    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    
    if (!databaseUrl) {
      log.error('DATABASE_URL not found in environment variables');
      log.info('Please set DATABASE_URL in your .env file');
      process.exit(1);
    }

    log.info('Connecting to database...');
    
    // Connect to database
    sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    log.success('Connected to database');

    // Read SQL fix file
    const sqlFilePath = join(__dirname, 'FIX-POS-CART-ISSUES.sql');
    log.info(`Reading SQL fix file: ${sqlFilePath}`);
    
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');
    
    // Execute SQL fix
    log.info('Executing SQL fixes...');
    
    try {
      await sql.unsafe(sqlContent);
      log.success('SQL fixes applied successfully!');
    } catch (error) {
      // Check if error is just notices (which are normal)
      if (error.message && error.message.includes('NOTICE')) {
        log.success('SQL fixes applied with notices');
      } else {
        throw error;
      }
    }

    // Verify the fix
    log.info('Verifying fixes...');
    
    // Check if table exists and has the required columns
    const checkResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
      AND column_name IN (
        'enable_time_based_pricing',
        'enable_dynamic_pricing',
        'enable_loyalty_pricing',
        'enable_bulk_pricing',
        'enable_customer_pricing',
        'enable_special_events'
      )
    `;
    
    log.info(`Found ${checkResult.length} required columns in dynamic pricing settings table`);
    
    checkResult.forEach(row => {
      log.success(`  ✓ ${row.column_name}`);
    });
    
    if (checkResult.length >= 6) {
      log.title('✅ All fixes applied successfully!');
      log.info('You can now test the POS page - the database errors should be resolved.');
    } else {
      log.warn('Some columns may still be missing. Please check the database manually.');
    }

  } catch (error) {
    log.error(`Fix failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
      log.info('Database connection closed');
    }
  }
}

applyFix();

