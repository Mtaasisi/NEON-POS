#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const PROD_DB_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function parseConnectionString(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
  };
}

async function applySchemaDiff(sqlFile) {
  const client = new Client(parseConnectionString(PROD_DB_URL));
  
  try {
    console.log('Connecting to production database...');
    await client.connect();
    console.log('✓ Connected\n');
    
    console.log(`Reading SQL file: ${sqlFile}`);
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Applying schema changes...');
    console.log('⚠️  This will modify your production database!');
    console.log('Press Ctrl+C within 5 seconds to cancel...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim().length === 0) continue;
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing statement...`);
        await client.query(stmt);
        console.log(`  ✓ Success\n`);
      } catch (error) {
        // Some errors are expected (e.g., IF NOT EXISTS)
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate')) {
          console.log(`  ⚠️  Skipped (expected): ${error.message.split('\n')[0]}\n`);
        } else {
          console.error(`  ✗ Error: ${error.message}\n`);
          throw error;
        }
      }
    }
    
    console.log('✓ Schema sync completed successfully!');
    
  } catch (error) {
    console.error('Error applying schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

const sqlFile = process.argv[2] || 'sync-schema-2025-11-26T17-56-42-147Z.sql';

if (!fs.existsSync(sqlFile)) {
  console.error(`Error: SQL file not found: ${sqlFile}`);
  console.log('\nUsage: node apply-schema-diff.mjs [sql-file]');
  process.exit(1);
}

applySchemaDiff(sqlFile);

