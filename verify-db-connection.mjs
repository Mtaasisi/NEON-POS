#!/usr/bin/env node
/**
 * Verify Database Connection
 * Checks if the application is using the correct database
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const expectedDbUrl = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const actualDbUrl = process.env.DATABASE_URL;

console.log('🔍 Verifying Database Connection...\n');

// Check if DATABASE_URL is set
if (!actualDbUrl) {
  console.error('❌ DATABASE_URL is not set in .env file');
  process.exit(1);
}

// Check if it matches expected URL
const expectedHost = 'ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech';
const actualHost = actualDbUrl.match(/@([^/]+)/)?.[1];

console.log('📋 Configuration Check:');
console.log(`   Expected Host: ${expectedHost}`);
console.log(`   Actual Host:   ${actualHost || 'NOT FOUND'}`);
console.log(`   Match: ${actualHost === expectedHost ? '✅' : '❌'}\n`);

if (actualHost !== expectedHost) {
  console.error('❌ Database URL does not match expected connection string!');
  console.error(`   Current: ${actualDbUrl.substring(0, 50)}...`);
  console.error(`   Expected: ${expectedDbUrl.substring(0, 50)}...`);
  process.exit(1);
}

// Test actual connection
console.log('🔌 Testing Database Connection...');
try {
  const sql = postgres(actualDbUrl, {
    max: 1,
    connect_timeout: 10,
    ssl: 'require',
  });

  // Test query
  const result = await sql`SELECT current_database() as db_name, version() as version`;
  console.log('✅ Database connection successful!');
  console.log(`   Database: ${result[0].db_name}`);
  console.log(`   PostgreSQL Version: ${result[0].version.substring(0, 50)}...\n`);

  // Get connection info
  const connInfo = await sql`SELECT inet_server_addr() as server_addr, inet_server_port() as server_port`;
  console.log('📊 Connection Details:');
  console.log(`   Server Address: ${connInfo[0].server_addr || 'N/A'}`);
  console.log(`   Server Port: ${connInfo[0].server_port || 'N/A'}\n`);

  await sql.end();
  console.log('✅ Database verification complete!');
  process.exit(0);
} catch (error) {
  console.error('❌ Database connection failed:');
  console.error(`   Error: ${error.message}`);
  process.exit(1);
}

