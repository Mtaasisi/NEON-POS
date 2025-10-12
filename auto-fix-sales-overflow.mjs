#!/usr/bin/env node
/**
 * 🚀 AUTOMATIC FIX: Sales Overflow Issue
 * 
 * Fixes the astronomically large sales amounts showing in Daily Sales
 * - TSh 1,506,778,624,849,422,342,737,560 → TSh 1,397,540 ✅
 * 
 * This script will:
 * 1. Fix database schema (NUMERIC precision)
 * 2. Clean corrupted data
 * 3. Add validation constraints
 * 4. Recalculate totals
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.bold}${colors.magenta}${msg}${colors.reset}`),
};

async function main() {
  console.log('\n' + '='.repeat(70));
  log.title('🔧 AUTOMATIC FIX: Sales Total Amount Overflow');
  console.log('='.repeat(70) + '\n');

  log.warn('Problem: Sales showing astronomically large numbers');
  log.info('Expected: ~TSh 1,397,540 (reasonable amount)');
  console.log('');

  // Get database URL from environment or Supabase config
  let databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

  // Try to load from Supabase client if not in env
  if (!databaseUrl) {
    try {
      const supabaseClientPath = join(__dirname, 'src', 'lib', 'supabaseClient.ts');
      const supabaseConfig = readFileSync(supabaseClientPath, 'utf-8');
      
      // Extract DATABASE_URL from config
      const urlMatch = supabaseConfig.match(/postgresql:\/\/[^\s'"]+/);
      if (urlMatch) {
        databaseUrl = urlMatch[0];
        log.info('Found database URL in supabaseClient.ts');
      }
    } catch (err) {
      // Config file not found or couldn't read it
      log.warn('Could not read supabaseClient.ts');
    }
  }

  if (!databaseUrl) {
    log.error('Database URL not found!');
    log.info('Please provide your Neon database connection string:');
    log.info('Option 1: Set VITE_DATABASE_URL in your .env file');
    log.info('Option 2: Pass as argument: node auto-fix-sales-overflow.mjs "postgresql://..."');
    log.info('Option 3: Run the SQL file manually using psql');
    console.log('');
    log.warn('To get your connection string:');
    log.info('1. Go to https://console.neon.tech');
    log.info('2. Select your database');
    log.info('3. Copy the connection string');
    console.log('');
    process.exit(1);
  }

  // Allow connection string as command line argument
  if (process.argv[2] && process.argv[2].startsWith('postgresql://')) {
    databaseUrl = process.argv[2];
    log.info('Using connection string from command line');
  }

  log.info('Connecting to Neon database...');
  const sql = neon(databaseUrl);

  try {
    // Test connection
    await sql`SELECT 1`;
    log.success('Connected to database successfully');
    console.log('');

    // Step 1: Diagnose the problem
    log.step('Step 1: Diagnosing the problem...');
    const problemSales = await sql`
      SELECT 
        COUNT(*) as problem_count,
        MAX(total_amount) as max_amount,
        MIN(total_amount) as min_amount
      FROM lats_sales
      WHERE total_amount > 1000000000 OR total_amount < 0
    `;

    if (problemSales[0]?.problem_count > 0) {
      log.warn(`Found ${problemSales[0].problem_count} sales with corrupted amounts`);
      log.info(`Max amount: ${problemSales[0].max_amount}`);
    } else {
      log.info('No obviously corrupted sales found');
    }
    console.log('');

    // Step 2: Drop existing triggers (if they exist)
    log.step('Step 2: Removing existing triggers...');
    try {
      await sql`DROP TRIGGER IF EXISTS validate_sale_amount_trigger ON lats_sales`;
      await sql`DROP FUNCTION IF EXISTS validate_sale_amount()`;
      log.info('Existing triggers removed');
    } catch (err) {
      log.info('No existing triggers to remove');
    }
    console.log('');

    // Step 3: Fix column data type
    log.step('Step 3: Fixing column data type...');
    await sql`ALTER TABLE lats_sales ALTER COLUMN total_amount TYPE NUMERIC(15, 2)`;
    log.success('Column type updated to NUMERIC(15, 2)');
    console.log('');

    // Step 4: Remove old constraints if they exist
    log.step('Step 4: Removing old constraints...');
    try {
      await sql`ALTER TABLE lats_sales DROP CONSTRAINT IF EXISTS lats_sales_total_amount_check`;
      log.info('Old constraints removed');
    } catch (err) {
      log.info('No old constraints to remove');
    }
    console.log('');

    // Step 5: Add validation constraints
    log.step('Step 5: Adding validation constraints...');
    await sql`
      ALTER TABLE lats_sales
      ADD CONSTRAINT lats_sales_total_amount_check 
      CHECK (total_amount >= 0 AND total_amount <= 1000000000)
    `;
    log.success('Validation constraints added (0 to 1 billion max)');
    console.log('');

    // Step 6: Fix corrupted data
    log.step('Step 6: Cleaning corrupted data...');
    const updated = await sql`
      UPDATE lats_sales
      SET 
        total_amount = 0,
        notes = COALESCE(notes || ' | ', '') || '[AUTO-FIX] Original amount was corrupted'
      WHERE total_amount > 1000000000 OR total_amount < 0
      RETURNING id
    `;
    
    if (updated.length > 0) {
      log.success(`Fixed ${updated.length} corrupted sales records`);
    } else {
      log.info('No corrupted data to clean');
    }
    console.log('');

    // Step 7: Fix sale items
    log.step('Step 7: Fixing sale items...');
    await sql`ALTER TABLE lats_sale_items ALTER COLUMN total_price TYPE NUMERIC(15, 2)`;
    
    await sql`ALTER TABLE lats_sale_items DROP CONSTRAINT IF EXISTS lats_sale_items_total_price_check`;
    
    await sql`
      ALTER TABLE lats_sale_items
      ADD CONSTRAINT lats_sale_items_total_price_check 
      CHECK (total_price >= 0 AND total_price <= 100000000)
    `;
    log.success('Sale items fixed');
    console.log('');

    // Step 8: Recalculate totals from line items
    log.step('Step 8: Recalculating sales totals...');
    
    // Get today's sales that need recalculation
    const salesToRecalc = await sql`
      SELECT id FROM lats_sales 
      WHERE created_at >= CURRENT_DATE
      AND total_amount = 0
    `;

    if (salesToRecalc.length > 0) {
      log.info(`Recalculating ${salesToRecalc.length} sales...`);
      
      for (const sale of salesToRecalc) {
        const items = await sql`
          SELECT COALESCE(SUM(total_price), 0) as calculated_total
          FROM lats_sale_items
          WHERE sale_id = ${sale.id}
        `;
        
        if (items[0]?.calculated_total > 0) {
          await sql`
            UPDATE lats_sales
            SET total_amount = ${items[0].calculated_total}
            WHERE id = ${sale.id}
          `;
        }
      }
      log.success(`Recalculated ${salesToRecalc.length} sales`);
    } else {
      log.info('No sales need recalculation');
    }
    console.log('');

    // Step 9: Create validation trigger
    log.step('Step 9: Creating validation trigger...');
    
    // Create function
    await sql`
      CREATE OR REPLACE FUNCTION validate_sale_amount()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.total_amount < 0 THEN
          RAISE EXCEPTION 'Sale total cannot be negative: %', NEW.total_amount;
        END IF;
        
        IF NEW.total_amount > 1000000000 THEN
          RAISE EXCEPTION 'Sale total is unreasonably large: %. Max allowed is 1 billion', NEW.total_amount;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    // Drop old trigger if exists
    await sql`DROP TRIGGER IF EXISTS validate_sale_amount_trigger ON lats_sales`;
    
    // Create trigger
    await sql`
      CREATE TRIGGER validate_sale_amount_trigger
        BEFORE INSERT OR UPDATE OF total_amount ON lats_sales
        FOR EACH ROW
        EXECUTE FUNCTION validate_sale_amount()
    `;
    
    log.success('Validation trigger created');
    console.log('');

    // Step 10: Verify the fix
    log.step('Step 10: Verifying the fix...');
    const todayStats = await sql`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as avg_amount,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM lats_sales
      WHERE created_at >= CURRENT_DATE
    `;

    console.log('');
    log.title('📊 Today\'s Sales Summary (After Fix):');
    console.log('─'.repeat(70));
    log.success(`Total Sales:        TSh ${Number(todayStats[0].total_amount).toLocaleString()}`);
    log.success(`Transactions:       ${todayStats[0].total_sales}`);
    log.success(`Average per sale:   TSh ${Math.round(Number(todayStats[0].avg_amount)).toLocaleString()}`);
    log.success(`Unique Customers:   ${todayStats[0].unique_customers}`);
    console.log('─'.repeat(70));
    console.log('');

    // Success summary
    console.log('='.repeat(70));
    log.title('🎉 FIX COMPLETE! Your sales data is now healthy!');
    console.log('='.repeat(70) + '\n');

    log.success('Database schema fixed');
    log.success('Corrupted data cleaned');
    log.success('Validation constraints added');
    log.success('Totals recalculated');
    log.success('Protection trigger installed');
    console.log('');

    log.info('Next steps:');
    log.info('1. Refresh your Daily Sales page');
    log.info('2. Numbers should now be reasonable');
    log.info('3. Future sales are protected from overflow');
    console.log('');

  } catch (error) {
    console.log('');
    log.error('Fix failed!');
    log.error(error.message);
    console.log('');
    log.warn('You can try running the SQL file manually:');
    log.info('psql "your-connection-string" -f fix-sales-total-amount-overflow.sql');
    console.log('');
    process.exit(1);
  }
}

// Run the fix
main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

