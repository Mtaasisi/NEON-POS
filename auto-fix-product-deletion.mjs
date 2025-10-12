#!/usr/bin/env node

/**
 * AUTO-FIX: Product Deletion Issues
 * 
 * This script automatically fixes foreign key constraints that prevent product deletion
 * 
 * Usage:
 *   node auto-fix-product-deletion.mjs
 * 
 * Or make it executable:
 *   chmod +x auto-fix-product-deletion.mjs
 *   ./auto-fix-product-deletion.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loadDatabaseConnection() {
  // Try to load connection string from environment
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  
  if (!connectionString) {
    log('❌ Error: No database connection string found!', 'red');
    log('', 'reset');
    log('Please set one of these environment variables:', 'yellow');
    log('  - DATABASE_URL', 'cyan');
    log('  - NEON_DATABASE_URL', 'cyan');
    log('', 'reset');
    log('Example:', 'yellow');
    log('  export DATABASE_URL="postgresql://user:password@host/database"', 'cyan');
    log('  node auto-fix-product-deletion.mjs', 'cyan');
    log('', 'reset');
    process.exit(1);
  }
  
  return connectionString;
}

async function executeFix(connectionString) {
  log('', 'reset');
  log('🔧 AUTO-FIX: Product Deletion Issues', 'cyan');
  log('=' .repeat(50), 'cyan');
  log('', 'reset');
  
  try {
    // Import postgres client
    let pg;
    try {
      pg = await import('pg');
    } catch (error) {
      log('❌ Error: pg module not found', 'red');
      log('', 'reset');
      log('Installing pg module...', 'yellow');
      
      const { execSync } = await import('child_process');
      execSync('npm install pg', { stdio: 'inherit' });
      
      pg = await import('pg');
      log('✅ pg module installed successfully', 'green');
      log('', 'reset');
    }
    
    const { Client } = pg.default || pg;
    const client = new Client({ connectionString });
    
    log('📡 Connecting to database...', 'blue');
    await client.connect();
    log('✅ Connected successfully', 'green');
    log('', 'reset');
    
    // Read the fix SQL file
    const fixSqlPath = join(__dirname, 'fix-product-deletion.sql');
    const fixSql = readFileSync(fixSqlPath, 'utf8');
    
    log('🔄 Applying fixes...', 'blue');
    log('', 'reset');
    
    // Execute the fix
    const result = await client.query(fixSql);
    
    log('✅ Fix applied successfully!', 'green');
    log('', 'reset');
    
    // Verify the fix by checking constraints
    log('🔍 Verifying foreign key constraints...', 'blue');
    const verifyQuery = `
      SELECT 
        tc.table_name AS "Table",
        kcu.column_name AS "Column",
        rc.delete_rule AS "Delete Rule"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'product_id'
        AND EXISTS (
          SELECT 1 
          FROM information_schema.constraint_column_usage ccu 
          WHERE ccu.constraint_name = tc.constraint_name 
          AND ccu.table_name = 'lats_products'
        )
      ORDER BY tc.table_name;
    `;
    
    const constraints = await client.query(verifyQuery);
    
    if (constraints.rows.length > 0) {
      log('', 'reset');
      log('📋 Current Product Foreign Key Constraints:', 'cyan');
      log('', 'reset');
      
      constraints.rows.forEach(row => {
        const emoji = row.Delete_Rule === 'SET NULL' || row.Delete_Rule === 'CASCADE' ? '✅' : '⚠️';
        log(`${emoji} ${row.Table.padEnd(35)} | ${row.Column.padEnd(15)} | ${row.Delete_Rule}`, 'reset');
      });
    }
    
    await client.end();
    
    log('', 'reset');
    log('✅ ============================================', 'green');
    log('✅ Product deletion fix completed successfully!', 'green');
    log('✅ ============================================', 'green');
    log('', 'reset');
    log('💡 What changed:', 'yellow');
    log('  • Products can now be deleted', 'reset');
    log('  • Historical records are preserved', 'reset');
    log('  • Product references in history become NULL', 'reset');
    log('  • Reports continue to work', 'reset');
    log('', 'reset');
    log('🧪 Test it:', 'yellow');
    log('  1. Open your POS application', 'reset');
    log('  2. Go to Products/Inventory', 'reset');
    log('  3. Select a product and delete it', 'reset');
    log('  4. Deletion should work now! 🎉', 'reset');
    log('', 'reset');
    
  } catch (error) {
    log('', 'reset');
    log('❌ Error occurred:', 'red');
    log(error.message, 'red');
    log('', 'reset');
    
    if (error.message.includes('authentication failed')) {
      log('💡 Tip: Check your database credentials', 'yellow');
    } else if (error.message.includes('does not exist')) {
      log('💡 Tip: Make sure the table exists in your database', 'yellow');
    } else if (error.message.includes('permission denied')) {
      log('💡 Tip: You need ALTER TABLE privileges', 'yellow');
    }
    
    log('', 'reset');
    log('📖 For manual fix, run fix-product-deletion.sql in Neon SQL Editor', 'cyan');
    log('', 'reset');
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    const connectionString = await loadDatabaseConnection();
    await executeFix(connectionString);
  } catch (error) {
    log(`❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  }
})();

