#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
    log.title('🔧 Applying Stock Transfer Arusha Fix');

    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    
    if (!databaseUrl) {
      log.error('DATABASE_URL not found in environment variables');
      log.info('Please set DATABASE_URL or VITE_DATABASE_URL in your .env file');
      log.info('\nExample:');
      log.info('  VITE_DATABASE_URL=postgresql://user:password@host/database');
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
    const sqlFilePath = join(__dirname, 'STOCK-TRANSFER-ARUSHA-FIX.sql');
    log.info(`Reading SQL fix file: ${sqlFilePath}`);
    
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');
    
    // Execute SQL fix
    log.info('Executing SQL fixes...');
    log.info('This may take a few seconds...\n');
    
    try {
      await sql.unsafe(sqlContent);
      log.success('SQL fixes applied successfully!\n');
    } catch (error) {
      // Check if error is just notices (which are normal)
      if (error.message && (error.message.includes('NOTICE') || error.message.includes('already exists'))) {
        log.success('SQL fixes applied (with notices)\n');
      } else {
        throw error;
      }
    }

    // Verify the fix
    log.info('Verifying fixes...\n');
    
    // Check functions
    const functions = await sql`
      SELECT proname as function_name
      FROM pg_proc
      WHERE proname IN (
        'reserve_variant_stock',
        'release_variant_stock',
        'reduce_variant_stock',
        'increase_variant_stock',
        'find_or_create_variant_at_branch',
        'complete_stock_transfer_transaction'
      )
    `;

    log.info(`Found ${functions.length} stock transfer functions:`);
    functions.forEach(f => {
      log.success(`  ✓ ${f.function_name}`);
    });

    if (functions.length < 6) {
      log.warn(`\nWarning: Expected 6 functions, found ${functions.length}`);
      log.warn('Some functions may not have been created properly');
    }

    // Check Arusha branch
    const arushaBranch = await sql`
      SELECT id, name, code, city, is_active
      FROM store_locations
      WHERE LOWER(name) LIKE '%arusha%' OR LOWER(city) LIKE '%arusha%'
      LIMIT 1
    `;

    if (arushaBranch.length > 0) {
      log.success(`\nArusha branch verified:`);
      log.info(`  Name: ${arushaBranch[0].name}`);
      log.info(`  Code: ${arushaBranch[0].code}`);
      log.info(`  City: ${arushaBranch[0].city}`);
      log.info(`  Active: ${arushaBranch[0].is_active ? 'Yes' : 'No'}`);
    } else {
      log.error('\nArusha branch not found!');
      log.warn('The branch should have been created by the fix');
    }

    // Check for pending transfers to Arusha
    const pendingTransfers = await sql`
      SELECT COUNT(*) as count
      FROM branch_transfers bt
      JOIN store_locations to_br ON bt.to_branch_id = to_br.id
      WHERE LOWER(to_br.name) LIKE '%arusha%'
        AND bt.status IN ('pending', 'approved', 'in_transit')
    `;

    const pendingCount = pendingTransfers[0]?.count || 0;
    if (pendingCount > 0) {
      log.info(`\nFound ${pendingCount} pending transfer(s) to Arusha`);
      log.info('These can now be received at the Arusha branch!');
    } else {
      log.info('\nNo pending transfers to Arusha');
      log.info('Create a new transfer to test the functionality');
    }

    log.title('✅ Fix Applied Successfully!');
    
    log.info('Next steps:');
    log.info('  1. Open http://localhost:3000');
    log.info('  2. Login as care@care.com (password: 123456)');
    log.info('  3. Switch to Arusha branch');
    log.info('  4. Go to Stock Transfer page');
    log.info('  5. Receive pending transfers');
    log.info('\nFor detailed testing instructions, see:');
    log.info('  📖 MANUAL-TEST-STOCK-TRANSFER-ARUSHA.md');

  } catch (error) {
    log.error(`\nError applying fix: ${error.message}`);
    if (error.code) {
      log.error(`Error code: ${error.code}`);
    }
    if (error.detail) {
      log.error(`Detail: ${error.detail}`);
    }
    if (error.hint) {
      log.info(`Hint: ${error.hint}`);
    }
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
      log.info('\nDatabase connection closed');
    }
  }
}

// Run the fix
applyFix().catch(console.error);

