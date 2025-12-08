#!/usr/bin/env node

/**
 * Quick test script to verify Supabase connection
 */

import pg from 'pg';
const { Client } = pg;

// URL encode the password to handle special characters like @
const password = encodeURIComponent('@SMASIKA1010');
const SUPABASE_URL = `postgresql://postgres.jxhzveborezjhsmzsgbc:${password}@aws-0-eu-north-1.pooler.supabase.com:5432/postgres`;

console.log('\n🔍 Testing Supabase Connection...\n');

const client = new Client({
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('✅ Connection successful!\n');
  
  const result = await client.query('SELECT version() as version, current_database() as database, current_user as user');
  
  console.log('Database Info:');
  console.log(`  Database: ${result.rows[0].database}`);
  console.log(`  User: ${result.rows[0].user}`);
  console.log(`  PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);
  
  // Check existing tables
  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  console.log(`📊 Found ${tablesResult.rows.length} existing tables in Supabase`);
  if (tablesResult.rows.length > 0) {
    console.log('\n⚠️  Warning: Database already has tables!');
    console.log('   Migration will add new tables but may fail on existing ones.');
    console.log('\n   Existing tables:');
    tablesResult.rows.slice(0, 10).forEach(row => {
      console.log(`     - ${row.table_name}`);
    });
    if (tablesResult.rows.length > 10) {
      console.log(`     ... and ${tablesResult.rows.length - 10} more`);
    }
    console.log('');
  } else {
    console.log('✅ Database is empty - ready for migration!\n');
  }
  
  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  console.error('\nPlease check:');
  console.error('  1. Password is correct');
  console.error('  2. Database is accessible');
  console.error('  3. Network connection is working');
  console.error('  4. Supabase database is running\n');
  if (client) await client.end().catch(() => {});
  process.exit(1);
}

