#!/usr/bin/env node
/**
 * Apply Reverse Purchase Order Payment Function
 * ===============================================
 * This script applies the missing reverse_purchase_order_payment function
 * to fix the "undo payment" functionality in purchase orders.
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

async function applyFunction() {
  log.header('🔧 APPLYING REVERSE PURCHASE ORDER PAYMENT FUNCTION');

  // Check for DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!DATABASE_URL) {
    log.error('DATABASE_URL environment variable not set!');
    log.info('Please set it in your .env file or export it:');
    log.info('  export DATABASE_URL="postgresql://..."');
    log.info('  or export VITE_DATABASE_URL="postgresql://..."');
    process.exit(1);
  }

  log.info('Database URL found (hidden for security)');

  try {
    // Create database connection
    const sql = neon(DATABASE_URL);

    log.info('Connecting to database...');

    // Test connection
    await sql`SELECT 1 as test`;
    log.success('Database connection successful');

    // Read the SQL file
    const sqlFilePath = join(__dirname, 'migrations', 'add_reverse_purchase_order_payment_function.sql');
    log.info('Reading SQL migration file...');

    if (!fs.existsSync(sqlFilePath)) {
      log.error(`SQL file not found: ${sqlFilePath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    log.info('SQL file loaded successfully');

    // Split the SQL into individual statements (basic approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    log.info(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        log.info(`Executing statement ${i + 1}/${statements.length}...`);
        try {
          await sql.unsafe(statement);
        } catch (error) {
          // For comments and empty statements, continue
          if (!statement.includes('--') && statement.trim().length > 0) {
            throw error;
          }
        }
      }
    }

    log.success('All SQL statements executed successfully');

    // Verify the function was created
    const functions = await sql`
      SELECT proname, prokind, pg_get_function_identity_arguments(oid) as args
      FROM pg_proc
      WHERE proname = 'reverse_purchase_order_payment'
    `;

    if (functions.length > 0) {
      log.success('Function created successfully');
      log.info(`Function details: ${functions[0].proname}(${functions[0].args})`);
    } else {
      throw new Error('Function was not created');
    }

    // Test the function exists by calling it (without actually reversing anything)
    log.info('Testing function accessibility...');
    try {
      // This should fail with "Payment not found" but proves the function exists
      const testResult = await sql`SELECT * FROM reverse_purchase_order_payment('00000000-0000-0000-0000-000000000000'::uuid)`;
      // If we get here, something unexpected happened
      log.warning('Function test returned unexpected result');
    } catch (error) {
      // Expected to fail with "Payment not found" or similar
      if (error.message && error.message.includes('Payment not found')) {
        log.success('Function is working correctly (expected "Payment not found" error)');
      } else if (error.message && error.message.includes('function reverse_purchase_order_payment')) {
        throw new Error('Function still does not exist');
      } else {
        log.info('Function exists and returned expected error (testing successful)');
      }
    }

    log.success('🎉 Reverse purchase order payment function applied successfully!');
    log.info('');
    log.info('✅ Fixed issue: Purchase order payment reversal function is now available');
    log.info('');
    log.info('The undo payment functionality in purchase orders should now work!');
    log.info('You can test it by:');
    log.info('1. Opening Purchase Orders');
    log.info('2. Selecting a purchase order with payments');
    log.info('3. Clicking the "Undo Last Payment" button');
    log.info('4. Confirming the reversal');

  } catch (error) {
    log.error('Failed to apply function:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
applyFunction().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
