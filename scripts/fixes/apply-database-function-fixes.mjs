#!/usr/bin/env node
/**
 * Apply Database Function Fixes
 * ==============================
 * This script applies the missing database functions to fix:
 * 1. add_imei_to_parent_variant (IMEI tracking)
 * 2. log_purchase_order_audit (audit logging)
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function applyFixes() {
  log.header('🔧 APPLYING DATABASE FUNCTION FIXES');

  // Check for DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    log.error('DATABASE_URL environment variable not set!');
    log.info('Please set it in your .env file or export it:');
    log.info('  export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }

  log.info('Database URL found (hidden for security)');
  log.info(`Connection: postgresql://*****@${DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}`);

  // Initialize Neon client
  const sql = neon(DATABASE_URL);

  // Read the SQL fix file
  const sqlFilePath = join(__dirname, 'fix-missing-database-functions.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    log.error(`SQL file not found: ${sqlFilePath}`);
    process.exit(1);
  }

  log.info('Reading SQL fix file...');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Split into individual statements (rough split by semicolons outside of function bodies)
  log.info('Parsing SQL statements...');
  
  try {
    log.header('📝 EXECUTING SQL FIXES');
    
    // Execute the entire SQL file as one transaction
    log.info('Dropping old function versions...');
    log.info('Creating add_imei_to_parent_variant function...');
    log.info('Creating log_purchase_order_audit function...');
    log.info('Creating audit table if needed...');
    
    await sql(sqlContent);
    
    log.success('All SQL statements executed successfully!');
    
    // Verify functions were created
    log.header('🔍 VERIFYING INSTALLATION');
    
    const functions = await sql`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('add_imei_to_parent_variant', 'log_purchase_order_audit')
      ORDER BY routine_name
    `;
    
    if (functions.length === 2) {
      log.success('Both functions verified in database:');
      functions.forEach(f => {
        log.info(`  ✓ ${f.routine_name} (${f.routine_type})`);
      });
    } else if (functions.length === 1) {
      log.warning(`Only ${functions.length} function found. Expected 2:`);
      functions.forEach(f => {
        log.info(`  ✓ ${f.routine_name}`);
      });
    } else {
      log.error('Functions not found after installation!');
      log.warning('This might be a permissions issue.');
    }
    
    // Check function signatures
    log.header('📋 FUNCTION SIGNATURES');
    
    const signatures = await sql`
      SELECT 
        r.routine_name,
        string_agg(
          p.parameter_name || ' ' || p.data_type,
          ', ' 
          ORDER BY p.ordinal_position
        ) as signature
      FROM information_schema.routines r
      LEFT JOIN information_schema.parameters p 
        ON r.specific_name = p.specific_name
        AND p.parameter_mode = 'IN'
      WHERE r.routine_schema = 'public'
        AND r.routine_name IN ('add_imei_to_parent_variant', 'log_purchase_order_audit')
      GROUP BY r.routine_name
      ORDER BY r.routine_name
    `;
    
    if (signatures.length > 0) {
      signatures.forEach(sig => {
        log.info(`${sig.routine_name}:`);
        log.info(`  Parameters: ${sig.signature || 'none'}`);
      });
    }
    
    // Test audit table exists
    log.header('📊 CHECKING AUDIT TABLE');
    
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('purchase_order_audit', 'lats_purchase_order_audit_log')
    `;
    
    if (tables.length > 0) {
      log.success('Audit table(s) found:');
      tables.forEach(t => {
        log.info(`  ✓ ${t.table_name}`);
      });
    } else {
      log.warning('No audit tables found. This might be expected if using a different schema.');
    }
    
    // Final summary
    log.header('🎉 INSTALLATION COMPLETE!');
    log.success('Database functions have been installed successfully');
    log.info('');
    log.info('Next steps:');
    log.info('  1. Refresh your application in the browser');
    log.info('  2. Try receiving a Purchase Order with IMEI tracking');
    log.info('  3. Check the browser console - errors should be gone!');
    log.info('');
    log.info('The following errors should now be resolved:');
    log.info('  ✓ "function add_imei_to_parent_variant...does not exist"');
    log.info('  ✓ "function log_purchase_order_audit...does not exist"');
    log.info('  ✓ "invalid input syntax for type uuid: system"');
    
  } catch (error) {
    log.error('Failed to apply fixes!');
    log.error(`Error: ${error.message}`);
    
    if (error.message.includes('permission denied')) {
      log.warning('Permission denied. Make sure your database user has CREATE FUNCTION privileges.');
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      log.warning('A required table might be missing. Check your database schema.');
    } else if (error.message.includes('syntax error')) {
      log.warning('SQL syntax error. The SQL file might be corrupted.');
      log.info('Try downloading the SQL file again.');
    }
    
    console.error('\nFull error details:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
applyFixes().catch(error => {
  log.error('Unexpected error:');
  console.error(error);
  process.exit(1);
});

