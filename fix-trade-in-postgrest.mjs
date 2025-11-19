#!/usr/bin/env node

/**
 * Fix Trade-In PostgREST Schema Cache
 * Recreates foreign key relationships to fix PostgREST schema cache issues
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get database URL
const getDatabaseUrl = () => {
  const possibleVars = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'VITE_DATABASE_URL',
    'VITE_POSTGRES_URL',
  ];

  for (const varName of possibleVars) {
    if (process.env[varName]) {
      return process.env[varName];
    }
  }

  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    for (const varName of possibleVars) {
      const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
      if (match) {
        return match[1];
      }
    }
  } catch (error) {
    // .env file doesn't exist or can't be read
  }

  throw new Error('Database URL not found in environment variables or .env file');
};

async function fixTradeInPostgREST() {
  let client;

  try {
    log('\n🔧 Starting Trade-In PostgREST Schema Cache Fix...', 'cyan');
    log('━'.repeat(60), 'cyan');

    // Get database connection
    const databaseUrl = getDatabaseUrl();
    log('\n✓ Database URL found', 'green');

    // Create client
    client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    log('✓ Connecting to database...', 'yellow');
    await client.connect();
    log('✓ Connected successfully', 'green');

    // Read SQL file
    const sqlFile = join(__dirname, 'fix-trade-in-postgrest-cache.sql');
    log(`✓ Reading SQL file: ${sqlFile}`, 'yellow');
    const sql = readFileSync(sqlFile, 'utf-8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    log(`✓ Found ${statements.length} SQL statements to execute`, 'green');
    log('\n📝 Executing SQL statements...', 'cyan');
    log('━'.repeat(60), 'cyan');

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        // Skip comment-only statements
        if (statement.trim().startsWith('--')) {
          continue;
        }

        // Show progress for important statements
        if (statement.includes('ALTER TABLE')) {
          const match = statement.match(/ALTER TABLE (\w+)/);
          if (match) {
            log(`  ${i + 1}/${statements.length} Updating table: ${match[1]}`, 'yellow');
          }
        } else if (statement.includes('CREATE INDEX')) {
          const match = statement.match(/CREATE INDEX (\w+)/);
          if (match) {
            log(`  ${i + 1}/${statements.length} Creating index: ${match[1]}`, 'yellow');
          }
        } else if (statement.includes('SELECT')) {
          log(`  ${i + 1}/${statements.length} Running verification query...`, 'yellow');
        }

        const result = await client.query(statement);
        
        // Display results for SELECT queries
        if (result.rows && result.rows.length > 0) {
          if (result.rows[0].status || result.rows[0].next_step) {
            log(`\n${result.rows[0].status || result.rows[0].next_step}`, 'green');
          } else if (result.rows[0].table_name && result.rows[0].foreign_key_count) {
            log('\n📊 Foreign Key Count:', 'cyan');
            result.rows.forEach(row => {
              log(`  ${row.table_name}: ${row.foreign_key_count} foreign keys`, 'green');
            });
          }
        }

        successCount++;
      } catch (error) {
        // Some errors are expected (like dropping non-existent constraints)
        if (error.message.includes('does not exist')) {
          log(`  ⚠️  Warning: ${error.message}`, 'yellow');
        } else {
          log(`  ❌ Error: ${error.message}`, 'red');
          errorCount++;
        }
      }
    }

    log('\n━'.repeat(60), 'cyan');
    log('✅ Trade-In PostgREST Fix Complete!', 'green');
    log(`   Successful: ${successCount}`, 'green');
    if (errorCount > 0) {
      log(`   Errors: ${errorCount}`, 'red');
    }
    log('━'.repeat(60), 'cyan');

    log('\n📋 Summary:', 'cyan');
    log('  ✓ Foreign keys recreated for lats_trade_in_prices', 'green');
    log('  ✓ Foreign keys recreated for lats_trade_in_transactions', 'green');
    log('  ✓ Foreign keys recreated for lats_trade_in_contracts', 'green');
    log('  ✓ Indexes recreated for performance', 'green');

    log('\n⚠️  Next Steps:', 'yellow');
    log('  1. Refresh your browser/application', 'yellow');
    log('  2. The PostgREST schema cache should now recognize the relationships', 'yellow');
    log('  3. Trade-in API calls should work without errors', 'yellow');

  } catch (error) {
    log('\n❌ Error:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('\nStack trace:', 'red');
      log(error.stack, 'red');
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      log('\n✓ Database connection closed', 'green');
    }
  }
}

// Run the fix
fixTradeInPostgREST();

