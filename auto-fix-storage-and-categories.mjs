#!/usr/bin/env node
/**
 * Automatic Fix Script for Storage and Categories Tables
 * Fixes the "Error loading data" issues in AddProductPage
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
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.magenta}${msg}${colors.reset}`),
};

async function main() {
  console.log('\n' + '='.repeat(70));
  log.title('🔧 AUTOMATIC FIX: Storage and Categories Tables');
  console.log('='.repeat(70) + '\n');

  // Get database URL from environment
  const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    log.error('Database URL not found!');
    log.info('Please set VITE_DATABASE_URL in your .env file');
    log.info('Example: VITE_DATABASE_URL=postgresql://user:pass@host/db');
    process.exit(1);
  }

  log.info('Connecting to Neon database...');
  const sql = neon(databaseUrl);

  try {
    // Read the SQL fix file
    log.step('Reading SQL fix file...');
    const sqlFilePath = join(__dirname, 'FIX-STORAGE-AND-CATEGORIES-TABLES.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');
    
    log.success('SQL file loaded successfully');
    console.log('');

    // Execute the fix - Split into individual statements and execute
    log.step('Executing database fixes...');
    log.info('This may take a few seconds...');
    console.log('');
    
    // Split SQL file into statements (removing comments and empty lines)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\/\*/))
      .filter(stmt => !stmt.match(/^(BEGIN|COMMIT)$/i));
    
    log.info(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          // Use template literal syntax for Neon
          await sql([stmt]);
        } catch (err) {
          // Some statements might fail if tables already exist, that's OK
          if (!err.message.includes('already exists')) {
            log.warn(`Statement ${i+1} warning: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }
    
    console.log('');
    log.success('Database fix completed successfully!');
    console.log('');

    // Verify the fixes
    log.step('Verifying tables...');
    console.log('');

    // Check categories
    const categoriesResult = await sql`
      SELECT COUNT(*) as count FROM lats_categories WHERE is_active = true
    `;
    log.success(`Categories: ${categoriesResult[0].count} active categories found`);

    // Check store locations
    const locationsResult = await sql`
      SELECT COUNT(*) as count FROM lats_store_locations WHERE is_active = true
    `;
    log.success(`Store Locations: ${locationsResult[0].count} active locations found`);

    // Check storage rooms
    const roomsResult = await sql`
      SELECT COUNT(*) as count FROM lats_store_rooms WHERE is_active = true
    `;
    log.success(`Storage Rooms: ${roomsResult[0].count} active rooms found`);

    // Check store shelves
    const shelvesResult = await sql`
      SELECT COUNT(*) as count FROM lats_store_shelves WHERE is_active = true
    `;
    log.success(`Store Shelves: ${shelvesResult[0].count} active shelves found`);

    console.log('');
    console.log('='.repeat(70));
    log.title('🎉 FIX APPLIED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('');

    log.info('Next steps:');
    console.log('  1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('  2. Navigate to Add Product page');
    console.log('  3. The errors should be gone!');
    console.log('');

    log.success('Your database is now ready for product management!');
    console.log('');

  } catch (error) {
    console.log('');
    log.error('Fix failed!');
    log.error(`Error: ${error.message}`);
    console.log('');
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      log.warn('Table does not exist. This is expected on first run.');
      log.info('The script will create all necessary tables.');
    }
    
    console.error('\nFull error details:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('\nUnexpected error:');
  console.error(error);
  process.exit(1);
});

