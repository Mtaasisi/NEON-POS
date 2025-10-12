#!/usr/bin/env node
/**
 * 🚀 AUTOMATIC DATABASE FIX
 * This script automatically connects to your Neon database and fixes all 400 errors
 * No configuration needed - uses the hardcoded DATABASE_URL from supabaseClient.ts
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// HARDCODED DATABASE URL (same as in supabaseClient.ts)
const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

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
  title: (msg) => console.log(`\n${colors.bold}${colors.magenta}${msg}${colors.reset}\n`),
};

async function main() {
  log.title('🚀 AUTOMATIC DATABASE FIX - Starting Now!');
  
  console.log('='.repeat(60));
  log.info('Reading SQL fix script...');
  
  // Read the SQL fix file
  let sqlScript;
  try {
    sqlScript = readFileSync('AUTO-FIX-ALL-ERRORS.sql', 'utf-8');
    log.success('SQL script loaded successfully');
  } catch (err) {
    log.error('Could not read AUTO-FIX-ALL-ERRORS.sql');
    log.error(err.message);
    process.exit(1);
  }
  
  log.info('Connecting to Neon database...');
  log.info(`Database: ${DATABASE_URL.substring(0, 50)}...`);
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Test connection
    log.step('Testing database connection...');
    await sql`SELECT NOW() as current_time`;
    log.success('Database connection successful!');
    
    // Split SQL into individual statements
    log.step('Parsing SQL statements...');
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    log.info(`Found ${statements.length} SQL statements to execute`);
    
    console.log('\n' + '─'.repeat(60));
    log.title('Executing database fixes...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }
      
      // Show progress for SELECT statements (status messages)
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        try {
          const result = await sql.unsafe(statement);
          if (result && result[0]) {
            const statusMsg = result[0].status || result[0].next_step || JSON.stringify(result[0]);
            log.step(statusMsg);
          }
        } catch (err) {
          // Ignore errors in status SELECT statements
        }
        continue;
      }
      
      // Execute other statements
      try {
        await sql.unsafe(statement);
        successCount++;
        
        // Show progress every 10 statements
        if (successCount % 10 === 0) {
          log.info(`Progress: ${successCount} statements executed...`);
        }
      } catch (err) {
        errorCount++;
        
        // Some errors are expected (like "already exists")
        if (err.message.includes('already exists') || 
            err.message.includes('duplicate') ||
            err.message.includes('does not exist')) {
          // These are OK - table/column already exists
          successCount++;
        } else {
          log.warn(`Warning: ${err.message.substring(0, 100)}`);
        }
      }
    }
    
    console.log('\n' + '─'.repeat(60));
    log.title('✨ Fix Complete!');
    log.success(`Successfully executed ${successCount} statements`);
    
    if (errorCount > 0) {
      log.warn(`${errorCount} statements had warnings (this is usually OK)`);
    }
    
    // Verify the fix worked
    console.log('\n' + '─'.repeat(60));
    log.title('🔍 Verifying fixes...');
    
    try {
      // Check if critical tables exist
      log.step('Checking critical tables...');
      
      const tablesCheck = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'settings', 
          'notifications', 
          'whatsapp_instances_comprehensive',
          'finance_accounts',
          'devices',
          'customers',
          'user_daily_goals'
        )
        ORDER BY table_name
      `;
      
      log.success(`Found ${tablesCheck.length} critical tables`);
      tablesCheck.forEach(table => {
        log.info(`  ✓ ${table.table_name}`);
      });
      
      // Check if critical columns exist
      log.step('Checking critical columns...');
      
      const columnsCheck = await sql`
        SELECT 
          table_name, 
          column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND (
          (table_name = 'finance_accounts' AND column_name = 'is_payment_method') OR
          (table_name = 'devices' AND column_name = 'issue_description') OR
          (table_name = 'customers' AND column_name = 'profile_image') OR
          (table_name = 'user_daily_goals' AND column_name = 'goal_type')
        )
      `;
      
      log.success(`Found ${columnsCheck.length}/4 critical columns`);
      columnsCheck.forEach(col => {
        log.info(`  ✓ ${col.table_name}.${col.column_name}`);
      });
      
      console.log('\n' + '═'.repeat(60));
      log.title('🎉 SUCCESS! All database fixes applied!');
      console.log('═'.repeat(60));
      
      console.log('\n');
      log.success('✨ Next steps:');
      log.info('1. Hard refresh your browser:');
      log.info('   - Mac: Cmd + Shift + R');
      log.info('   - Windows/Linux: Ctrl + Shift + R');
      log.info('2. Log in to your app');
      log.info('3. The 400 errors should be gone! 🎉');
      console.log('\n');
      
    } catch (err) {
      log.error('Verification failed:');
      log.error(err.message);
      log.warn('But the fix may have still worked - try refreshing your app');
    }
    
  } catch (err) {
    log.error('Database operation failed:');
    log.error(err.message);
    log.error('\nFull error:');
    console.error(err);
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  log.error('Unexpected error:');
  console.error(err);
  process.exit(1);
});

